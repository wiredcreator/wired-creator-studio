import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import BrandBrain from '@/models/BrandBrain';
import ToneOfVoiceGuide from '@/models/ToneOfVoiceGuide';
import YouTubeTranscriptCache from '@/models/YouTubeTranscriptCache';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { generateToneOfVoice } from '@/lib/ai/generate';
import { extractYouTubeTranscript } from '@/lib/apify';

interface ContentDNAPayload {
  name: string;
  background: string;
  neurodivergentProfile: string[];
  contentGoals: string;
  twelveWeekVision: string;
  idealViewer: string;
  problemsSolved: string;
  industry: string;
  keyTopics: string[];
  inspirations: { url: string; note: string }[];
  voiceSamples: string[];
  noExistingContent: boolean;
}

function validatePayload(data: ContentDNAPayload): string | null {
  if (!data.name?.trim()) {
    return 'Name is required.';
  }
  if (!data.contentGoals?.trim()) {
    return 'Content goals are required.';
  }
  if (!data.twelveWeekVision?.trim()) {
    return '12-week vision is required.';
  }
  if (!data.idealViewer?.trim()) {
    return 'Ideal viewer description is required.';
  }
  if (!data.problemsSolved?.trim()) {
    return 'Problems solved description is required.';
  }
  if (!data.industry?.trim()) {
    return 'Industry or niche is required.';
  }
  if (!Array.isArray(data.keyTopics) || data.keyTopics.length < 3) {
    return 'At least 3 key topics are required.';
  }
  if (
    !Array.isArray(data.inspirations) ||
    !data.inspirations.some((e) => e.url?.trim())
  ) {
    return 'At least one inspiration URL or channel name is required.';
  }
  if (
    !data.noExistingContent &&
    (!Array.isArray(data.voiceSamples) || !data.voiceSamples.some((s) => s?.trim()))
  ) {
    return 'At least one voice sample is required, or mark that you have no existing content.';
  }
  return null;
}

/**
 * Convert the flat form payload into the ContentDNAResponse schema format.
 */
function buildResponses(data: ContentDNAPayload) {
  return [
    { questionId: 'name', question: 'What is your name?', answer: data.name, answerType: 'text' as const },
    { questionId: 'background', question: 'Tell us about your background', answer: data.background, answerType: 'text' as const },
    { questionId: 'neurodivergentProfile', question: 'Neurodivergent profile', answer: data.neurodivergentProfile, answerType: 'multiselect' as const },
    { questionId: 'contentGoals', question: 'What are your content creation goals?', answer: data.contentGoals, answerType: 'text' as const },
    { questionId: 'twelveWeekVision', question: 'Where do you see yourself in 12 weeks?', answer: data.twelveWeekVision, answerType: 'text' as const },
    { questionId: 'idealViewer', question: 'Describe your ideal viewer', answer: data.idealViewer, answerType: 'text' as const },
    { questionId: 'problemsSolved', question: 'What problems do you solve for your audience?', answer: data.problemsSolved, answerType: 'text' as const },
    { questionId: 'industry', question: 'What is your industry or niche?', answer: data.industry, answerType: 'text' as const },
    { questionId: 'keyTopics', question: 'What are your key content topics?', answer: data.keyTopics, answerType: 'multiselect' as const },
  ];
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;

    const body: ContentDNAPayload = await request.json();

    const validationError = validatePayload(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    // Clean up the data: filter out empty entries
    const cleanedInspirations = body.inspirations.filter((e) => e.url.trim());
    const cleanedVoiceSamples = body.noExistingContent
      ? []
      : body.voiceSamples.filter((s) => s.trim());
    const cleanedKeyTopics = body.keyTopics.filter((t) => t.trim());

    await dbConnect();

    // Build the responses array for the ContentDNAResponse model
    const responses = buildResponses({
      ...body,
      keyTopics: cleanedKeyTopics,
    });

    // Build creator examples from inspiration URLs
    const creatorExamples = cleanedInspirations.map((insp) => ({
      url: insp.url,
      platform: detectPlatform(insp.url),
      extractedTranscript: '',
    }));

    // Build content samples from voice samples
    const contentSamples = cleanedVoiceSamples.map((sample) => ({
      text: sample,
      type: 'written',
    }));

    // Upsert: update if the user already submitted, otherwise create
    const contentDNA = await ContentDNAResponse.findOneAndUpdate(
      { userId: user.id },
      {
        userId: user.id,
        responses,
        creatorExamples,
        contentSamples,
        completedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Create an initial BrandBrain document if one does not exist
    const existingBrandBrain = await BrandBrain.findOne({ userId: user.id });
    if (!existingBrandBrain) {
      await BrandBrain.create({
        userId: user.id,
        contentPillars: cleanedKeyTopics.map((topic) => ({
          title: topic,
          description: topic,
          keywords: [],
        })),
        industryData: {
          field: body.industry,
          keywords: cleanedKeyTopics,
          competitors: [],
        },
        equipmentProfile: {},
      });
    }

    // --- Link Content DNA to Brand Brain ---
    try {
      await BrandBrain.findOneAndUpdate(
        { userId: user.id },
        { $set: { contentDNAResponse: contentDNA._id } }
      );
    } catch (bbError) {
      console.error('[Onboarding] Brand Brain Content DNA link failed (non-fatal):', bbError);
    }

    // Mark onboarding as completed for the user
    await User.findByIdAndUpdate(user.id, { onboardingCompleted: true });

    // --- Respond immediately — don't block on ToV generation or scraping ---
    const userId = user.id;
    const contentDNAId = contentDNA._id;

    // Fire off ToV generation in the background (non-blocking)
    (async () => {
      try {
        const brandBrain = await BrandBrain.findOne({ userId })
          .select('_id')
          .lean();

        if (brandBrain) {
          const guide = await generateToneOfVoice(
            {
              responses,
              contentSamples,
              creatorExamples,
            },
            [] // No transcripts available yet — will be improved after scraping completes
          );

          await ToneOfVoiceGuide.findOneAndUpdate(
            { userId },
            {
              userId,
              brandBrainId: brandBrain._id,
              parameters: guide.parameters,
              status: 'draft',
              generatedFrom: {
                questionnaireId: contentDNAId,
                transcriptIds: [],
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          console.log('[Onboarding] Tone of Voice generated successfully in background');
        }
      } catch (tovError) {
        console.error(
          '[Onboarding] Tone of Voice auto-generation failed (non-fatal):',
          tovError
        );
      }
    })();

    // Fire off background channel/video scraping (non-blocking)
    (async () => {
      try {
        await dbConnect();

        for (let i = 0; i < cleanedInspirations.length; i++) {
          const insp = cleanedInspirations[i];
          const url = insp.url.trim();

          // Determine if this is a direct video URL we can scrape now
          const isVideoUrl =
            url.toLowerCase().includes('youtube.com/watch') ||
            url.toLowerCase().includes('youtu.be/');

          if (!isVideoUrl) {
            // Channel URL/handle (e.g. @MrBeast, youtube.com/@MrBeast) — log and skip for now
            // TODO V2: Use a channel scraping Apify actor to fetch recent video URLs, then scrape each
            console.log(`[Onboarding Scrape] Channel URL skipped (V2): ${url}`);
            continue;
          }

          // Check cache first
          const cached = await YouTubeTranscriptCache.findOne({ url });
          if (cached) {
            console.log(`[Onboarding Scrape] Cache hit for: ${url}`);
            // Update the ContentDNAResponse with the cached transcript
            await ContentDNAResponse.updateOne(
              { _id: contentDNAId, 'creatorExamples.url': url },
              { $set: { 'creatorExamples.$.extractedTranscript': cached.transcript } }
            );
            continue;
          }

          // Scrape via Apify
          console.log(`[Onboarding Scrape] Fetching transcript for: ${url}`);
          const result = await extractYouTubeTranscript(url);

          if (result && result.transcript) {
            // Save to cache (30-day expiry)
            await YouTubeTranscriptCache.findOneAndUpdate(
              { url },
              {
                url,
                transcript: result.transcript,
                title: result.title,
                channelName: result.channelName,
                fetchedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
              { upsert: true }
            );

            // Update the ContentDNAResponse with the scraped transcript
            await ContentDNAResponse.updateOne(
              { _id: contentDNAId, 'creatorExamples.url': url },
              { $set: { 'creatorExamples.$.extractedTranscript': result.transcript } }
            );

            console.log(`[Onboarding Scrape] Transcript saved for: ${url}`);
          } else {
            console.log(`[Onboarding Scrape] No transcript available for: ${url}`);
          }
        }

        console.log('[Onboarding Scrape] Background scraping complete');
      } catch (scrapeError) {
        console.error('[Onboarding Scrape] Background scraping failed (non-fatal):', scrapeError);
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'Content DNA saved',
      data: { id: contentDNAId.toString() },
    });
  } catch (error) {
    console.error('Error saving Content DNA:', error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Detect the platform from a URL string.
 */
function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
  if (lower.includes('linkedin.com')) return 'linkedin';
  return 'other';
}

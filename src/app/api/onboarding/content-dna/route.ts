import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import BrandBrain from '@/models/BrandBrain';
import ToneOfVoiceGuide from '@/models/ToneOfVoiceGuide';
import YouTubeTranscriptCache from '@/models/YouTubeTranscriptCache';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { generateToneOfVoice, generateContentPillars } from '@/lib/ai/generate';
import { extractYouTubeTranscript } from '@/lib/apify';

interface ContentDNAPayload {
  // Step 1: Your Story (Q1-Q3)
  yourStory: string;
  winsAndMilestones: string;
  contentGoal: string;

  // Step 2: Your Business (Q4-Q5)
  offerAndContent: string;
  goToPersonFor: string;

  // Step 3: Your Passion (Q6-Q8)
  talkWithoutPreparing: string;
  audienceAndProblem: string;
  uniquePerspective: string;

  // Step 4: Your Stories (Q9-Q10)
  personalStories: string;
  knownForAndAgainst: string;

  // Step 5: Your History (Q11-Q13)
  contentHistory: string;
  timeAndEnergy: string;
  easyVsDraining: string;

  // Step 6: Your Inspiration (Q14-Q15)
  inspirations: { url: string; note: string }[];
  naturalFormat: string;

  // Step 7: Your Core Message (Q16)
  coreMessage: string;
}

function validatePayload(data: ContentDNAPayload): string | null {
  if (!data.yourStory?.trim()) return 'Your story is required.';
  if (!data.winsAndMilestones?.trim()) return 'Wins and milestones are required.';
  if (!data.contentGoal?.trim()) return 'Content goal is required.';
  if (!data.offerAndContent?.trim()) return 'Offer description is required.';
  if (!data.goToPersonFor?.trim()) return 'Go-to expertise is required.';
  if (!data.talkWithoutPreparing?.trim()) return 'Passionate topics are required.';
  if (!data.audienceAndProblem?.trim()) return 'Audience and problem description is required.';
  if (!data.uniquePerspective?.trim()) return 'Unique perspective is required.';
  if (!data.personalStories?.trim()) return 'Personal stories are required.';
  if (!data.knownForAndAgainst?.trim()) return 'Known for and against is required.';
  if (!data.contentHistory?.trim()) return 'Content history is required.';
  if (!data.timeAndEnergy?.trim()) return 'Time and energy description is required.';
  if (!data.easyVsDraining?.trim()) return 'Easy vs. draining description is required.';
  if (
    !Array.isArray(data.inspirations) ||
    !data.inspirations.some((e) => e.url?.trim())
  ) {
    return 'At least one inspiration URL or channel name is required.';
  }
  if (!data.naturalFormat?.trim()) return 'Natural format preference is required.';
  if (!data.coreMessage?.trim()) return 'Core message is required.';
  return null;
}

/**
 * Convert the flat form payload into the ContentDNAResponse schema format.
 */
function buildResponses(data: ContentDNAPayload) {
  return [
    { questionId: 'yourStory', question: 'What do you do and how did you end up here?', answer: data.yourStory, answerType: 'text' as const },
    { questionId: 'winsAndMilestones', question: 'What are the biggest wins, results, or milestones you can point to?', answer: data.winsAndMilestones, answerType: 'text' as const },
    { questionId: 'contentGoal', question: 'What do you want your content to actually lead to?', answer: data.contentGoal, answerType: 'text' as const },
    { questionId: 'offerAndContent', question: 'What do you sell or plan to sell, and how does content connect to that?', answer: data.offerAndContent, answerType: 'text' as const },
    { questionId: 'goToPersonFor', question: 'What do people always come to you for?', answer: data.goToPersonFor, answerType: 'text' as const },
    { questionId: 'talkWithoutPreparing', question: 'What could you talk about for 30 minutes without preparing?', answer: data.talkWithoutPreparing, answerType: 'text' as const },
    { questionId: 'audienceAndProblem', question: 'Who do you want your content to reach, and what painful problem are you solving for them?', answer: data.audienceAndProblem, answerType: 'text' as const },
    { questionId: 'uniquePerspective', question: 'What makes your perspective different from everyone else talking about this stuff?', answer: data.uniquePerspective, answerType: 'text' as const },
    { questionId: 'personalStories', question: 'What are 2 or 3 personal stories that shaped who you are today?', answer: data.personalStories, answerType: 'text' as const },
    { questionId: 'knownForAndAgainst', question: 'What do you want to be known FOR, and what do you want to be known AGAINST?', answer: data.knownForAndAgainst, answerType: 'text' as const },
    { questionId: 'contentHistory', question: 'Have you tried making content before? What happened?', answer: data.contentHistory, answerType: 'text' as const },
    { questionId: 'timeAndEnergy', question: 'How much time and energy do you realistically have for content?', answer: data.timeAndEnergy, answerType: 'text' as const },
    { questionId: 'easyVsDraining', question: 'What parts of making content feel easy to you, and what parts feel like they\'d drain you?', answer: data.easyVsDraining, answerType: 'text' as const },
    { questionId: 'naturalFormat', question: 'What format feels most natural for you to create in right now?', answer: data.naturalFormat, answerType: 'text' as const },
    { questionId: 'coreMessage', question: 'If someone watched all your content and walked away with one core message about you, what would you want it to be?', answer: data.coreMessage, answerType: 'text' as const },
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

    await dbConnect();

    // Build the responses array for the ContentDNAResponse model
    const responses = buildResponses(body);

    // Build creator examples from inspiration URLs
    const creatorExamples = cleanedInspirations.map((insp) => ({
      url: insp.url,
      platform: detectPlatform(insp.url),
      extractedTranscript: '',
    }));

    // No more separate content samples — voice samples removed in V2 questionnaire
    const contentSamples: { text: string; type: string }[] = [];

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
    // Extract topic keywords from passion and business answers for content pillars
    const existingBrandBrain = await BrandBrain.findOne({ userId: user.id });
    if (!existingBrandBrain) {
      await BrandBrain.create({
        userId: user.id,
        contentPillars: [],
        industryData: {
          field: '',
          keywords: [],
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
            [], // No transcripts available yet — will be improved after scraping completes
            userId
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

    // Fire off content pillar generation in the background (non-blocking)
    (async () => {
      try {
        const pillarResponses = responses.map((r) => ({
          question: r.question,
          answer: r.answer,
        }));

        const generatedPillars = await generateContentPillars(pillarResponses, userId);

        await BrandBrain.findOneAndUpdate(
          { userId },
          { $set: { contentPillars: generatedPillars } }
        );

        console.log('[Onboarding] Content pillars generated successfully in background');
      } catch (pillarError) {
        console.error(
          '[Onboarding] Content pillar auto-generation failed (non-fatal):',
          pillarError
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

        // --- Re-generate Tone of Voice with scraped transcripts ---
        try {
          // Fetch the updated ContentDNA to get all extracted transcripts
          const updatedDNA = await ContentDNAResponse.findById(contentDNAId).lean();
          const scrapedTranscripts = (updatedDNA?.creatorExamples || [])
            .map((ex) => ex.extractedTranscript)
            .filter((t): t is string => !!t && t.trim().length > 0);

          if (scrapedTranscripts.length > 0) {
            console.log(`[Onboarding Scrape] Re-generating ToV with ${scrapedTranscripts.length} transcript(s)`);

            const brandBrain = await BrandBrain.findOne({ userId })
              .select('_id')
              .lean();

            if (brandBrain) {
              const updatedGuide = await generateToneOfVoice(
                {
                  responses,
                  contentSamples,
                  creatorExamples: updatedDNA?.creatorExamples || creatorExamples,
                },
                scrapedTranscripts,
                userId
              );

              await ToneOfVoiceGuide.findOneAndUpdate(
                { userId },
                {
                  parameters: updatedGuide.parameters,
                  status: 'draft',
                  generatedFrom: {
                    questionnaireId: contentDNAId,
                    transcriptIds: [],
                  },
                }
              );

              console.log('[Onboarding Scrape] ToV re-generated with transcripts successfully');
            }
          } else {
            console.log('[Onboarding Scrape] No transcripts scraped — skipping ToV re-generation');
          }
        } catch (tovRegenError) {
          console.error('[Onboarding Scrape] ToV re-generation failed (non-fatal):', tovRegenError);
        }
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

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import BrandBrain from '@/models/BrandBrain';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/api-auth';

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

    // Mark onboarding as completed for the user
    await User.findByIdAndUpdate(user.id, { onboardingCompleted: true });

    return NextResponse.json({
      success: true,
      message: 'Content DNA saved',
      data: { id: contentDNA._id.toString() },
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

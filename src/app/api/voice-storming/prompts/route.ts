import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BrandBrain from '@/models/BrandBrain';
import User from '@/models/User';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import VoiceStormingTranscript from '@/models/VoiceStormingTranscript';
import { getAnthropicClient, CLAUDE_MODEL, extractJsonFromResponse } from '@/lib/ai/client';
import { trackAIUsage } from '@/lib/ai/usage-tracker';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const count = Math.min(Math.max(parseInt(searchParams.get('count') || '3', 10), 1), 5);
    const excludeRaw = searchParams.get('exclude') || '';
    const excludePrompts = excludeRaw ? excludeRaw.split('||').filter(Boolean) : [];

    await dbConnect();

    const [brandBrain, user, contentDNA, recentSessions] = await Promise.all([
      BrandBrain.findOne({ userId: authResult.id }).lean(),
      User.findById(authResult.id).select('contentGoals').lean(),
      ContentDNAResponse.findOne({ userId: authResult.id }).select('responses').lean(),
      VoiceStormingTranscript.find({ userId: authResult.id })
        .select('title promptUsed transcript')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const pillars = brandBrain?.contentPillars?.map((p: { title: string }) => p.title) || [];
    const industry = brandBrain?.industryData?.field || 'content creation';

    // Extract goals from User.contentGoals or ContentDNA responses
    const goals = (user as { contentGoals?: string } | null)?.contentGoals || '';

    // Extract Content DNA goal-related answers (questionId containing "goal")
    const dnaGoalAnswers = ((contentDNA as { responses?: { questionId: string; answer: string | string[] }[] } | null)?.responses || [])
      .filter((r: { questionId: string; answer: string | string[] }) =>
        r.questionId.toLowerCase().includes('goal')
      )
      .map((r: { answer: string | string[] }) =>
        Array.isArray(r.answer) ? r.answer.join(', ') : r.answer
      );

    // Build recent topics list for de-duplication
    const recentTopics = (recentSessions as { title?: string; promptUsed?: string; transcript?: string }[])
      .map((s: { title?: string; promptUsed?: string; transcript?: string }) =>
        s.title || s.promptUsed || (s.transcript ? s.transcript.slice(0, 80) : '')
      )
      .filter(Boolean);

    const client = getAnthropicClient();

    const startMs = Date.now();
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: `You generate personalized thought-provoking questions to help creators start voice storming sessions. Return ONLY a JSON array of exactly ${count} question string${count === 1 ? '' : 's'}. Each question should be specific to the creator's niche and goals, open-ended, and designed to unlock stories, insights, or content ideas. Avoid generic questions - reference their industry, pillars, or goals directly. Never repeat topics from their recent sessions.`,
      messages: [
        {
          role: 'user',
          content: `Generate ${count} personalized voice storming prompt${count === 1 ? '' : 's'} for a creator in the "${industry}" space.

Content pillars: ${pillars.length > 0 ? pillars.join(', ') : 'not yet defined'}

${goals ? `Creator's goals: ${goals}` : ''}
${dnaGoalAnswers.length > 0 ? `Additional goal context: ${dnaGoalAnswers.join('; ')}` : ''}

${recentTopics.length > 0
  ? `Recent session topics (DO NOT repeat these): ${recentTopics.join(' | ')}`
  : ''}

${excludePrompts.length > 0
  ? `Previously shown prompts (DO NOT repeat or paraphrase these): ${excludePrompts.join(' | ')}`
  : ''}

Make the prompts conversational, specific to their niche, and easy to riff on.${count >= 3 ? ' Each prompt should unlock a different angle: one about recent experiences, one about audience questions or pain points, and one about a lesson or shift in perspective.' : ''}`,
        },
      ],
    });

    trackAIUsage({ userId: authResult.id, feature: 'voice_storming_prompts', response, durationMs: Date.now() - startMs });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ prompts: ['What happened this week that surprised you?', 'What question do your viewers keep asking?', 'What did you learn recently that changed how you work?'] });
    }

    const prompts = extractJsonFromResponse(textBlock.text) as string[];
    return NextResponse.json({ prompts: Array.isArray(prompts) ? prompts : [] });
  } catch (error) {
    console.error('Error generating voice storm prompts:', error);
    // Fallback prompts
    return NextResponse.json({
      prompts: [
        'What happened this week that surprised you?',
        'What question do your viewers keep asking?',
        'What did you learn recently that changed how you work?',
      ],
    });
  }
}

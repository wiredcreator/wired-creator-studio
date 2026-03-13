import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContentIdea from '@/models/ContentIdea';
import { assembleBrandBrainContext } from '@/lib/ai/brand-brain-context';
import { generateIdeas } from '@/lib/ai/generate';

// POST /api/ideas/generate — Generate new AI content ideas for a user
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Assemble Brand Brain context for idea generation
    const brandBrainContext = await assembleBrandBrainContext(userId, {
      includeToneOfVoice: true,
      includeContentPillars: true,
      includeIndustryData: true,
      includeEquipmentProfile: false,
      includeTranscripts: false,
    });

    // Generate ideas via AI (or mock data)
    const generatedIdeas = await generateIdeas(brandBrainContext);

    // Save all generated ideas to MongoDB
    const savedIdeas = await ContentIdea.insertMany(
      generatedIdeas.map((idea) => ({
        userId,
        title: idea.title,
        description: idea.description,
        status: 'suggested',
        source: 'ai_generated',
        contentPillar: idea.contentPillar || '',
        tags: [],
      }))
    );

    return NextResponse.json(
      {
        success: true,
        ideas: savedIdeas,
        count: savedIdeas.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating ideas:', error);
    return NextResponse.json(
      { error: 'Failed to generate ideas' },
      { status: 500 }
    );
  }
}

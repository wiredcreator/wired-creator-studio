import type { BrandBrainContextOptions } from '@/types/ai';
import dbConnect from '@/lib/db';
import BrandBrain from '@/models/BrandBrain';
import ToneOfVoiceGuide from '@/models/ToneOfVoiceGuide';
import VoiceStormingTranscript from '@/models/VoiceStormingTranscript';
import CallTranscript from '@/models/CallTranscript';
import ContentDNAResponse from '@/models/ContentDNAResponse';
import ContentIdea from '@/models/ContentIdea';

// ---------------------------------------------------------------------------
// Brand Brain Context Builder
// ---------------------------------------------------------------------------
// Assembles a formatted string from a student's Brand Brain data that can be
// appended to any Claude system prompt for personalised generation.
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: Required<BrandBrainContextOptions> = {
  includeToneOfVoice: true,
  includeContentPillars: true,
  includeIndustryData: true,
  includeEquipmentProfile: false,
  includeTranscripts: false,
  maxTranscripts: 3,
  includeApprovedIdeas: true,
  includeContentDNA: true,
  maxApprovedIdeas: 10,
};

/**
 * Fetches the relevant Brand Brain data for a user and returns a formatted
 * context string ready for injection into a Claude system prompt.
 *
 * @param userId  Mongo ObjectId (string) of the student
 * @param opts    Controls which sections of the Brand Brain to include
 * @returns       A formatted string, or an empty string if no Brand Brain exists
 */
export async function assembleBrandBrainContext(
  userId: string,
  opts?: BrandBrainContextOptions
): Promise<string> {
  const options: Required<BrandBrainContextOptions> = {
    ...DEFAULT_OPTIONS,
    ...opts,
  };

  await dbConnect();

  // Fetch the Brand Brain document
  const brandBrain = await BrandBrain.findOne({ userId }).lean();

  if (!brandBrain) {
    return '';
  }

  const sections: string[] = [];
  sections.push('=== BRAND BRAIN CONTEXT ===');

  // --- Tone of Voice Guide ---
  if (options.includeToneOfVoice && brandBrain.toneOfVoiceGuide) {
    try {
      const guide = await ToneOfVoiceGuide.findById(
        brandBrain.toneOfVoiceGuide
      ).lean();

      if (guide && guide.parameters.length > 0) {
        sections.push('\n## Tone of Voice Guide');
        const grouped = groupByCategory(guide.parameters);

        for (const [category, params] of Object.entries(grouped)) {
          sections.push(`\n### ${formatCategory(category)}`);
          for (const p of params) {
            sections.push(`- **${p.key}**: ${p.value}`);
          }
        }
      }
    } catch {
      // If guide fetch fails, skip silently — context is best-effort
    }
  }

  // --- Content Pillars ---
  if (options.includeContentPillars && brandBrain.contentPillars?.length > 0) {
    sections.push('\n## Content Pillars');
    for (const pillar of brandBrain.contentPillars) {
      sections.push(`- **${pillar.title}**: ${pillar.description}`);
      if (pillar.keywords?.length > 0) {
        sections.push(`  Keywords: ${pillar.keywords.join(', ')}`);
      }
    }
  }

  // --- Industry Data ---
  if (options.includeIndustryData && brandBrain.industryData) {
    const ind = brandBrain.industryData;
    if (ind.field || ind.keywords?.length > 0 || ind.competitors?.length > 0) {
      sections.push('\n## Industry & Niche');
      if (ind.field) sections.push(`- Field: ${ind.field}`);
      if (ind.keywords?.length > 0)
        sections.push(`- Keywords: ${ind.keywords.join(', ')}`);
      if (ind.competitors?.length > 0)
        sections.push(`- Competitors: ${ind.competitors.join(', ')}`);
    }
  }

  // --- Equipment Profile ---
  if (options.includeEquipmentProfile && brandBrain.equipmentProfile) {
    const eq = brandBrain.equipmentProfile;
    if (eq.camera || eq.location || eq.constraints) {
      sections.push('\n## Equipment & Setup');
      if (eq.camera) sections.push(`- Camera: ${eq.camera}`);
      if (eq.location) sections.push(`- Location: ${eq.location}`);
      if (eq.constraints) sections.push(`- Constraints: ${eq.constraints}`);
    }
  }

  // --- Approved Content Ideas ---
  if (options.includeApprovedIdeas && brandBrain.approvedIdeas?.length > 0) {
    try {
      const ideas = await ContentIdea.find({
        _id: { $in: brandBrain.approvedIdeas },
      })
        .sort({ approvedAt: -1 })
        .limit(options.maxApprovedIdeas)
        .lean();

      if (ideas.length > 0) {
        sections.push('\n## Approved Content Ideas');
        for (const idea of ideas) {
          sections.push(`- **${idea.title}** (${idea.contentPillar || 'uncategorized'}): ${idea.description}`);
        }
      }
    } catch {
      // Best-effort
    }
  }

  // --- Content DNA ---
  if (options.includeContentDNA && brandBrain.contentDNAResponse) {
    try {
      const dna = await ContentDNAResponse.findById(brandBrain.contentDNAResponse).lean();

      if (dna && dna.responses?.length > 0) {
        sections.push('\n## Content DNA Profile');
        for (const r of dna.responses) {
          const answer = Array.isArray(r.answer) ? r.answer.join(', ') : r.answer;
          sections.push(`- **${r.question}**: ${answer}`);
        }
      }
    } catch {
      // Best-effort
    }
  }

  // --- Recent Transcripts (prefer Brand Brain refs, fall back to direct query) ---
  if (options.includeTranscripts) {
    try {
      let voiceStorms;
      let calls;

      if (brandBrain.voiceStormSessions?.length > 0) {
        // Use refs — fetch the most recent linked sessions
        voiceStorms = await VoiceStormingTranscript.find({
          _id: { $in: brandBrain.voiceStormSessions },
        })
          .sort({ createdAt: -1 })
          .limit(options.maxTranscripts)
          .lean();
      } else {
        // Fall back to direct query (for users who had sessions before this feature)
        voiceStorms = await VoiceStormingTranscript.find({ userId })
          .sort({ createdAt: -1 })
          .limit(options.maxTranscripts)
          .lean();
      }

      if (brandBrain.callTranscripts?.length > 0) {
        calls = await CallTranscript.find({
          _id: { $in: brandBrain.callTranscripts },
        })
          .sort({ createdAt: -1 })
          .limit(options.maxTranscripts)
          .lean();
      } else {
        calls = await CallTranscript.find({
          userId,
          callType: { $in: ['1on1_coaching', 'brain_dump'] },
        })
          .sort({ createdAt: -1 })
          .limit(options.maxTranscripts)
          .lean();
      }

      if (voiceStorms.length > 0) {
        sections.push('\n## Recent Voice Storming Sessions');
        for (const vs of voiceStorms) {
          const truncated = truncateText(vs.transcript, 1500);
          sections.push(`\n### Voice Storm (${vs.sessionType})`);
          if (vs.extractedInsights?.length > 0) {
            sections.push('Key insights:');
            for (const insight of vs.extractedInsights.slice(0, 5)) {
              sections.push(`- [${insight.type}] ${insight.content}`);
            }
          }
          sections.push(truncated);
        }
      }

      if (calls.length > 0) {
        sections.push('\n## Recent Coaching Call Notes');
        for (const call of calls) {
          const truncated = truncateText(call.transcript, 1500);
          sections.push(
            `\n### ${call.callType} (${call.callDate?.toISOString?.() ?? 'unknown date'})`
          );
          if (call.extractedThemes?.length > 0) {
            sections.push(`Themes: ${call.extractedThemes.join(', ')}`);
          }
          if (call.extractedStories?.length > 0) {
            sections.push('Stories:');
            for (const story of call.extractedStories.slice(0, 3)) {
              sections.push(`- ${story.summary}`);
            }
          }
          sections.push(truncated);
        }
      }
    } catch {
      // Transcript fetching is best-effort
    }
  }

  sections.push('\n=== END BRAND BRAIN CONTEXT ===');
  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ToneParam {
  key: string;
  value: string;
  category: string;
}

function groupByCategory(
  params: ToneParam[]
): Record<string, ToneParam[]> {
  const grouped: Record<string, ToneParam[]> = {};
  for (const p of params) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }
  return grouped;
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '... [truncated]';
}

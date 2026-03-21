import dbConnect from '@/lib/db';
import ContentIdea from '@/models/ContentIdea';

/**
 * Analyzes a user's idea approval/rejection history and returns a summary
 * string that can be injected into the idea generation prompt to improve
 * relevance of future AI-generated ideas.
 */
export async function getIdeaPatterns(userId: string): Promise<string> {
  await dbConnect();

  // Fetch the last 50 ideas that have been approved or rejected
  const ideas = await ContentIdea.find({
    userId,
    status: { $in: ['approved', 'rejected'] },
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  if (!ideas || ideas.length === 0) {
    return 'No approval/rejection history yet. Generate ideas based solely on Brand Brain context.';
  }

  const approved = ideas.filter((i) => i.status === 'approved');
  const rejected = ideas.filter((i) => i.status === 'rejected');
  const total = ideas.length;
  const approvalRate = Math.round((approved.length / total) * 100);

  // --- Content pillar analysis ---
  const pillarCount = (list: typeof ideas) => {
    const counts: Record<string, number> = {};
    for (const idea of list) {
      const pillar = idea.contentPillar || 'uncategorized';
      counts[pillar] = (counts[pillar] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([pillar]) => pillar);
  };

  const approvedPillars = pillarCount(approved);
  const rejectedPillars = pillarCount(rejected);

  // --- Keyword extraction from titles ---
  const extractKeywords = (list: typeof ideas): string[] => {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'was', 'are',
      'be', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'i', 'my', 'me', 'you', 'your', 'we', 'our',
      'how', 'why', 'what', 'when', 'where', 'who', 'which', 'not', 'no',
      'so', 'if', 'just', 'about', 'up', 'out', 'all', 'get', 'got', 'one',
      'can', 'into', 'more', 'most', 'than', 'them', 'their', 'here',
    ]);

    const wordCounts: Record<string, number> = {};
    for (const idea of list) {
      const words = idea.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));
      for (const word of words) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  };

  const approvedKeywords = approved.length > 0 ? extractKeywords(approved) : [];
  const rejectedKeywords = rejected.length > 0 ? extractKeywords(rejected) : [];

  // --- Rejection reasons ---
  const rejectionReasons = rejected
    .map((i) => i.rejectionReason)
    .filter((r): r is string => !!r && r.length > 0);

  // --- Build summary ---
  const parts: string[] = [];
  parts.push(`Based on the user's last ${total} reviewed ideas:`);
  parts.push(`- Approval rate: ${approvalRate}% (${approved.length} approved, ${rejected.length} rejected)`);

  if (approvedPillars.length > 0) {
    parts.push(`- Preferred content pillars (most approved): ${approvedPillars.slice(0, 3).join(', ')}`);
  }
  if (rejectedPillars.length > 0) {
    parts.push(`- Less favored content pillars (most rejected): ${rejectedPillars.slice(0, 3).join(', ')}`);
  }
  if (approvedKeywords.length > 0) {
    parts.push(`- Common keywords in approved idea titles: ${approvedKeywords.join(', ')}`);
  }
  if (rejectedKeywords.length > 0) {
    parts.push(`- Common keywords in rejected idea titles: ${rejectedKeywords.join(', ')}`);
  }
  if (rejectionReasons.length > 0) {
    const uniqueReasons = [...new Set(rejectionReasons)].slice(0, 3);
    parts.push(`- Recent rejection reasons: "${uniqueReasons.join('", "')}"`);
  }

  parts.push('');
  parts.push('Use these patterns to generate ideas the user is more likely to approve. Lean into preferred pillars and keywords. Avoid topics and angles similar to rejected ideas.');

  return parts.join('\n');
}

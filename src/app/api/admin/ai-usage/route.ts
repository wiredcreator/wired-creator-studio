import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AIUsageLog from '@/models/AIUsageLog';
import { getAuthenticatedUser } from '@/lib/api-auth';

// GET /api/admin/ai-usage — View AI usage stats and cost breakdown
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    if (user.role !== 'coach' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);
    const studentId = searchParams.get('studentId');

    const since = new Date();
    since.setDate(since.getDate() - days);

    const matchFilter: Record<string, unknown> = { createdAt: { $gte: since } };
    if (studentId) matchFilter.userId = studentId;

    // Summary stats
    const [summary, byFeature, byDay, recentLogs] = await Promise.all([
      AIUsageLog.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: 1 },
            totalInputTokens: { $sum: '$inputTokens' },
            totalOutputTokens: { $sum: '$outputTokens' },
            totalTokens: { $sum: '$totalTokens' },
            totalCostUsd: { $sum: '$estimatedCostUsd' },
            avgDurationMs: { $avg: '$durationMs' },
            errorCount: { $sum: { $cond: ['$success', 0, 1] } },
          },
        },
      ]),
      AIUsageLog.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$feature',
            calls: { $sum: 1 },
            totalTokens: { $sum: '$totalTokens' },
            costUsd: { $sum: '$estimatedCostUsd' },
            avgDurationMs: { $avg: '$durationMs' },
          },
        },
        { $sort: { costUsd: -1 } },
      ]),
      AIUsageLog.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            calls: { $sum: 1 },
            totalTokens: { $sum: '$totalTokens' },
            costUsd: { $sum: '$estimatedCostUsd' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AIUsageLog.find(matchFilter)
        .sort({ createdAt: -1 })
        .limit(50)
        .select('userId feature aiModel inputTokens outputTokens totalTokens estimatedCostUsd success durationMs createdAt')
        .lean(),
    ]);

    const stats = summary[0] || {
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      avgDurationMs: 0,
      errorCount: 0,
    };

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      summary: {
        totalCalls: stats.totalCalls,
        totalInputTokens: stats.totalInputTokens,
        totalOutputTokens: stats.totalOutputTokens,
        totalTokens: stats.totalTokens,
        totalCostUsd: Math.round(stats.totalCostUsd * 10000) / 10000,
        avgDurationMs: Math.round(stats.avgDurationMs || 0),
        errorCount: stats.errorCount,
      },
      byFeature,
      byDay,
      recentLogs,
    });
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI usage data' },
      { status: 500 }
    );
  }
}

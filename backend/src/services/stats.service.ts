import { getDatabase } from '../config/database';
import { getAllRepairs } from '../config/access-reader';

/**
 * Stats Service for Dashboard Analytics.
 * Aggregates data from both Access records and SQLite logs.
 */
export class StatsService {
  /**
   * Get comprehensive dashboard metrics.
   */
  static getDashboardMetrics() {
    const repairs = getAllRepairs();
    const db = getDatabase();

    // 1. Basic Counts
    const statusCounts: Record<string, number> = {};
    let totalDevices = repairs.length;
    let pendingApprovals = 0;
    
    repairs.forEach(r => {
      const status = this.getDisplayStatus(r.rep_state2, r.rep_state);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (status === 'انتظار موافقة') pendingApprovals++;
    });

    // 2. Unread Messages (SQLite)
    const unreadMessages = db.prepare(
      "SELECT COUNT(*) as count FROM chat_messages WHERE is_read = 0 AND sender_type = 'customer'"
    ).get() as { count: number };

    // 3. Fault Trends (Top 5)
    // We'll do a simple keyword extraction or just group by the raw field
    const faults: Record<string, number> = {};
    repairs.forEach(r => {
      if (r.rep_defects) {
        const d = r.rep_defects.split(' ')[0]; // Take first word for simple grouping
        faults[d] = (faults[d] || 0) + 1;
      }
    });
    const topFaults = Object.entries(faults)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    // 4. Technician Production
    const techs: Record<string, number> = {};
    repairs.forEach(r => {
      if (r.rep_emp) {
        techs[r.rep_emp] = (techs[r.rep_emp] || 0) + 1;
      }
    });

    // 5. Daily Trends (Last 7 Days)
    const trends: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trends[dateStr] = 0;
    }

    repairs.forEach(r => {
      if (r.rep_date1) {
        const dateStr = r.rep_date1.split(' ')[0]; // Handle potential timestamp
        if (trends[dateStr] !== undefined) {
          trends[dateStr]++;
        }
      }
    });

    // 6. Real Avg Rating from SQLite
    const ratingResult = db.prepare(
      "SELECT AVG((rating_speed + rating_quality + rating_handling) / 3.0) as avg FROM ratings"
    ).get() as { avg: number | null };

    return {
      devicesTracked: totalDevices,
      unreadMessages: unreadMessages.count,
      pendingApprovals,
      recentEvents: 0,
      avgRating: ratingResult?.avg ? parseFloat(ratingResult.avg.toFixed(1)) : 0,
      chartData: {
        donut: {
          labels: Object.keys(statusCounts),
          data: Object.values(statusCounts),
        },
        trends: {
          labels: Object.keys(trends),
          data: Object.values(trends)
        },
        faults: topFaults,
        techs: {
          labels: Object.keys(techs),
          data: Object.values(techs)
        }
      }
    };
  }

  private static getDisplayStatus(repState2: string, repState: string): string {
    if (repState === 'تم التسليم') return 'تم التسليم';
    if (repState2 === 'تم الاصلاح') return 'جاهز للاستلام';
    if (repState2 === 'لا تصلح') return 'لا تصلح';
    if (repState2 === 'إعاده توجيه') return 'إعاده توجيه';
    if (repState2 === 'الرجوع للعميل') return 'انتظار موافقة';
    if (repState === 'لم يتم التسليم' && !repState2) return 'قيد الإصلاح';
    return 'قيد الفحص';
  }
}

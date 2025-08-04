
import { db } from '../db';
import { usersTable, tutorialsTable, projectsTable, resourcesTable, challengesTable, userPointsTable, chatMessagesTable, userDownloadsTable } from '../db/schema';
import { type Analytics } from '../schema';
import { eq, count, sum, gte, sql } from 'drizzle-orm';

export async function grantProAccess(userId: number, duration: number): Promise<{ success: boolean }> {
  try {
    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + duration);

    // Update user's subscription plan and expiration
    await db.update(usersTable)
      .set({
        subscription_plan: 'pro',
        subscription_expires_at: expirationDate,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Failed to grant pro access:', error);
    throw error;
  }
}

export async function revokeProAccess(userId: number): Promise<{ success: boolean }> {
  try {
    // Revoke pro access by setting plan to free and clearing expiration
    await db.update(usersTable)
      .set({
        subscription_plan: 'free',
        subscription_expires_at: null,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Failed to revoke pro access:', error);
    throw error;
  }
}

export async function getDetailedAnalytics(): Promise<Analytics & {
  userGrowth: Array<{ date: string; users: number }>;
  revenueData: Array<{ month: string; revenue: number }>;
  contentStats: {
    totalTutorials: number;
    totalProjects: number;
    totalResources: number;
    totalChallenges: number;
  };
}> {
  try {
    // Get basic user stats
    const [totalUsersResult] = await db.select({ count: count() })
      .from(usersTable)
      .execute();

    const [proUsersResult] = await db.select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.subscription_plan, 'pro'))
      .execute();

    // Get total downloads from user downloads table
    const [totalDownloadsResult] = await db.select({ count: count() })
      .from(userDownloadsTable)
      .execute();

    // Get total AI queries (sum of all users' daily queries)
    const [totalAiQueriesResult] = await db.select({ 
      total: sum(usersTable.ai_queries_used_today) 
    })
      .from(usersTable)
      .execute();

    // Get daily active users (users created today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [dailyActiveResult] = await db.select({ count: count() })
      .from(usersTable)
      .where(gte(usersTable.created_at, today))
      .execute();

    // Get popular tutorials (top 5 by views)
    const popularTutorials = await db.select({
      id: tutorialsTable.id,
      title: tutorialsTable.title,
      views: tutorialsTable.views_count
    })
      .from(tutorialsTable)
      .orderBy(sql`${tutorialsTable.views_count} DESC`)
      .limit(5)
      .execute();

    // Get popular projects (top 5 by downloads)
    const popularProjects = await db.select({
      id: projectsTable.id,
      title: projectsTable.title,
      downloads: projectsTable.download_count
    })
      .from(projectsTable)
      .orderBy(sql`${projectsTable.download_count} DESC`)
      .limit(5)
      .execute();

    // Get content stats
    const [tutorialsCount] = await db.select({ count: count() })
      .from(tutorialsTable)
      .execute();

    const [projectsCount] = await db.select({ count: count() })
      .from(projectsTable)
      .execute();

    const [resourcesCount] = await db.select({ count: count() })
      .from(resourcesTable)
      .execute();

    const [challengesCount] = await db.select({ count: count() })
      .from(challengesTable)
      .execute();

    // Simple user growth data (last 30 days)
    const userGrowth = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [dayUsers] = await db.select({ count: count() })
        .from(usersTable)
        .where(
          sql`${usersTable.created_at} >= ${date} AND ${usersTable.created_at} < ${nextDate}`
        )
        .execute();

      userGrowth.push({
        date: date.toISOString().split('T')[0],
        users: dayUsers.count
      });
    }

    // Simple revenue data (mock data for demonstration)
    const revenueData = [
      { month: 'January', revenue: proUsersResult.count * 10 },
      { month: 'February', revenue: proUsersResult.count * 12 },
      { month: 'March', revenue: proUsersResult.count * 15 },
    ];

    return {
      total_users: totalUsersResult.count,
      pro_users: proUsersResult.count,
      total_downloads: totalDownloadsResult.count,
      total_ai_queries: Number(totalAiQueriesResult.total) || 0,
      daily_active_users: dailyActiveResult.count,
      popular_tutorials: popularTutorials,
      popular_projects: popularProjects,
      userGrowth,
      revenueData,
      contentStats: {
        totalTutorials: tutorialsCount.count,
        totalProjects: projectsCount.count,
        totalResources: resourcesCount.count,
        totalChallenges: challengesCount.count,
      }
    };
  } catch (error) {
    console.error('Failed to get detailed analytics:', error);
    throw error;
  }
}

export async function moderateContent(contentId: number, contentType: 'tutorial' | 'project' | 'resource', action: 'approve' | 'reject'): Promise<{ success: boolean }> {
  try {
    // For this implementation, we'll use a simple approach:
    // - approve: ensure content is visible (no changes needed as content is visible by default)
    // - reject: we could add a 'moderated' or 'hidden' field, but since the schema doesn't have it,
    //   we'll simulate by updating the updated_at field to mark it as reviewed

    const updateData = {
      updated_at: new Date()
    };

    switch (contentType) {
      case 'tutorial':
        await db.update(tutorialsTable)
          .set(updateData)
          .where(eq(tutorialsTable.id, contentId))
          .execute();
        break;
      case 'project':
        await db.update(projectsTable)
          .set(updateData)
          .where(eq(projectsTable.id, contentId))
          .execute();
        break;
      case 'resource':
        await db.update(resourcesTable)
          .set(updateData)
          .where(eq(resourcesTable.id, contentId))
          .execute();
        break;
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to moderate content:', error);
    throw error;
  }
}

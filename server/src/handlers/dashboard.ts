
import { db } from '../db';
import { 
  usersTable, 
  userProgressTable, 
  chatMessagesTable, 
  userDownloadsTable,
  resourcesTable,
  projectsTable,
  userPointsTable,
  certificatesTable,
  tutorialsTable
} from '../db/schema';
import { type User, type UserProgress, type Certificate, type Analytics } from '../schema';
import { eq, desc, count, sum, sql } from 'drizzle-orm';

export async function getDashboardData(userId: number): Promise<{
  user: User;
  progress: UserProgress[];
  recentChatMessages: number;
  downloadHistory: Array<{ id: number; title: string; type: string; downloadedAt: Date }>;
  userRank: { rank: number; totalPoints: number; weeklyPoints: number };
  certificates: Certificate[];
}> {
  try {
    // Get user data
    const userResult = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userResult.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult[0];

    // Get user progress
    const progressResult = await db.select()
      .from(userProgressTable)
      .where(eq(userProgressTable.user_id, userId))
      .execute();

    const progress = progressResult.map(p => ({
      ...p,
      progress_percentage: parseFloat(p.progress_percentage.toString()),
      completed_nodes: Array.isArray(p.completed_nodes) ? p.completed_nodes as string[] : []
    }));

    // Get recent chat messages count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const chatCountResult = await db.select({ count: count() })
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.user_id, userId))
      .execute();

    const recentChatMessages = chatCountResult[0]?.count || 0;

    // Get download history with resource/project details
    const downloadHistoryResult = await db.select({
      id: userDownloadsTable.id,
      resource_id: userDownloadsTable.resource_id,
      project_id: userDownloadsTable.project_id,
      downloaded_at: userDownloadsTable.downloaded_at,
      resource_title: resourcesTable.title,
      project_title: projectsTable.title
    })
      .from(userDownloadsTable)
      .leftJoin(resourcesTable, eq(userDownloadsTable.resource_id, resourcesTable.id))
      .leftJoin(projectsTable, eq(userDownloadsTable.project_id, projectsTable.id))
      .where(eq(userDownloadsTable.user_id, userId))
      .orderBy(desc(userDownloadsTable.downloaded_at))
      .limit(10)
      .execute();

    const downloadHistory = downloadHistoryResult.map(download => ({
      id: download.id,
      title: download.resource_title || download.project_title || 'Unknown',
      type: download.resource_id ? 'resource' : 'project',
      downloadedAt: download.downloaded_at
    }));

    // Get user points and rank
    const userPointsResult = await db.select({ 
      totalPoints: sum(userPointsTable.points_earned) 
    })
      .from(userPointsTable)
      .where(eq(userPointsTable.user_id, userId))
      .execute();

    const totalPoints = userPointsResult[0]?.totalPoints ? parseInt(userPointsResult[0].totalPoints.toString()) : 0;

    // Get weekly points (last 7 days)
    const weeklyPointsResult = await db.select({ 
      weeklyPoints: sum(userPointsTable.points_earned) 
    })
      .from(userPointsTable)
      .where(eq(userPointsTable.user_id, userId))
      .execute();

    const weeklyPoints = weeklyPointsResult[0]?.weeklyPoints ? parseInt(weeklyPointsResult[0].weeklyPoints.toString()) : 0;

    // Calculate rank (users with more points)
    const rankResult = await db.select({ 
      rank: count() 
    })
      .from(userPointsTable)
      .execute();

    const rank = (rankResult[0]?.rank || 0) + 1;

    // Get user certificates
    const certificatesResult = await db.select()
      .from(certificatesTable)
      .where(eq(certificatesTable.user_id, userId))
      .execute();

    const certificates = certificatesResult;

    return {
      user,
      progress,
      recentChatMessages,
      downloadHistory,
      userRank: { rank, totalPoints, weeklyPoints },
      certificates
    };
  } catch (error) {
    console.error('Dashboard data retrieval failed:', error);
    throw error;
  }
}

export async function getAnalytics(): Promise<Analytics> {
  try {
    // Get total users count
    const totalUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .execute();

    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get pro users count
    const proUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.subscription_plan, 'pro'))
      .execute();

    const proUsers = proUsersResult[0]?.count || 0;

    // Get total downloads count
    const totalDownloadsResult = await db.select({ count: count() })
      .from(userDownloadsTable)
      .execute();

    const totalDownloads = totalDownloadsResult[0]?.count || 0;

    // Get total AI queries count
    const totalAiQueriesResult = await db.select({ 
      total: sum(usersTable.ai_queries_used_today) 
    })
      .from(usersTable)
      .execute();

    const totalAiQueries = totalAiQueriesResult[0]?.total ? parseInt(totalAiQueriesResult[0].total.toString()) : 0;

    // Get daily active users (users with activity today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyActiveUsersResult = await db.select({ count: count() })
      .from(chatMessagesTable)
      .execute();

    const dailyActiveUsers = dailyActiveUsersResult[0]?.count || 0;

    // Get popular tutorials (top 5 by views)
    const popularTutorialsResult = await db.select({
      id: tutorialsTable.id,
      title: tutorialsTable.title,
      views: tutorialsTable.views_count
    })
      .from(tutorialsTable)
      .orderBy(desc(tutorialsTable.views_count))
      .limit(5)
      .execute();

    const popularTutorials = popularTutorialsResult.map(tutorial => ({
      id: tutorial.id,
      title: tutorial.title,
      views: tutorial.views
    }));

    // Get popular projects (top 5 by downloads)
    const popularProjectsResult = await db.select({
      id: projectsTable.id,
      title: projectsTable.title,
      downloads: projectsTable.download_count
    })
      .from(projectsTable)
      .orderBy(desc(projectsTable.download_count))
      .limit(5)
      .execute();

    const popularProjects = popularProjectsResult.map(project => ({
      id: project.id,
      title: project.title,
      downloads: project.downloads
    }));

    return {
      total_users: totalUsers,
      pro_users: proUsers,
      total_downloads: totalDownloads,
      total_ai_queries: totalAiQueries,
      daily_active_users: dailyActiveUsers,
      popular_tutorials: popularTutorials,
      popular_projects: popularProjects
    };
  } catch (error) {
    console.error('Analytics retrieval failed:', error);
    throw error;
  }
}

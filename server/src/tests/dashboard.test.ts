
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
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
  tutorialsTable,
  challengesTable
} from '../db/schema';
import { getDashboardData, getAnalytics } from '../handlers/dashboard';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  avatar_url: null,
  subscription_plan: 'free' as const,
  subscription_expires_at: null,
  ai_queries_used_today: 5
};

const testUser2 = {
  email: 'test2@example.com',
  password_hash: 'hashed_password2',
  full_name: 'Test User 2',
  avatar_url: null,
  subscription_plan: 'pro' as const,
  subscription_expires_at: null,
  ai_queries_used_today: 10
};

const testTutorial = {
  title: 'Test Tutorial',
  slug: 'test-tutorial',
  description: 'A tutorial for testing',
  content: 'Tutorial content here',
  tech_stack: ['javascript', 'react'],
  difficulty: 'beginner' as const,
  estimated_time: 60,
  thumbnail_url: null,
  is_pro: false,
  likes_count: 0,
  views_count: 100
};

const testProject = {
  title: 'Test Project',
  slug: 'test-project',
  description: 'A project for testing',
  tech_stack: ['javascript', 'node'],
  difficulty: 'intermediate' as const,
  preview_image_url: null,
  demo_url: null,
  github_url: null,
  guide_pdf_url: null,
  is_pro: false,
  download_count: 50
};

const testResource = {
  title: 'Test Resource',
  description: 'A resource for testing',
  category: 'tools',
  file_url: 'https://example.com/file.zip',
  file_size: 1024,
  file_type: 'zip',
  thumbnail_url: null,
  is_pro: false,
  download_count: 25
};

const testChallenge = {
  title: 'Test Challenge',
  description: 'A challenge for testing',
  type: 'tutorial' as const,
  points_reward: 100,
  tutorial_id: null,
  project_id: null,
  quiz_data: null,
  start_date: new Date(),
  end_date: new Date(Date.now() + 86400000), // tomorrow
  is_active: true
};

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get complete dashboard data for user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test tutorial and project
    const tutorialResult = await db.insert(tutorialsTable)
      .values(testTutorial)
      .returning()
      .execute();
    const tutorialId = tutorialResult[0].id;

    const projectResult = await db.insert(projectsTable)
      .values(testProject)
      .returning()
      .execute();
    const projectId = projectResult[0].id;

    const resourceResult = await db.insert(resourcesTable)
      .values(testResource)
      .returning()
      .execute();
    const resourceId = resourceResult[0].id;

    const challengeResult = await db.insert(challengesTable)
      .values({
        ...testChallenge,
        tutorial_id: tutorialId
      })
      .returning()
      .execute();
    const challengeId = challengeResult[0].id;

    // Create progress record
    await db.insert(userProgressTable)
      .values({
        user_id: userId,
        tutorial_id: tutorialId,
        roadmap_id: null,
        progress_percentage: 75.5,
        completed_nodes: ['node1', 'node2']
      })
      .execute();

    // Create chat message
    await db.insert(chatMessagesTable)
      .values({
        user_id: userId,
        message: 'Hello',
        response: 'Hi there!',
        context_type: 'general',
        context_id: null
      })
      .execute();

    // Create download records
    await db.insert(userDownloadsTable)
      .values({
        user_id: userId,
        resource_id: resourceId,
        project_id: null
      })
      .execute();

    await db.insert(userDownloadsTable)
      .values({
        user_id: userId,
        resource_id: null,
        project_id: projectId
      })
      .execute();

    // Create points record
    await db.insert(userPointsTable)
      .values({
        user_id: userId,
        challenge_id: challengeId,
        points_earned: 100
      })
      .execute();

    // Create certificate
    await db.insert(certificatesTable)
      .values({
        user_id: userId,
        challenge_id: challengeId,
        certificate_url: 'https://example.com/cert.pdf'
      })
      .execute();

    const result = await getDashboardData(userId);

    // Verify user data
    expect(result.user.id).toEqual(userId);
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.full_name).toEqual('Test User');
    expect(result.user.subscription_plan).toEqual('free');
    expect(result.user.ai_queries_used_today).toEqual(5);

    // Verify progress data
    expect(result.progress).toHaveLength(1);
    expect(result.progress[0].tutorial_id).toEqual(tutorialId);
    expect(result.progress[0].progress_percentage).toEqual(75.5);
    expect(typeof result.progress[0].progress_percentage).toEqual('number');
    expect(result.progress[0].completed_nodes).toEqual(['node1', 'node2']);

    // Verify chat messages count
    expect(result.recentChatMessages).toEqual(1);

    // Verify download history
    expect(result.downloadHistory).toHaveLength(2);
    expect(result.downloadHistory.some(d => d.title === 'Test Resource' && d.type === 'resource')).toBe(true);
    expect(result.downloadHistory.some(d => d.title === 'Test Project' && d.type === 'project')).toBe(true);

    // Verify user rank
    expect(result.userRank.totalPoints).toEqual(100);
    expect(result.userRank.weeklyPoints).toEqual(100);
    expect(result.userRank.rank).toBeGreaterThan(0);

    // Verify certificates
    expect(result.certificates).toHaveLength(1);
    expect(result.certificates[0].certificate_url).toEqual('https://example.com/cert.pdf');
  });

  it('should handle user with no data', async () => {
    // Create user with no additional data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await getDashboardData(userId);

    expect(result.user.id).toEqual(userId);
    expect(result.progress).toHaveLength(0);
    expect(result.recentChatMessages).toEqual(0);
    expect(result.downloadHistory).toHaveLength(0);
    expect(result.userRank.totalPoints).toEqual(0);
    expect(result.userRank.weeklyPoints).toEqual(0);
    expect(result.certificates).toHaveLength(0);
  });

  it('should throw error for non-existent user', async () => {
    await expect(getDashboardData(999)).rejects.toThrow(/user not found/i);
  });
});

describe('getAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get complete analytics data', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create tutorials
    const tutorial1Result = await db.insert(tutorialsTable)
      .values({
        ...testTutorial,
        title: 'Popular Tutorial 1',
        slug: 'popular-tutorial-1',
        views_count: 200
      })
      .returning()
      .execute();

    const tutorial2Result = await db.insert(tutorialsTable)
      .values({
        ...testTutorial,
        title: 'Popular Tutorial 2',
        slug: 'popular-tutorial-2',
        views_count: 150
      })
      .returning()
      .execute();

    // Create projects
    const project1Result = await db.insert(projectsTable)
      .values({
        ...testProject,
        title: 'Popular Project 1',
        slug: 'popular-project-1',
        download_count: 100
      })
      .returning()
      .execute();

    const project2Result = await db.insert(projectsTable)
      .values({
        ...testProject,
        title: 'Popular Project 2',
        slug: 'popular-project-2',
        download_count: 75
      })
      .returning()
      .execute();

    // Create resource
    const resourceResult = await db.insert(resourcesTable)
      .values(testResource)
      .returning()
      .execute();
    const resourceId = resourceResult[0].id;

    // Create download records
    await db.insert(userDownloadsTable)
      .values({
        user_id: user1Id,
        resource_id: resourceId,
        project_id: null
      })
      .execute();

    await db.insert(userDownloadsTable)
      .values({
        user_id: user2Id,
        resource_id: null,
        project_id: project1Result[0].id
      })
      .execute();

    // Create chat messages
    await db.insert(chatMessagesTable)
      .values({
        user_id: user1Id,
        message: 'Hello',
        response: 'Hi!',
        context_type: 'general',
        context_id: null
      })
      .execute();

    const result = await getAnalytics();

    // Verify analytics data
    expect(result.total_users).toEqual(2);
    expect(result.pro_users).toEqual(1);
    expect(result.total_downloads).toEqual(2);
    expect(result.total_ai_queries).toEqual(15); // 5 + 10 from test users

    // Verify popular tutorials
    expect(result.popular_tutorials).toHaveLength(2);
    expect(result.popular_tutorials[0].title).toEqual('Popular Tutorial 1');
    expect(result.popular_tutorials[0].views).toEqual(200);
    expect(result.popular_tutorials[1].title).toEqual('Popular Tutorial 2');
    expect(result.popular_tutorials[1].views).toEqual(150);

    // Verify popular projects
    expect(result.popular_projects).toHaveLength(2);
    expect(result.popular_projects[0].title).toEqual('Popular Project 1');
    expect(result.popular_projects[0].downloads).toEqual(100);
    expect(result.popular_projects[1].title).toEqual('Popular Project 2');
    expect(result.popular_projects[1].downloads).toEqual(75);
  });

  it('should handle empty database', async () => {
    const result = await getAnalytics();

    expect(result.total_users).toEqual(0);
    expect(result.pro_users).toEqual(0);
    expect(result.total_downloads).toEqual(0);
    expect(result.total_ai_queries).toEqual(0);
    expect(result.daily_active_users).toEqual(0);
    expect(result.popular_tutorials).toHaveLength(0);
    expect(result.popular_projects).toHaveLength(0);
  });
});


import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tutorialsTable, projectsTable, resourcesTable, challengesTable, userDownloadsTable } from '../db/schema';
import { grantProAccess, revokeProAccess, getDetailedAnalytics, moderateContent } from '../handlers/admin';
import { eq } from 'drizzle-orm';

describe('Admin handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('grantProAccess', () => {
    it('should grant pro access to a user', async () => {
      // Create a test user
      const [user] = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashed_password',
          full_name: 'Test User',
          subscription_plan: 'free'
        })
        .returning()
        .execute();

      const result = await grantProAccess(user.id, 30);

      expect(result.success).toBe(true);

      // Verify user was updated
      const [updatedUser] = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(updatedUser.subscription_plan).toBe('pro');
      expect(updatedUser.subscription_expires_at).toBeInstanceOf(Date);
      expect(updatedUser.updated_at).toBeInstanceOf(Date);

      // Verify expiration date is approximately 30 days from now
      const expectedExpiration = new Date();
      expectedExpiration.setDate(expectedExpiration.getDate() + 30);
      const timeDiff = Math.abs(
        updatedUser.subscription_expires_at!.getTime() - expectedExpiration.getTime()
      );
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute
    });
  });

  describe('revokeProAccess', () => {
    it('should revoke pro access from a user', async () => {
      // Create a test user with pro access
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 30);

      const [user] = await db.insert(usersTable)
        .values({
          email: 'pro@example.com',
          password_hash: 'hashed_password',
          full_name: 'Pro User',
          subscription_plan: 'pro',
          subscription_expires_at: expiration
        })
        .returning()
        .execute();

      const result = await revokeProAccess(user.id);

      expect(result.success).toBe(true);

      // Verify user was updated
      const [updatedUser] = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(updatedUser.subscription_plan).toBe('free');
      expect(updatedUser.subscription_expires_at).toBeNull();
      expect(updatedUser.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getDetailedAnalytics', () => {
    it('should return comprehensive analytics data', async () => {
      // Create test data
      const [freeUser] = await db.insert(usersTable)
        .values({
          email: 'free@example.com',
          password_hash: 'hashed_password',
          full_name: 'Free User',
          subscription_plan: 'free',
          ai_queries_used_today: 5
        })
        .returning()
        .execute();

      const [proUser] = await db.insert(usersTable)
        .values({
          email: 'pro@example.com',
          password_hash: 'hashed_password',
          full_name: 'Pro User',
          subscription_plan: 'pro',
          ai_queries_used_today: 15
        })
        .returning()
        .execute();

      const [tutorial] = await db.insert(tutorialsTable)
        .values({
          title: 'Test Tutorial',
          slug: 'test-tutorial',
          description: 'A tutorial for testing',
          content: 'Tutorial content goes here',
          tech_stack: ['javascript', 'react'],
          difficulty: 'beginner',
          estimated_time: 60,
          views_count: 100
        })
        .returning()
        .execute();

      const [project] = await db.insert(projectsTable)
        .values({
          title: 'Test Project',
          slug: 'test-project',
          description: 'A project for testing',
          tech_stack: ['typescript', 'node'],
          difficulty: 'intermediate',
          download_count: 50
        })
        .returning()
        .execute();

      const [resource] = await db.insert(resourcesTable)
        .values({
          title: 'Test Resource',
          description: 'A resource for testing',
          category: 'templates',
          file_url: 'https://example.com/file.zip',
          file_size: 1024,
          file_type: 'application/zip'
        })
        .returning()
        .execute();

      const [challenge] = await db.insert(challengesTable)
        .values({
          title: 'Test Challenge',
          description: 'A challenge for testing',
          type: 'tutorial',
          points_reward: 100,
          start_date: new Date(),
          end_date: new Date(Date.now() + 86400000) // 1 day from now
        })
        .returning()
        .execute();

      // Create some download records
      await db.insert(userDownloadsTable)
        .values([
          { user_id: freeUser.id, resource_id: resource.id },
          { user_id: proUser.id, project_id: project.id }
        ])
        .execute();

      const result = await getDetailedAnalytics();

      // Verify basic analytics
      expect(result.total_users).toBe(2);
      expect(result.pro_users).toBe(1);
      expect(result.total_downloads).toBe(2);
      expect(result.total_ai_queries).toBe(20); // 5 + 15
      expect(result.daily_active_users).toBeGreaterThanOrEqual(0);

      // Verify popular content arrays
      expect(Array.isArray(result.popular_tutorials)).toBe(true);
      expect(Array.isArray(result.popular_projects)).toBe(true);

      // Verify extended analytics
      expect(Array.isArray(result.userGrowth)).toBe(true);
      expect(result.userGrowth.length).toBe(30); // 30 days of data
      expect(result.userGrowth[0]).toHaveProperty('date');
      expect(result.userGrowth[0]).toHaveProperty('users');

      expect(Array.isArray(result.revenueData)).toBe(true);
      expect(result.revenueData.length).toBeGreaterThan(0);
      expect(result.revenueData[0]).toHaveProperty('month');
      expect(result.revenueData[0]).toHaveProperty('revenue');

      // Verify content stats
      expect(result.contentStats.totalTutorials).toBe(1);
      expect(result.contentStats.totalProjects).toBe(1);
      expect(result.contentStats.totalResources).toBe(1);
      expect(result.contentStats.totalChallenges).toBe(1);
    });

    it('should handle empty database gracefully', async () => {
      const result = await getDetailedAnalytics();

      expect(result.total_users).toBe(0);
      expect(result.pro_users).toBe(0);
      expect(result.total_downloads).toBe(0);
      expect(result.total_ai_queries).toBe(0);
      expect(result.daily_active_users).toBe(0);
      expect(result.popular_tutorials).toEqual([]);
      expect(result.popular_projects).toEqual([]);
      expect(result.userGrowth).toHaveLength(30);
      expect(result.contentStats.totalTutorials).toBe(0);
      expect(result.contentStats.totalProjects).toBe(0);
      expect(result.contentStats.totalResources).toBe(0);
      expect(result.contentStats.totalChallenges).toBe(0);
    });
  });

  describe('moderateContent', () => {
    it('should moderate tutorial content', async () => {
      const [tutorial] = await db.insert(tutorialsTable)
        .values({
          title: 'Tutorial to Moderate',
          slug: 'tutorial-to-moderate',
          description: 'A tutorial that needs moderation',
          content: 'Tutorial content',
          tech_stack: ['javascript'],
          difficulty: 'beginner',
          estimated_time: 30
        })
        .returning()
        .execute();

      const originalUpdatedAt = tutorial.updated_at;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await moderateContent(tutorial.id, 'tutorial', 'approve');

      expect(result.success).toBe(true);

      // Verify the tutorial was updated
      const [updatedTutorial] = await db.select()
        .from(tutorialsTable)
        .where(eq(tutorialsTable.id, tutorial.id))
        .execute();

      expect(updatedTutorial.updated_at).toBeInstanceOf(Date);
      expect(updatedTutorial.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should moderate project content', async () => {
      const [project] = await db.insert(projectsTable)
        .values({
          title: 'Project to Moderate',
          slug: 'project-to-moderate',
          description: 'A project that needs moderation',
          tech_stack: ['react'],
          difficulty: 'intermediate'
        })
        .returning()
        .execute();

      const result = await moderateContent(project.id, 'project', 'reject');

      expect(result.success).toBe(true);

      // Verify the project was updated
      const [updatedProject] = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.id, project.id))
        .execute();

      expect(updatedProject.updated_at).toBeInstanceOf(Date);
    });

    it('should moderate resource content', async () => {
      const [resource] = await db.insert(resourcesTable)
        .values({
          title: 'Resource to Moderate',
          description: 'A resource that needs moderation',
          category: 'templates',
          file_url: 'https://example.com/resource.zip',
          file_size: 2048,
          file_type: 'application/zip'
        })
        .returning()
        .execute();

      const result = await moderateContent(resource.id, 'resource', 'approve');

      expect(result.success).toBe(true);

      // Verify the resource was updated
      const [updatedResource] = await db.select()
        .from(resourcesTable)
        .where(eq(resourcesTable.id, resource.id))
        .execute();

      expect(updatedResource.updated_at).toBeInstanceOf(Date);
    });
  });
});

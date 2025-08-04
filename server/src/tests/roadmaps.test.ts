
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { roadmapsTable, usersTable, userProgressTable, tutorialsTable } from '../db/schema';
import { type CreateRoadmapInput, type UpdateProgressInput } from '../schema';
import { createRoadmap, getRoadmaps, getRoadmapById, updateUserProgress, getUserProgress } from '../handlers/roadmaps';
import { eq } from 'drizzle-orm';

// Test data
const testRoadmapInput: CreateRoadmapInput = {
  title: 'Full Stack Development',
  description: 'Complete roadmap for becoming a full stack developer',
  category: 'web-development',
  nodes: [
    {
      id: 'node-1',
      title: 'HTML Basics',
      description: 'Learn HTML fundamentals',
      tutorial_id: 1,
      project_id: null,
      position: { x: 100, y: 100 },
    },
    {
      id: 'node-2',
      title: 'CSS Styling',
      description: 'Master CSS styling',
      tutorial_id: 2,
      project_id: null,
      position: { x: 200, y: 200 },
    },
  ],
};

const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
};

const testTutorial = {
  title: 'Test Tutorial',
  slug: 'test-tutorial',
  description: 'A tutorial for testing',
  content: 'This is test tutorial content for testing purposes',
  tech_stack: ['javascript', 'html'],
  difficulty: 'beginner' as const,
  estimated_time: 60,
};

describe('Roadmap handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createRoadmap', () => {
    it('should create a roadmap', async () => {
      const result = await createRoadmap(testRoadmapInput);

      expect(result.title).toEqual('Full Stack Development');
      expect(result.description).toEqual(testRoadmapInput.description);
      expect(result.category).toEqual('web-development');
      expect(result.nodes).toEqual(testRoadmapInput.nodes);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save roadmap to database', async () => {
      const result = await createRoadmap(testRoadmapInput);

      const roadmaps = await db.select()
        .from(roadmapsTable)
        .where(eq(roadmapsTable.id, result.id))
        .execute();

      expect(roadmaps).toHaveLength(1);
      expect(roadmaps[0].title).toEqual('Full Stack Development');
      expect(roadmaps[0].category).toEqual('web-development');
      expect(roadmaps[0].nodes).toEqual(testRoadmapInput.nodes);
    });

    it('should handle roadmaps with complex node structures', async () => {
      const complexInput: CreateRoadmapInput = {
        title: 'Data Science Path',
        description: 'Comprehensive data science learning path',
        category: 'data-science',
        nodes: [
          {
            id: 'ds-1',
            title: 'Python Basics',
            description: 'Learn Python programming',
            tutorial_id: null,
            project_id: 1,
            position: { x: 0, y: 0 },
          },
          {
            id: 'ds-2',
            title: 'Statistics',
            description: 'Statistics fundamentals',
            tutorial_id: 5,
            project_id: null,
            position: { x: 150, y: 75 },
          },
        ],
      };

      const result = await createRoadmap(complexInput);

      expect(result.nodes).toEqual(complexInput.nodes);
      expect(result.nodes[0].project_id).toEqual(1);
      expect(result.nodes[1].tutorial_id).toEqual(5);
    });
  });

  describe('getRoadmaps', () => {
    it('should return empty array when no roadmaps exist', async () => {
      const result = await getRoadmaps();
      expect(result).toEqual([]);
    });

    it('should return all roadmaps', async () => {
      await createRoadmap(testRoadmapInput);
      await createRoadmap({
        ...testRoadmapInput,
        title: 'Mobile Development',
        category: 'mobile',
      });

      const result = await getRoadmaps();

      expect(result).toHaveLength(2);
      expect(result[0].title).toEqual('Full Stack Development');
      expect(result[1].title).toEqual('Mobile Development');
    });
  });

  describe('getRoadmapById', () => {
    it('should return null for non-existent roadmap', async () => {
      const result = await getRoadmapById(999);
      expect(result).toBeNull();
    });

    it('should return roadmap by id', async () => {
      const created = await createRoadmap(testRoadmapInput);
      const result = await getRoadmapById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.title).toEqual('Full Stack Development');
      expect(result!.nodes).toEqual(testRoadmapInput.nodes);
    });
  });

  describe('updateUserProgress', () => {
    let userId: number;
    let roadmapId: number;
    let tutorialId: number;

    beforeEach(async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      userId = userResult[0].id;

      // Create test roadmap
      const roadmapResult = await createRoadmap(testRoadmapInput);
      roadmapId = roadmapResult.id;

      // Create test tutorial for foreign key constraint
      const tutorialResult = await db.insert(tutorialsTable)
        .values(testTutorial)
        .returning()
        .execute();
      tutorialId = tutorialResult[0].id;
    });

    it('should create new progress record', async () => {
      const progressInput: UpdateProgressInput = {
        roadmap_id: roadmapId,
        progress_percentage: 25,
        completed_nodes: ['node-1'],
      };

      const result = await updateUserProgress(userId, progressInput);

      expect(result.user_id).toEqual(userId);
      expect(result.roadmap_id).toEqual(roadmapId);
      expect(result.progress_percentage).toEqual(25);
      expect(result.completed_nodes).toEqual(['node-1']);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update existing progress record', async () => {
      // Create initial progress
      await updateUserProgress(userId, {
        roadmap_id: roadmapId,
        progress_percentage: 25,
        completed_nodes: ['node-1'],
      });

      // Update progress
      const result = await updateUserProgress(userId, {
        roadmap_id: roadmapId,
        progress_percentage: 75,
        completed_nodes: ['node-1', 'node-2'],
      });

      expect(result.progress_percentage).toEqual(75);
      expect(result.completed_nodes).toEqual(['node-1', 'node-2']);

      // Verify only one record exists
      const allProgress = await db.select()
        .from(userProgressTable)
        .where(eq(userProgressTable.user_id, userId))
        .execute();

      expect(allProgress).toHaveLength(1);
    });

    it('should handle tutorial progress', async () => {
      const progressInput: UpdateProgressInput = {
        tutorial_id: tutorialId,
        progress_percentage: 50,
        completed_nodes: [],
      };

      const result = await updateUserProgress(userId, progressInput);

      expect(result.tutorial_id).toEqual(tutorialId);
      expect(result.roadmap_id).toBeNull();
      expect(result.progress_percentage).toEqual(50);
    });

    it('should throw error for non-existent user', async () => {
      const progressInput: UpdateProgressInput = {
        roadmap_id: roadmapId,
        progress_percentage: 25,
      };

      expect(updateUserProgress(999, progressInput)).rejects.toThrow(/user not found/i);
    });
  });

  describe('getUserProgress', () => {
    let userId: number;
    let roadmapId: number;
    let tutorialId: number;

    beforeEach(async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      userId = userResult[0].id;

      // Create test roadmap
      const roadmapResult = await createRoadmap(testRoadmapInput);
      roadmapId = roadmapResult.id;

      // Create test tutorial for foreign key constraint
      const tutorialResult = await db.insert(tutorialsTable)
        .values(testTutorial)
        .returning()
        .execute();
      tutorialId = tutorialResult[0].id;
    });

    it('should return empty array for user with no progress', async () => {
      const result = await getUserProgress(userId);
      expect(result).toEqual([]);
    });

    it('should return all progress records for user', async () => {
      // Create multiple progress records
      await updateUserProgress(userId, {
        roadmap_id: roadmapId,
        progress_percentage: 25,
        completed_nodes: ['node-1'],
      });

      await updateUserProgress(userId, {
        tutorial_id: tutorialId,
        progress_percentage: 100,
        completed_nodes: [],
      });

      const result = await getUserProgress(userId);

      expect(result).toHaveLength(2);
      expect(result[0].roadmap_id).toEqual(roadmapId);
      expect(result[0].progress_percentage).toEqual(25);
      expect(result[1].tutorial_id).toEqual(tutorialId);
      expect(result[1].progress_percentage).toEqual(100);
    });

    it('should throw error for non-existent user', async () => {
      expect(getUserProgress(999)).rejects.toThrow(/user not found/i);
    });

    it('should handle numeric conversion for progress percentage', async () => {
      await updateUserProgress(userId, {
        roadmap_id: roadmapId,
        progress_percentage: 33.5,
        completed_nodes: ['node-1'],
      });

      const result = await getUserProgress(userId);

      expect(result).toHaveLength(1);
      expect(typeof result[0].progress_percentage).toBe('number');
      expect(result[0].progress_percentage).toEqual(33.5);
    });
  });
});

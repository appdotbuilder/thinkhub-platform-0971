
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { challengesTable, usersTable, tutorialsTable, projectsTable, userPointsTable, certificatesTable } from '../db/schema';
import { type CreateChallengeInput } from '../schema';
import { 
  createChallenge, 
  getActiveChallenges, 
  participateInChallenge, 
  getLeaderboard, 
  getUserRank,
  issueCertificate 
} from '../handlers/challenges';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  subscription_plan: 'free' as const,
  ai_queries_used_today: 0
};

const testTutorial = {
  title: 'Test Tutorial',
  slug: 'test-tutorial',
  description: 'A tutorial for testing',
  content: 'Tutorial content here',
  tech_stack: ['javascript', 'react'],
  difficulty: 'beginner' as const,
  estimated_time: 60,
  thumbnail_url: 'https://example.com/thumb.jpg',
  is_pro: false,
  likes_count: 0,
  views_count: 0
};

const testProject = {
  title: 'Test Project',
  slug: 'test-project',
  description: 'A project for testing',
  tech_stack: ['javascript', 'node'],
  difficulty: 'intermediate' as const,
  preview_image_url: 'https://example.com/preview.jpg',
  demo_url: 'https://example.com/demo',
  github_url: 'https://github.com/test/project',
  guide_pdf_url: 'https://example.com/guide.pdf',
  is_pro: false,
  download_count: 0
};

const createTestChallenge = (tutorialId?: number, projectId?: number): CreateChallengeInput => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  
  return {
    title: 'Weekly Challenge',
    description: 'Complete this challenge to earn points',
    type: 'tutorial' as const,
    points_reward: 100,
    tutorial_id: tutorialId || null,
    project_id: projectId || null,
    quiz_data: null,
    start_date: now,
    end_date: futureDate
  };
};

describe('Challenges', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createChallenge', () => {
    it('should create a challenge with tutorial reference', async () => {
      // Create prerequisite tutorial
      const tutorialResult = await db.insert(tutorialsTable)
        .values(testTutorial)
        .returning()
        .execute();
      const tutorialId = tutorialResult[0].id;

      const input = createTestChallenge(tutorialId);
      const result = await createChallenge(input);

      expect(result.title).toEqual('Weekly Challenge');
      expect(result.description).toEqual(input.description);
      expect(result.type).toEqual('tutorial');
      expect(result.points_reward).toEqual(100);
      expect(result.tutorial_id).toEqual(tutorialId);
      expect(result.project_id).toBeNull();
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a challenge with project reference', async () => {
      // Create prerequisite project
      const projectResult = await db.insert(projectsTable)
        .values(testProject)
        .returning()
        .execute();
      const projectId = projectResult[0].id;

      const input = createTestChallenge(undefined, projectId);
      const result = await createChallenge(input);

      expect(result.title).toEqual('Weekly Challenge');
      expect(result.project_id).toEqual(projectId);
      expect(result.tutorial_id).toBeNull();
    });

    it('should create a challenge with quiz data', async () => {
      const quizData = {
        questions: [
          { question: 'What is React?', options: ['Library', 'Framework'], answer: 0 }
        ]
      };

      const input: CreateChallengeInput = {
        ...createTestChallenge(),
        type: 'quiz',
        quiz_data: quizData
      };

      const result = await createChallenge(input);

      expect(result.type).toEqual('quiz');
      expect(result.quiz_data).toEqual(quizData);
    });

    it('should save challenge to database', async () => {
      const input = createTestChallenge();
      const result = await createChallenge(input);

      const challenges = await db.select()
        .from(challengesTable)
        .where(eq(challengesTable.id, result.id))
        .execute();

      expect(challenges).toHaveLength(1);
      expect(challenges[0].title).toEqual('Weekly Challenge');
      expect(challenges[0].points_reward).toEqual(100);
    });

    it('should throw error for invalid tutorial reference', async () => {
      const input = createTestChallenge(999);

      await expect(createChallenge(input)).rejects.toThrow(/Tutorial with id 999 does not exist/i);
    });

    it('should throw error for invalid project reference', async () => {
      const input = createTestChallenge(undefined, 999);

      await expect(createChallenge(input)).rejects.toThrow(/Project with id 999 does not exist/i);
    });
  });

  describe('getActiveChallenges', () => {
    it('should return active challenges within date range', async () => {
      // Create an active challenge
      const activeInput = createTestChallenge();
      await createChallenge(activeInput);

      // Create an inactive challenge (past dates)
      const pastDate = new Date('2023-01-01');
      const pastEndDate = new Date('2023-01-31');
      const inactiveInput: CreateChallengeInput = {
        ...createTestChallenge(),
        title: 'Inactive Challenge',
        start_date: pastDate,
        end_date: pastEndDate
      };
      await createChallenge(inactiveInput);

      const results = await getActiveChallenges();

      expect(results).toHaveLength(1);
      expect(results[0].title).toEqual('Weekly Challenge');
      expect(results[0].is_active).toBe(true);
    });

    it('should return empty array when no active challenges', async () => {
      const results = await getActiveChallenges();
      expect(results).toHaveLength(0);
    });

    it('should order challenges by creation date descending', async () => {
      // Create multiple active challenges with slight delay
      const challenge1 = createTestChallenge();
      challenge1.title = 'First Challenge';
      await createChallenge(challenge1);

      // Small delay to ensure different creation times
      await new Promise(resolve => setTimeout(resolve, 10));

      const challenge2 = createTestChallenge();
      challenge2.title = 'Second Challenge';
      await createChallenge(challenge2);

      const results = await getActiveChallenges();

      expect(results).toHaveLength(2);
      expect(results[0].title).toEqual('Second Challenge'); // More recent first
      expect(results[1].title).toEqual('First Challenge');
    });
  });

  describe('participateInChallenge', () => {
    it('should allow user to participate in active challenge', async () => {
      // Create user and challenge
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const userId = userResult[0].id;

      const challengeResult = await createChallenge(createTestChallenge());
      const challengeId = challengeResult.id;

      const result = await participateInChallenge(userId, challengeId);

      expect(result.success).toBe(true);
      expect(result.pointsEarned).toEqual(100);

      // Verify points were recorded
      const points = await db.select()
        .from(userPointsTable)
        .where(
          and(
            eq(userPointsTable.user_id, userId),
            eq(userPointsTable.challenge_id, challengeId)
          )
        )
        .execute();

      expect(points).toHaveLength(1);
      expect(points[0].points_earned).toEqual(100);
    });

    it('should throw error for non-existent user', async () => {
      const challengeResult = await createChallenge(createTestChallenge());

      await expect(participateInChallenge(999, challengeResult.id))
        .rejects.toThrow(/User with id 999 does not exist/i);
    });

    it('should throw error for non-existent challenge', async () => {
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      await expect(participateInChallenge(userResult[0].id, 999))
        .rejects.toThrow(/Challenge with id 999 does not exist/i);
    });

    it('should throw error for inactive challenge', async () => {
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const pastDate = new Date('2023-01-01');
      const pastEndDate = new Date('2023-01-31');
      const inactiveChallenge: CreateChallengeInput = {
        ...createTestChallenge(),
        start_date: pastDate,
        end_date: pastEndDate
      };
      const challengeResult = await createChallenge(inactiveChallenge);

      await expect(participateInChallenge(userResult[0].id, challengeResult.id))
        .rejects.toThrow(/Challenge is not currently active/i);
    });

    it('should prevent duplicate participation', async () => {
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const userId = userResult[0].id;

      const challengeResult = await createChallenge(createTestChallenge());
      const challengeId = challengeResult.id;

      // First participation should succeed
      await participateInChallenge(userId, challengeId);

      // Second participation should fail
      await expect(participateInChallenge(userId, challengeId))
        .rejects.toThrow(/User has already participated in this challenge/i);
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard with user rankings', async () => {
      // Create users
      const user1Result = await db.insert(usersTable)
        .values({ ...testUser, full_name: 'User One' })
        .returning()
        .execute();
      const user1Id = user1Result[0].id;

      const user2Result = await db.insert(usersTable)
        .values({ ...testUser, email: 'user2@example.com', full_name: 'User Two' })
        .returning()
        .execute();
      const user2Id = user2Result[0].id;

      // Create challenge
      const challengeResult = await createChallenge(createTestChallenge());
      const challengeId = challengeResult.id;

      // User 1 participates (100 points)
      await participateInChallenge(user1Id, challengeId);

      // Create another challenge for user 2
      const challenge2Input = createTestChallenge();
      challenge2Input.title = 'Second Challenge';
      challenge2Input.points_reward = 200;
      const challenge2Result = await createChallenge(challenge2Input);

      // User 2 participates (200 points)
      await participateInChallenge(user2Id, challenge2Result.id);

      const leaderboard = await getLeaderboard();

      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].user_name).toEqual('User Two'); // Higher points first
      expect(leaderboard[0].total_points).toEqual(200);
      expect(leaderboard[0].rank).toEqual(1);
      expect(leaderboard[1].user_name).toEqual('User One');
      expect(leaderboard[1].total_points).toEqual(100);
      expect(leaderboard[1].rank).toEqual(2);
    });

    it('should return empty leaderboard when no user points exist', async () => {
      const leaderboard = await getLeaderboard();
      expect(leaderboard).toHaveLength(0);
    });

    it('should assign badges based on total points', async () => {
      // Create user with high points
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const userId = userResult[0].id;

      // Create multiple challenges to reach high achiever status
      for (let i = 0; i < 11; i++) {
        const challengeInput = createTestChallenge();
        challengeInput.title = `Challenge ${i}`;
        challengeInput.points_reward = 100;
        const challenge = await createChallenge(challengeInput);
        await participateInChallenge(userId, challenge.id);
      }

      const leaderboard = await getLeaderboard();

      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].total_points).toEqual(1100);
      expect(leaderboard[0].badges).toContain('high_achiever');
    });
  });

  describe('getUserRank', () => {
    it('should return user rank and points', async () => {
      // Create users
      const user1Result = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const user1Id = user1Result[0].id;

      const user2Result = await db.insert(usersTable)
        .values({ ...testUser, email: 'user2@example.com' })
        .returning()
        .execute();
      const user2Id = user2Result[0].id;

      // Create challenges and participation
      const challenge1 = await createChallenge(createTestChallenge());
      await participateInChallenge(user1Id, challenge1.id); // 100 points

      const challenge2Input = createTestChallenge();
      challenge2Input.points_reward = 200;
      const challenge2 = await createChallenge(challenge2Input);
      await participateInChallenge(user2Id, challenge2.id); // 200 points

      // User 1 should be rank 2 (user 2 has more points)
      const user1Rank = await getUserRank(user1Id);
      expect(user1Rank.rank).toEqual(2);
      expect(user1Rank.totalPoints).toEqual(100);
      expect(typeof user1Rank.weeklyPoints).toEqual('number');

      // User 2 should be rank 1
      const user2Rank = await getUserRank(user2Id);
      expect(user2Rank.rank).toEqual(1);
      expect(user2Rank.totalPoints).toEqual(200);
    });

    it('should return rank 1 for user with no points', async () => {
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      const rank = await getUserRank(userResult[0].id);

      expect(rank.rank).toEqual(1);
      expect(rank.totalPoints).toEqual(0);
      expect(rank.weeklyPoints).toEqual(0);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getUserRank(999)).rejects.toThrow(/User with id 999 does not exist/i);
    });
  });

  describe('issueCertificate', () => {
    it('should issue certificate for challenge participant', async () => {
      // Create user and challenge
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const userId = userResult[0].id;

      const challengeResult = await createChallenge(createTestChallenge());
      const challengeId = challengeResult.id;

      // User participates in challenge
      await participateInChallenge(userId, challengeId);

      // Issue certificate
      const certificate = await issueCertificate(userId, challengeId);

      expect(certificate.user_id).toEqual(userId);
      expect(certificate.challenge_id).toEqual(challengeId);
      expect(certificate.certificate_url).toContain(`challenge-${challengeId}-user-${userId}`);
      expect(certificate.issued_at).toBeInstanceOf(Date);
      expect(certificate.id).toBeDefined();
    });

    it('should return existing certificate if already issued', async () => {
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const userId = userResult[0].id;

      const challengeResult = await createChallenge(createTestChallenge());
      const challengeId = challengeResult.id;

      await participateInChallenge(userId, challengeId);

      // Issue certificate twice
      const certificate1 = await issueCertificate(userId, challengeId);
      const certificate2 = await issueCertificate(userId, challengeId);

      expect(certificate1.id).toEqual(certificate2.id);
      expect(certificate1.certificate_url).toEqual(certificate2.certificate_url);
    });

    it('should throw error for non-existent user', async () => {
      const challengeResult = await createChallenge(createTestChallenge());

      await expect(issueCertificate(999, challengeResult.id))
        .rejects.toThrow(/User with id 999 does not exist/i);
    });

    it('should throw error for non-existent challenge', async () => {
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();

      await expect(issueCertificate(userResult[0].id, 999))
        .rejects.toThrow(/Challenge with id 999 does not exist/i);
    });

    it('should throw error for non-participant', async () => {
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const challengeResult = await createChallenge(createTestChallenge());

      await expect(issueCertificate(userResult[0].id, challengeResult.id))
        .rejects.toThrow(/User has not participated in this challenge/i);
    });
  });
});

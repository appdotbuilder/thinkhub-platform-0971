
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, chatMessagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage, getChatHistory, checkAIUsageLimit, generateTutorialSummary } from '../handlers/ai_tutor';
import { eq } from 'drizzle-orm';

describe('AI Tutor Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('sendMessage', () => {
    it('should send a message and store chat history', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashed_password',
          full_name: 'Test User',
          subscription_plan: 'free',
          ai_queries_used_today: 5
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      const input: SendMessageInput = {
        message: 'How do I implement a React component?',
        context_type: 'tutorial',
        context_id: 1
      };

      const result = await sendMessage(userId, input);

      // Verify message structure
      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(userId);
      expect(result.message).toEqual(input.message);
      expect(result.response).toContain('tutorial content');
      expect(result.context_type).toEqual('tutorial');
      expect(result.context_id).toEqual(1);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should increment user AI query count', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashed_password',
          full_name: 'Test User',
          subscription_plan: 'free',
          ai_queries_used_today: 3
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      const input: SendMessageInput = {
        message: 'Help me understand JavaScript closures',
        context_type: 'general',
        context_id: null
      };

      await sendMessage(userId, input);

      // Check that query count was incremented
      const updatedUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(updatedUsers[0].ai_queries_used_today).toEqual(4);
    });

    it('should generate different responses based on context type', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashed_password',
          full_name: 'Test User',
          subscription_plan: 'free',
          ai_queries_used_today: 0
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      // Test project context
      const projectInput: SendMessageInput = {
        message: 'How do I deploy this project?',
        context_type: 'project',
        context_id: 1
      };

      const projectResult = await sendMessage(userId, projectInput);
      expect(projectResult.response).toContain('project');

      // Test general context
      const generalInput: SendMessageInput = {
        message: 'What is machine learning?',
        context_type: 'general',
        context_id: null
      };

      const generalResult = await sendMessage(userId, generalInput);
      expect(generalResult.response).toContain('coding questions');
    });

    it('should throw error when daily limit exceeded', async () => {
      // Create user at daily limit
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashed_password',
          full_name: 'Test User',
          subscription_plan: 'free',
          ai_queries_used_today: 10 // At free tier limit
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      const input: SendMessageInput = {
        message: 'This should fail',
        context_type: 'general',
        context_id: null
      };

      await expect(sendMessage(userId, input)).rejects.toThrow(/daily.*limit.*exceeded/i);
    });

    it('should throw error for non-existent user', async () => {
      const input: SendMessageInput = {
        message: 'Test message',
        context_type: 'general',
        context_id: null
      };

      await expect(sendMessage(999, input)).rejects.toThrow(/user not found/i);
    });
  });

  describe('getChatHistory', () => {
    it('should return chat history for user', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashed_password',
          full_name: 'Test User',
          subscription_plan: 'free',
          ai_queries_used_today: 0
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      // Create some chat messages
      await db.insert(chatMessagesTable)
        .values([
          {
            user_id: userId,
            message: 'First message',
            response: 'First response',
            context_type: 'general',
            context_id: null
          },
          {
            user_id: userId,
            message: 'Second message',
            response: 'Second response',
            context_type: 'tutorial',
            context_id: 1
          }
        ])
        .execute();

      const history = await getChatHistory(userId);

      expect(history).toHaveLength(2);
      expect(history[0].user_id).toEqual(userId);
      expect(history[1].user_id).toEqual(userId);
      
      // Should be ordered by most recent first
      expect(history[0].created_at >= history[1].created_at).toBe(true);
    });

    it('should return empty array for user with no chat history', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashed_password',
          full_name: 'Test User',
          subscription_plan: 'free',
          ai_queries_used_today: 0
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      const history = await getChatHistory(userId);

      expect(history).toHaveLength(0);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getChatHistory(999)).rejects.toThrow(/user not found/i);
    });
  });

  describe('checkAIUsageLimit', () => {
    it('should return correct limits for free user', async () => {
      // Create free user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashed_password',
          full_name: 'Test User',
          subscription_plan: 'free',
          ai_queries_used_today: 5
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      const usage = await checkAIUsageLimit(userId);

      expect(usage.canUse).toBe(true);
      expect(usage.queriesUsed).toEqual(5);
      expect(usage.limit).toEqual(10);
    });

    it('should return correct limits for pro user', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      // Create pro user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'pro@example.com',
          password_hash: 'hashed_password',
          full_name: 'Pro User',
          subscription_plan: 'pro',
          subscription_expires_at: futureDate,
          ai_queries_used_today: 25
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      const usage = await checkAIUsageLimit(userId);

      expect(usage.canUse).toBe(true);
      expect(usage.queriesUsed).toEqual(25);
      expect(usage.limit).toEqual(100);
    });

    it('should return false when user hits limit', async () => {
      // Create user at limit
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashed_password',
          full_name: 'Test User',
          subscription_plan: 'free',
          ai_queries_used_today: 10
        })
        .returning()
        .execute();

      const userId = userResult[0].id;

      const usage = await checkAIUsageLimit(userId);

      expect(usage.canUse).toBe(false);
      expect(usage.queriesUsed).toEqual(10);
      expect(usage.limit).toEqual(10);
    });

    it('should throw error for non-existent user', async () => {
      await expect(checkAIUsageLimit(999)).rejects.toThrow(/user not found/i);
    });
  });

  describe('generateTutorialSummary', () => {
    it('should generate tutorial summary', async () => {
      const result = await generateTutorialSummary(1);

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(50);
      
      expect(result.keyPoints).toBeDefined();
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(result.keyPoints.length).toBeGreaterThan(0);
      
      result.keyPoints.forEach(point => {
        expect(typeof point).toBe('string');
        expect(point.length).toBeGreaterThan(0);
      });
    });

    it('should handle any tutorial ID', async () => {
      const result1 = await generateTutorialSummary(1);
      const result2 = await generateTutorialSummary(999);

      expect(result1.summary).toBeDefined();
      expect(result2.summary).toBeDefined();
      expect(result1.keyPoints).toBeDefined();
      expect(result2.keyPoints).toBeDefined();
    });
  });
});

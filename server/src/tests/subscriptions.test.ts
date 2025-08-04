
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createSubscription, cancelSubscription, upgradeWinner, checkProAccess } from '../handlers/subscriptions';
import { type SubscriptionInput } from '../schema';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User'
};

describe('Subscription Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createSubscription', () => {
    it('should create monthly subscription and upgrade user to pro', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const userId = userResult[0].id;

      const subscriptionInput: SubscriptionInput = {
        plan: 'pro',
        duration: 'monthly',
        payment_method_id: 'pm_test_123'
      };

      const result = await createSubscription(userId, subscriptionInput);

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toMatch(/^sub_\d+_\d+$/);

      // Verify user was upgraded
      const updatedUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(updatedUser[0].subscription_plan).toBe('pro');
      expect(updatedUser[0].subscription_expires_at).toBeInstanceOf(Date);
      
      // Check that expiry is approximately 1 month from now
      const now = new Date();
      const expiryDate = updatedUser[0].subscription_expires_at!;
      const daysDiff = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(28);
      expect(daysDiff).toBeLessThanOrEqual(32);
    });

    it('should create annual subscription with correct expiry', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const userId = userResult[0].id;

      const subscriptionInput: SubscriptionInput = {
        plan: 'pro',
        duration: 'annual',
        payment_method_id: 'pm_test_123'
      };

      const result = await createSubscription(userId, subscriptionInput);

      expect(result.success).toBe(true);

      // Verify user was upgraded with annual expiry
      const updatedUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(updatedUser[0].subscription_plan).toBe('pro');
      
      // Check that expiry is approximately 1 year from now
      const now = new Date();
      const expiryDate = updatedUser[0].subscription_expires_at!;
      const daysDiff = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(360);
      expect(daysDiff).toBeLessThanOrEqual(370);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription and downgrade user to free', async () => {
      // Create test user with pro subscription
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const userResult = await db.insert(usersTable)
        .values({
          ...testUser,
          subscription_plan: 'pro',
          subscription_expires_at: expiryDate
        })
        .returning()
        .execute();
      const userId = userResult[0].id;

      const result = await cancelSubscription(userId);

      expect(result.success).toBe(true);

      // Verify user was downgraded
      const updatedUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(updatedUser[0].subscription_plan).toBe('free');
      expect(updatedUser[0].subscription_expires_at).toBeNull();
    });
  });

  describe('upgradeWinner', () => {
    it('should upgrade winner to pro with 30-day expiry', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const userId = userResult[0].id;

      const result = await upgradeWinner(userId);

      expect(result.id).toBe(userId);
      expect(result.subscription_plan).toBe('pro');
      expect(result.subscription_expires_at).toBeInstanceOf(Date);

      // Check that expiry is approximately 30 days from now
      const now = new Date();
      const expiryDate = result.subscription_expires_at!;
      const daysDiff = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });

    it('should throw error for non-existent user', async () => {
      const nonExistentUserId = 99999;

      await expect(upgradeWinner(nonExistentUserId)).rejects.toThrow(/user not found/i);
    });
  });

  describe('checkProAccess', () => {
    it('should return true for user with active pro subscription', async () => {
      // Create test user with future expiry
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const userResult = await db.insert(usersTable)
        .values({
          ...testUser,
          subscription_plan: 'pro',
          subscription_expires_at: futureDate
        })
        .returning()
        .execute();
      const userId = userResult[0].id;

      const result = await checkProAccess(userId);

      expect(result.hasProAccess).toBe(true);
      expect(result.expiresAt).toEqual(futureDate);
    });

    it('should return false for user with expired pro subscription', async () => {
      // Create test user with past expiry
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const userResult = await db.insert(usersTable)
        .values({
          ...testUser,
          subscription_plan: 'pro',
          subscription_expires_at: pastDate
        })
        .returning()
        .execute();
      const userId = userResult[0].id;

      const result = await checkProAccess(userId);

      expect(result.hasProAccess).toBe(false);
      expect(result.expiresAt).toEqual(pastDate);
    });

    it('should return false for free user', async () => {
      // Create test user with free plan
      const userResult = await db.insert(usersTable)
        .values(testUser)
        .returning()
        .execute();
      const userId = userResult[0].id;

      const result = await checkProAccess(userId);

      expect(result.hasProAccess).toBe(false);
      expect(result.expiresAt).toBeNull();
    });

    it('should return true for pro user with null expiry date', async () => {
      // Create test user with pro plan but no expiry (lifetime access)
      const userResult = await db.insert(usersTable)
        .values({
          ...testUser,
          subscription_plan: 'pro',
          subscription_expires_at: null
        })
        .returning()
        .execute();
      const userId = userResult[0].id;

      const result = await checkProAccess(userId);

      expect(result.hasProAccess).toBe(true);
      expect(result.expiresAt).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      const nonExistentUserId = 99999;

      await expect(checkProAccess(nonExistentUserId)).rejects.toThrow(/user not found/i);
    });
  });
});

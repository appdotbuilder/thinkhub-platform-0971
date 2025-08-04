
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type SubscriptionInput, type User } from '../schema';

export async function createSubscription(userId: number, input: SubscriptionInput): Promise<{ success: boolean; subscriptionId: string }> {
  try {
    // In a real implementation, this would integrate with Stripe or similar payment processor
    // For now, we'll simulate successful payment processing and upgrade the user
    
    // Calculate subscription expiry based on duration
    const now = new Date();
    const expiresAt = new Date(now);
    
    if (input.duration === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (input.duration === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Update user's subscription
    await db.update(usersTable)
      .set({
        subscription_plan: 'pro',
        subscription_expires_at: expiresAt,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    // Generate a mock subscription ID (in real app, this would come from payment processor)
    const subscriptionId = `sub_${userId}_${Date.now()}`;

    return {
      success: true,
      subscriptionId
    };
  } catch (error) {
    console.error('Subscription creation failed:', error);
    throw error;
  }
}

export async function cancelSubscription(userId: number): Promise<{ success: boolean }> {
  try {
    // Update user's subscription to free plan
    // In a real implementation, this might schedule the downgrade for the end of the billing period
    await db.update(usersTable)
      .set({
        subscription_plan: 'free',
        subscription_expires_at: null,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    return {
      success: true
    };
  } catch (error) {
    console.error('Subscription cancellation failed:', error);
    throw error;
  }
}

export async function upgradeWinner(userId: number): Promise<User> {
  try {
    // Set expiry to 30 days from now as a reward
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Update user to pro plan
    const result = await db.update(usersTable)
      .set({
        subscription_plan: 'pro',
        subscription_expires_at: expiresAt,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    return result[0];
  } catch (error) {
    console.error('Winner upgrade failed:', error);
    throw error;
  }
}

export async function checkProAccess(userId: number): Promise<{ hasProAccess: boolean; expiresAt: Date | null }> {
  try {
    const result = await db.select({
      subscription_plan: usersTable.subscription_plan,
      subscription_expires_at: usersTable.subscription_expires_at
    })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    const user = result[0];
    const now = new Date();
    
    // Check if user has pro plan and it hasn't expired
    const hasProAccess = user.subscription_plan === 'pro' && 
      (user.subscription_expires_at === null || user.subscription_expires_at > now);

    return {
      hasProAccess,
      expiresAt: user.subscription_expires_at
    };
  } catch (error) {
    console.error('Pro access check failed:', error);
    throw error;
  }
}

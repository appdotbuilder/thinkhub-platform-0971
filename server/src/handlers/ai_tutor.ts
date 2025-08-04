
import { db } from '../db';
import { chatMessagesTable, usersTable } from '../db/schema';
import { type SendMessageInput, type ChatMessage } from '../schema';
import { eq, desc, and, gte } from 'drizzle-orm';

export async function sendMessage(userId: number, input: SendMessageInput): Promise<ChatMessage> {
  try {
    // Check if user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Check daily usage limit
    const usageCheck = await checkAIUsageLimit(userId);
    if (!usageCheck.canUse) {
      throw new Error('Daily AI query limit exceeded');
    }

    // Generate AI response (placeholder logic)
    let aiResponse = 'I understand you want to learn more about this topic. ';
    
    if (input.context_type === 'tutorial') {
      aiResponse += 'Based on the tutorial content, here are some key insights and explanations that might help you understand better.';
    } else if (input.context_type === 'project') {
      aiResponse += 'For this project, I can help you with implementation details, best practices, and troubleshooting common issues.';
    } else {
      aiResponse += 'I\'m here to help with your coding questions and learning journey. Feel free to ask about any programming concepts!';
    }

    // Store chat message
    const result = await db.insert(chatMessagesTable)
      .values({
        user_id: userId,
        message: input.message,
        response: aiResponse,
        context_type: input.context_type,
        context_id: input.context_id
      })
      .returning()
      .execute();

    // Update user's daily AI query count
    await db.update(usersTable)
      .set({
        ai_queries_used_today: user.ai_queries_used_today + 1,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    return result[0];
  } catch (error) {
    console.error('Send message failed:', error);
    throw error;
  }
}

export async function getChatHistory(userId: number): Promise<ChatMessage[]> {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Get recent chat history (last 50 messages)
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.user_id, userId))
      .orderBy(desc(chatMessagesTable.created_at))
      .limit(50)
      .execute();

    return messages;
  } catch (error) {
    console.error('Get chat history failed:', error);
    throw error;
  }
}

export async function checkAIUsageLimit(userId: number): Promise<{ canUse: boolean; queriesUsed: number; limit: number }> {
  try {
    // Get user subscription info
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    
    // Determine limits based on subscription plan
    const isPro = user.subscription_plan === 'pro' && 
                  user.subscription_expires_at && 
                  user.subscription_expires_at > new Date();
    
    const dailyLimit = isPro ? 100 : 10; // Pro users get 100 queries, free users get 10
    const queriesUsed = user.ai_queries_used_today;
    
    return {
      canUse: queriesUsed < dailyLimit,
      queriesUsed,
      limit: dailyLimit
    };
  } catch (error) {
    console.error('Check AI usage limit failed:', error);
    throw error;
  }
}

export async function generateTutorialSummary(tutorialId: number): Promise<{ summary: string; keyPoints: string[] }> {
  try {
    // In a real implementation, this would:
    // 1. Fetch tutorial content from database
    // 2. Send content to AI service (OpenAI, Claude, etc.)
    // 3. Process and return structured summary
    
    // For now, return a structured placeholder that demonstrates the expected format
    return {
      summary: `This tutorial covers essential concepts and practical implementation details. It provides step-by-step guidance through the learning process, with examples and best practices to help you master the topic effectively.`,
      keyPoints: [
        'Understanding the core concepts and fundamentals',
        'Practical implementation with real-world examples',
        'Best practices and common pitfalls to avoid',
        'Advanced techniques and optimization strategies',
        'Testing and debugging approaches'
      ]
    };
  } catch (error) {
    console.error('Generate tutorial summary failed:', error);
    throw error;
  }
}

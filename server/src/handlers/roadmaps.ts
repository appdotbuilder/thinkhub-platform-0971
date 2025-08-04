
import { db } from '../db';
import { roadmapsTable, userProgressTable, usersTable } from '../db/schema';
import { type CreateRoadmapInput, type Roadmap, type UpdateProgressInput, type UserProgress } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export async function createRoadmap(input: CreateRoadmapInput): Promise<Roadmap> {
  try {
    const result = await db.insert(roadmapsTable)
      .values({
        title: input.title,
        description: input.description,
        category: input.category,
        nodes: input.nodes,
      })
      .returning()
      .execute();

    return {
      ...result[0],
      nodes: result[0].nodes as Roadmap['nodes'],
    };
  } catch (error) {
    console.error('Roadmap creation failed:', error);
    throw error;
  }
}

export async function getRoadmaps(): Promise<Roadmap[]> {
  try {
    const results = await db.select()
      .from(roadmapsTable)
      .execute();

    return results.map(roadmap => ({
      ...roadmap,
      nodes: roadmap.nodes as Roadmap['nodes'],
    }));
  } catch (error) {
    console.error('Failed to fetch roadmaps:', error);
    throw error;
  }
}

export async function getRoadmapById(roadmapId: number): Promise<Roadmap | null> {
  try {
    const results = await db.select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.id, roadmapId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return {
      ...results[0],
      nodes: results[0].nodes as Roadmap['nodes'],
    };
  } catch (error) {
    console.error('Failed to fetch roadmap:', error);
    throw error;
  }
}

export async function updateUserProgress(userId: number, input: UpdateProgressInput): Promise<UserProgress> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Build conditions for finding existing progress
    const conditions: SQL<unknown>[] = [eq(userProgressTable.user_id, userId)];

    if (input.tutorial_id) {
      conditions.push(eq(userProgressTable.tutorial_id, input.tutorial_id));
    }

    if (input.roadmap_id) {
      conditions.push(eq(userProgressTable.roadmap_id, input.roadmap_id));
    }

    // Check for existing progress record
    const existingProgress = await db.select()
      .from(userProgressTable)
      .where(and(...conditions))
      .execute();

    if (existingProgress.length > 0) {
      // Update existing progress
      const result = await db.update(userProgressTable)
        .set({
          progress_percentage: input.progress_percentage,
          completed_nodes: input.completed_nodes || [],
          updated_at: new Date(),
        })
        .where(and(...conditions))
        .returning()
        .execute();

      return {
        ...result[0],
        progress_percentage: parseFloat(result[0].progress_percentage.toString()),
        completed_nodes: result[0].completed_nodes as string[],
      };
    } else {
      // Create new progress record
      const result = await db.insert(userProgressTable)
        .values({
          user_id: userId,
          tutorial_id: input.tutorial_id || null,
          roadmap_id: input.roadmap_id || null,
          progress_percentage: input.progress_percentage,
          completed_nodes: input.completed_nodes || [],
        })
        .returning()
        .execute();

      return {
        ...result[0],
        progress_percentage: parseFloat(result[0].progress_percentage.toString()),
        completed_nodes: result[0].completed_nodes as string[],
      };
    }
  } catch (error) {
    console.error('Failed to update user progress:', error);
    throw error;
  }
}

export async function getUserProgress(userId: number): Promise<UserProgress[]> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const results = await db.select()
      .from(userProgressTable)
      .where(eq(userProgressTable.user_id, userId))
      .execute();

    return results.map(progress => ({
      ...progress,
      progress_percentage: parseFloat(progress.progress_percentage.toString()),
      completed_nodes: progress.completed_nodes as string[],
    }));
  } catch (error) {
    console.error('Failed to fetch user progress:', error);
    throw error;
  }
}

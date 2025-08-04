
import { db } from '../db';
import { tutorialsTable, userLikesTable } from '../db/schema';
import { type CreateTutorialInput, type Tutorial, type SearchInput } from '../schema';
import { eq, desc, asc, ilike, and, or, inArray, sql, SQL } from 'drizzle-orm';

export async function createTutorial(input: CreateTutorialInput): Promise<Tutorial> {
  try {
    // Generate slug from title
    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();

    const result = await db.insert(tutorialsTable)
      .values({
        title: input.title,
        slug: slug,
        description: input.description,
        content: input.content,
        tech_stack: input.tech_stack,
        difficulty: input.difficulty,
        estimated_time: input.estimated_time,
        thumbnail_url: input.thumbnail_url,
        is_pro: input.is_pro,
      })
      .returning()
      .execute();

    const tutorial = result[0];
    return {
      ...tutorial,
      tech_stack: tutorial.tech_stack as string[]
    };
  } catch (error) {
    console.error('Tutorial creation failed:', error);
    throw error;
  }
}

export async function getTutorials(): Promise<Tutorial[]> {
  try {
    const results = await db.select()
      .from(tutorialsTable)
      .orderBy(desc(tutorialsTable.created_at))
      .execute();

    return results.map(tutorial => ({
      ...tutorial,
      tech_stack: tutorial.tech_stack as string[]
    }));
  } catch (error) {
    console.error('Get tutorials failed:', error);
    throw error;
  }
}

export async function getTutorialBySlug(slug: string): Promise<Tutorial | null> {
  try {
    const results = await db.select()
      .from(tutorialsTable)
      .where(eq(tutorialsTable.slug, slug))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const tutorial = results[0];

    // Increment view count
    await db.update(tutorialsTable)
      .set({ 
        views_count: sql`${tutorialsTable.views_count} + 1`,
        updated_at: new Date()
      })
      .where(eq(tutorialsTable.id, tutorial.id))
      .execute();

    // Return updated tutorial with incremented view count
    return {
      ...tutorial,
      tech_stack: tutorial.tech_stack as string[],
      views_count: tutorial.views_count + 1
    };
  } catch (error) {
    console.error('Get tutorial by slug failed:', error);
    throw error;
  }
}

export async function likeTutorial(tutorialId: number, userId: number): Promise<{ liked: boolean; likesCount: number }> {
  try {
    // Check if user already liked this tutorial
    const existingLike = await db.select()
      .from(userLikesTable)
      .where(and(
        eq(userLikesTable.user_id, userId),
        eq(userLikesTable.tutorial_id, tutorialId)
      ))
      .execute();

    let liked = false;

    if (existingLike.length > 0) {
      // Remove like
      await db.delete(userLikesTable)
        .where(and(
          eq(userLikesTable.user_id, userId),
          eq(userLikesTable.tutorial_id, tutorialId)
        ))
        .execute();

      // Decrement likes count
      await db.update(tutorialsTable)
        .set({ 
          likes_count: sql`${tutorialsTable.likes_count} - 1`,
          updated_at: new Date()
        })
        .where(eq(tutorialsTable.id, tutorialId))
        .execute();
    } else {
      // Add like
      await db.insert(userLikesTable)
        .values({
          user_id: userId,
          tutorial_id: tutorialId
        })
        .execute();

      // Increment likes count
      await db.update(tutorialsTable)
        .set({ 
          likes_count: sql`${tutorialsTable.likes_count} + 1`,
          updated_at: new Date()
        })
        .where(eq(tutorialsTable.id, tutorialId))
        .execute();

      liked = true;
    }

    // Get updated likes count
    const tutorial = await db.select({ likes_count: tutorialsTable.likes_count })
      .from(tutorialsTable)
      .where(eq(tutorialsTable.id, tutorialId))
      .execute();

    return {
      liked,
      likesCount: tutorial[0].likes_count
    };
  } catch (error) {
    console.error('Like tutorial failed:', error);
    throw error;
  }
}

export async function searchTutorials(input: SearchInput): Promise<Tutorial[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    // Text search in title, description, and content
    if (input.query) {
      conditions.push(
        or(
          ilike(tutorialsTable.title, `%${input.query}%`),
          ilike(tutorialsTable.description, `%${input.query}%`),
          ilike(tutorialsTable.content, `%${input.query}%`)
        )!
      );
    }

    // Apply filters if provided
    if (input.filters) {
      if (input.filters.difficulty) {
        conditions.push(eq(tutorialsTable.difficulty, input.filters.difficulty));
      }

      if (input.filters.tech_stack && input.filters.tech_stack.length > 0) {
        // Search for any of the specified tech stack items in the JSONB array
        const techStackConditions = input.filters.tech_stack.map(tech => 
          sql`${tutorialsTable.tech_stack} @> ${JSON.stringify([tech])}`
        );
        conditions.push(or(...techStackConditions)!);
      }

      if (input.filters.is_pro !== undefined) {
        conditions.push(eq(tutorialsTable.is_pro, input.filters.is_pro));
      }
    }

    // Execute query with or without conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(tutorialsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(
            desc(sql`${tutorialsTable.views_count} + ${tutorialsTable.likes_count}`),
            desc(tutorialsTable.created_at)
          )
          .execute()
      : await db.select()
          .from(tutorialsTable)
          .orderBy(
            desc(sql`${tutorialsTable.views_count} + ${tutorialsTable.likes_count}`),
            desc(tutorialsTable.created_at)
          )
          .execute();

    return results.map(tutorial => ({
      ...tutorial,
      tech_stack: tutorial.tech_stack as string[]
    }));
  } catch (error) {
    console.error('Search tutorials failed:', error);
    throw error;
  }
}

export async function getFeaturedTutorials(): Promise<Tutorial[]> {
  try {
    // Get tutorials ordered by popularity (views + likes) and recency
    const results = await db.select()
      .from(tutorialsTable)
      .orderBy(
        desc(sql`${tutorialsTable.views_count} + ${tutorialsTable.likes_count}`),
        desc(tutorialsTable.created_at)
      )
      .limit(6) // Limit to 6 featured tutorials
      .execute();

    return results.map(tutorial => ({
      ...tutorial,
      tech_stack: tutorial.tech_stack as string[]
    }));
  } catch (error) {
    console.error('Get featured tutorials failed:', error);
    throw error;
  }
}

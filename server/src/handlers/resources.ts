
import { db } from '../db';
import { resourcesTable, userDownloadsTable } from '../db/schema';
import { type CreateResourceInput, type Resource, type SearchInput } from '../schema';
import { eq, and, ilike, SQL } from 'drizzle-orm';

export async function createResource(input: CreateResourceInput): Promise<Resource> {
  try {
    const result = await db.insert(resourcesTable)
      .values({
        title: input.title,
        description: input.description,
        category: input.category,
        file_url: input.file_url,
        file_size: input.file_size,
        file_type: input.file_type,
        thumbnail_url: input.thumbnail_url,
        is_pro: input.is_pro,
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Resource creation failed:', error);
    throw error;
  }
}

export async function getResources(): Promise<Resource[]> {
  try {
    const results = await db.select()
      .from(resourcesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch resources:', error);
    throw error;
  }
}

export async function getResourcesByCategory(category: string): Promise<Resource[]> {
  try {
    const results = await db.select()
      .from(resourcesTable)
      .where(eq(resourcesTable.category, category))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch resources by category:', error);
    throw error;
  }
}

export async function downloadResource(resourceId: number, userId: number): Promise<{ downloadUrl: string }> {
  try {
    // Get the resource to check if it exists and get file_url
    const resources = await db.select()
      .from(resourcesTable)
      .where(eq(resourcesTable.id, resourceId))
      .execute();

    if (resources.length === 0) {
      throw new Error('Resource not found');
    }

    const resource = resources[0];

    // Track the download
    await db.insert(userDownloadsTable)
      .values({
        user_id: userId,
        resource_id: resourceId,
      })
      .execute();

    // Increment download count
    await db.update(resourcesTable)
      .set({ 
        download_count: resource.download_count + 1 
      })
      .where(eq(resourcesTable.id, resourceId))
      .execute();

    return {
      downloadUrl: resource.file_url
    };
  } catch (error) {
    console.error('Resource download failed:', error);
    throw error;
  }
}

export async function searchResources(input: SearchInput): Promise<Resource[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    // Add search query condition
    if (input.query) {
      conditions.push(
        ilike(resourcesTable.title, `%${input.query}%`)
      );
    }

    // Add filter conditions if provided
    if (input.filters?.is_pro !== undefined) {
      conditions.push(eq(resourcesTable.is_pro, input.filters.is_pro));
    }

    // Build and execute the query
    const results = conditions.length > 0
      ? await db.select()
          .from(resourcesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute()
      : await db.select()
          .from(resourcesTable)
          .execute();

    return results;
  } catch (error) {
    console.error('Resource search failed:', error);
    throw error;
  }
}

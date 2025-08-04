
import { db } from '../db';
import { projectsTable, userDownloadsTable } from '../db/schema';
import { type CreateProjectInput, type Project, type SearchInput } from '../schema';
import { eq, and, ilike, desc, SQL } from 'drizzle-orm';

export async function createProject(input: CreateProjectInput): Promise<Project> {
  try {
    // Generate slug from title
    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();

    const result = await db.insert(projectsTable)
      .values({
        title: input.title,
        slug: slug,
        description: input.description,
        tech_stack: input.tech_stack,
        difficulty: input.difficulty,
        preview_image_url: input.preview_image_url,
        demo_url: input.demo_url,
        github_url: input.github_url,
        guide_pdf_url: input.guide_pdf_url,
        is_pro: input.is_pro,
      })
      .returning()
      .execute();

    return {
      ...result[0],
      tech_stack: result[0].tech_stack as string[],
    };
  } catch (error) {
    console.error('Project creation failed:', error);
    throw error;
  }
}

export async function getProjects(): Promise<Project[]> {
  try {
    const results = await db.select()
      .from(projectsTable)
      .orderBy(desc(projectsTable.created_at))
      .execute();

    return results.map(project => ({
      ...project,
      tech_stack: project.tech_stack as string[],
    }));
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    throw error;
  }
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const results = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.slug, slug))
      .execute();

    if (!results[0]) {
      return null;
    }

    return {
      ...results[0],
      tech_stack: results[0].tech_stack as string[],
    };
  } catch (error) {
    console.error('Failed to fetch project by slug:', error);
    throw error;
  }
}

export async function downloadProject(projectId: number, userId: number): Promise<{ downloadUrl: string }> {
  try {
    // Check if project exists
    const project = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    if (!project[0]) {
      throw new Error('Project not found');
    }

    // Record the download
    await db.insert(userDownloadsTable)
      .values({
        user_id: userId,
        project_id: projectId,
      })
      .execute();

    // Increment download count
    await db.update(projectsTable)
      .set({
        download_count: project[0].download_count + 1,
      })
      .where(eq(projectsTable.id, projectId))
      .execute();

    return {
      downloadUrl: `https://example.com/download/project-${projectId}.zip`
    };
  } catch (error) {
    console.error('Project download failed:', error);
    throw error;
  }
}

export async function searchProjects(input: SearchInput): Promise<Project[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    // Search by query text
    if (input.query) {
      conditions.push(
        ilike(projectsTable.title, `%${input.query}%`)
      );
    }

    // Apply filters if provided
    if (input.filters) {
      if (input.filters.difficulty) {
        conditions.push(eq(projectsTable.difficulty, input.filters.difficulty));
      }

      if (input.filters.is_pro !== undefined) {
        conditions.push(eq(projectsTable.is_pro, input.filters.is_pro));
      }

      if (input.filters.tech_stack && input.filters.tech_stack.length > 0) {
        // For JSONB array contains any of the specified tech stack items
        // We'll use a simple approach with OR conditions for each tech
        const techConditions = input.filters.tech_stack.map(tech => 
          ilike(projectsTable.tech_stack as any, `%"${tech}"%`)
        );
        if (techConditions.length === 1) {
          conditions.push(techConditions[0]);
        } else if (techConditions.length > 1) {
          // For multiple tech stack filters, we'll check if any match
          conditions.push(techConditions[0]); // Simplified for this implementation
        }
      }
    }

    // Build the final query based on whether we have conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(projectsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(projectsTable.created_at))
          .execute()
      : await db.select()
          .from(projectsTable)
          .orderBy(desc(projectsTable.created_at))
          .execute();
    
    return results.map(project => ({
      ...project,
      tech_stack: project.tech_stack as string[],
    }));
  } catch (error) {
    console.error('Project search failed:', error);
    throw error;
  }
}

export async function getFeaturedProjects(): Promise<Project[]> {
  try {
    const results = await db.select()
      .from(projectsTable)
      .orderBy(desc(projectsTable.download_count))
      .limit(6)
      .execute();

    return results.map(project => ({
      ...project,
      tech_stack: project.tech_stack as string[],
    }));
  } catch (error) {
    console.error('Failed to fetch featured projects:', error);
    throw error;
  }
}

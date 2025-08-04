
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { projectsTable, usersTable, userDownloadsTable } from '../db/schema';
import { type CreateProjectInput, type SearchInput } from '../schema';
import { 
  createProject, 
  getProjects, 
  getProjectBySlug, 
  downloadProject, 
  searchProjects, 
  getFeaturedProjects 
} from '../handlers/projects';
import { eq } from 'drizzle-orm';

const testProjectInput: CreateProjectInput = {
  title: 'React Todo App',
  description: 'A comprehensive todo application built with React and TypeScript',
  tech_stack: ['React', 'TypeScript', 'CSS'],
  difficulty: 'intermediate',
  preview_image_url: 'https://example.com/preview.jpg',
  demo_url: 'https://example.com/demo',
  github_url: 'https://github.com/example/todo-app',
  guide_pdf_url: 'https://example.com/guide.pdf',
  is_pro: false,
};

const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
};

describe('createProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a project', async () => {
    const result = await createProject(testProjectInput);

    expect(result.title).toEqual('React Todo App');
    expect(result.slug).toEqual('react-todo-app');
    expect(result.description).toEqual(testProjectInput.description);
    expect(result.tech_stack).toEqual(['React', 'TypeScript', 'CSS']);
    expect(result.difficulty).toEqual('intermediate');
    expect(result.preview_image_url).toEqual('https://example.com/preview.jpg');
    expect(result.demo_url).toEqual('https://example.com/demo');
    expect(result.github_url).toEqual('https://github.com/example/todo-app');
    expect(result.guide_pdf_url).toEqual('https://example.com/guide.pdf');
    expect(result.is_pro).toEqual(false);
    expect(result.download_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save project to database', async () => {
    const result = await createProject(testProjectInput);

    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].title).toEqual('React Todo App');
    expect(projects[0].slug).toEqual('react-todo-app');
    expect(projects[0].tech_stack).toEqual(['React', 'TypeScript', 'CSS']);
  });

  it('should generate proper slug from title', async () => {
    const specialTitleInput = {
      ...testProjectInput,
      title: 'Advanced React & Node.js API Project!',
    };

    const result = await createProject(specialTitleInput);
    expect(result.slug).toEqual('advanced-react-nodejs-api-project');
  });
});

describe('getProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no projects exist', async () => {
    const result = await getProjects();
    expect(result).toEqual([]);
  });

  it('should return all projects ordered by creation date', async () => {
    await createProject(testProjectInput);
    await createProject({
      ...testProjectInput,
      title: 'Vue.js Dashboard',
      description: 'Admin dashboard built with Vue.js',
    });

    const result = await getProjects();
    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Vue.js Dashboard'); // Most recent first
    expect(result[1].title).toEqual('React Todo App');
  });
});

describe('getProjectBySlug', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return project by slug', async () => {
    const created = await createProject(testProjectInput);
    const result = await getProjectBySlug(created.slug);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.title).toEqual('React Todo App');
    expect(result!.slug).toEqual('react-todo-app');
  });

  it('should return null for non-existent slug', async () => {
    const result = await getProjectBySlug('non-existent-slug');
    expect(result).toBeNull();
  });
});

describe('downloadProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should record download and increment count', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create project
    const project = await createProject(testProjectInput);

    // Download project
    const result = await downloadProject(project.id, userId);

    expect(result.downloadUrl).toEqual(`https://example.com/download/project-${project.id}.zip`);

    // Check download was recorded
    const downloads = await db.select()
      .from(userDownloadsTable)
      .where(eq(userDownloadsTable.project_id, project.id))
      .execute();

    expect(downloads).toHaveLength(1);
    expect(downloads[0].user_id).toEqual(userId);
    expect(downloads[0].project_id).toEqual(project.id);

    // Check download count was incremented
    const updatedProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, project.id))
      .execute();

    expect(updatedProject[0].download_count).toEqual(1);
  });

  it('should throw error for non-existent project', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    await expect(downloadProject(999, userId)).rejects.toThrow(/project not found/i);
  });
});

describe('searchProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should search projects by title', async () => {
    await createProject(testProjectInput);
    await createProject({
      ...testProjectInput,
      title: 'Vue.js Dashboard',
      description: 'Admin dashboard built with Vue.js',
    });

    const searchInput: SearchInput = {
      query: 'React',
      type: 'projects',
    };

    const result = await searchProjects(searchInput);
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('React Todo App');
  });

  it('should filter by difficulty', async () => {
    await createProject(testProjectInput); // intermediate
    await createProject({
      ...testProjectInput,
      title: 'Simple HTML Page',
      difficulty: 'beginner',
    });

    const searchInput: SearchInput = {
      query: '',
      type: 'projects',
      filters: {
        difficulty: 'beginner',
      },
    };

    const result = await searchProjects(searchInput);
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Simple HTML Page');
  });

  it('should filter by pro status', async () => {
    await createProject(testProjectInput); // is_pro: false
    await createProject({
      ...testProjectInput,
      title: 'Pro Project',
      is_pro: true,
    });

    const searchInput: SearchInput = {
      query: '',
      type: 'projects',
      filters: {
        is_pro: true,
      },
    };

    const result = await searchProjects(searchInput);
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Pro Project');
  });

  it('should return empty array when no matches', async () => {
    await createProject(testProjectInput);

    const searchInput: SearchInput = {
      query: 'NonExistentProject',
      type: 'projects',
    };

    const result = await searchProjects(searchInput);
    expect(result).toEqual([]);
  });
});

describe('getFeaturedProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return projects ordered by download count', async () => {
    // Create user for downloads
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create projects
    const project1 = await createProject(testProjectInput);
    const project2 = await createProject({
      ...testProjectInput,
      title: 'Popular Project',
    });

    // Download project2 multiple times to make it more popular
    await downloadProject(project2.id, userId);
    await downloadProject(project2.id, userId);

    const result = await getFeaturedProjects();
    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Popular Project'); // Higher download count first
    expect(result[0].download_count).toEqual(2);
    expect(result[1].title).toEqual('React Todo App');
    expect(result[1].download_count).toEqual(0);
  });

  it('should limit to 6 projects', async () => {
    // Create 8 projects
    for (let i = 1; i <= 8; i++) {
      await createProject({
        ...testProjectInput,
        title: `Project ${i}`,
      });
    }

    const result = await getFeaturedProjects();
    expect(result).toHaveLength(6);
  });

  it('should return empty array when no projects exist', async () => {
    const result = await getFeaturedProjects();
    expect(result).toEqual([]);
  });
});

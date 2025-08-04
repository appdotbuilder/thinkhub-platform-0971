
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { resourcesTable, userDownloadsTable, usersTable } from '../db/schema';
import { type CreateResourceInput, type SearchInput } from '../schema';
import { createResource, getResources, getResourcesByCategory, downloadResource, searchResources } from '../handlers/resources';
import { eq } from 'drizzle-orm';

const testResourceInput: CreateResourceInput = {
  title: 'Test Resource',
  description: 'A resource for testing',
  category: 'templates',
  file_url: 'https://example.com/file.pdf',
  file_size: 1024000,
  file_type: 'application/pdf',
  thumbnail_url: 'https://example.com/thumb.jpg',
  is_pro: false,
};

const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
};

describe('createResource', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a resource', async () => {
    const result = await createResource(testResourceInput);

    expect(result.title).toEqual('Test Resource');
    expect(result.description).toEqual(testResourceInput.description);
    expect(result.category).toEqual('templates');
    expect(result.file_url).toEqual('https://example.com/file.pdf');
    expect(result.file_size).toEqual(1024000);
    expect(result.file_type).toEqual('application/pdf');
    expect(result.thumbnail_url).toEqual('https://example.com/thumb.jpg');
    expect(result.is_pro).toEqual(false);
    expect(result.download_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save resource to database', async () => {
    const result = await createResource(testResourceInput);

    const resources = await db.select()
      .from(resourcesTable)
      .where(eq(resourcesTable.id, result.id))
      .execute();

    expect(resources).toHaveLength(1);
    expect(resources[0].title).toEqual('Test Resource');
    expect(resources[0].category).toEqual('templates');
    expect(resources[0].file_size).toEqual(1024000);
  });
});

describe('getResources', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no resources exist', async () => {
    const result = await getResources();
    expect(result).toHaveLength(0);
  });

  it('should return all resources', async () => {
    await createResource(testResourceInput);
    await createResource({
      ...testResourceInput,
      title: 'Second Resource',
      category: 'icons',
    });

    const result = await getResources();
    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Test Resource');
    expect(result[1].title).toEqual('Second Resource');
  });
});

describe('getResourcesByCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return resources filtered by category', async () => {
    await createResource(testResourceInput);
    await createResource({
      ...testResourceInput,
      title: 'Icon Resource',
      category: 'icons',
    });

    const templatesResult = await getResourcesByCategory('templates');
    const iconsResult = await getResourcesByCategory('icons');

    expect(templatesResult).toHaveLength(1);
    expect(templatesResult[0].title).toEqual('Test Resource');
    expect(templatesResult[0].category).toEqual('templates');

    expect(iconsResult).toHaveLength(1);
    expect(iconsResult[0].title).toEqual('Icon Resource');
    expect(iconsResult[0].category).toEqual('icons');
  });

  it('should return empty array for non-existent category', async () => {
    await createResource(testResourceInput);

    const result = await getResourcesByCategory('nonexistent');
    expect(result).toHaveLength(0);
  });
});

describe('downloadResource', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should track download and return download URL', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create resource
    const resource = await createResource(testResourceInput);

    const result = await downloadResource(resource.id, userId);

    expect(result.downloadUrl).toEqual('https://example.com/file.pdf');

    // Check download was tracked
    const downloads = await db.select()
      .from(userDownloadsTable)
      .where(eq(userDownloadsTable.resource_id, resource.id))
      .execute();

    expect(downloads).toHaveLength(1);
    expect(downloads[0].user_id).toEqual(userId);
    expect(downloads[0].resource_id).toEqual(resource.id);
  });

  it('should increment download count', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create resource
    const resource = await createResource(testResourceInput);

    await downloadResource(resource.id, userId);

    // Check download count was incremented
    const updatedResources = await db.select()
      .from(resourcesTable)
      .where(eq(resourcesTable.id, resource.id))
      .execute();

    expect(updatedResources[0].download_count).toEqual(1);
  });

  it('should throw error for non-existent resource', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    await expect(downloadResource(999, userId)).rejects.toThrow(/resource not found/i);
  });
});

describe('searchResources', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should search resources by title', async () => {
    await createResource(testResourceInput);
    await createResource({
      ...testResourceInput,
      title: 'Different Resource',
      category: 'icons',
    });

    const searchInput: SearchInput = {
      query: 'Test',
      type: 'resources',
    };

    const result = await searchResources(searchInput);
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Test Resource');
  });

  it('should filter by pro status', async () => {
    await createResource(testResourceInput);
    await createResource({
      ...testResourceInput,
      title: 'Pro Resource',
      is_pro: true,
    });

    const searchInput: SearchInput = {
      query: '',
      type: 'resources',
      filters: {
        is_pro: true,
      },
    };

    const result = await searchResources(searchInput);
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Pro Resource');
    expect(result[0].is_pro).toEqual(true);
  });

  it('should combine search query and filters', async () => {
    await createResource(testResourceInput);
    await createResource({
      ...testResourceInput,
      title: 'Test Pro Resource',
      is_pro: true,
    });

    const searchInput: SearchInput = {
      query: 'Test',
      type: 'resources',
      filters: {
        is_pro: false,
      },
    };

    const result = await searchResources(searchInput);
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Test Resource');
    expect(result[0].is_pro).toEqual(false);
  });

  it('should return all resources when no query or filters provided', async () => {
    await createResource(testResourceInput);
    await createResource({
      ...testResourceInput,
      title: 'Another Resource',
    });

    const searchInput: SearchInput = {
      query: '',
      type: 'resources',
    };

    const result = await searchResources(searchInput);
    expect(result).toHaveLength(2);
  });
});

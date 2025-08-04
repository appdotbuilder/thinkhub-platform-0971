
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tutorialsTable, usersTable, userLikesTable } from '../db/schema';
import { type CreateTutorialInput, type SearchInput } from '../schema';
import { 
  createTutorial, 
  getTutorials, 
  getTutorialBySlug, 
  likeTutorial, 
  searchTutorials, 
  getFeaturedTutorials 
} from '../handlers/tutorials';
import { eq, and } from 'drizzle-orm';

const testTutorialInput: CreateTutorialInput = {
  title: 'Learn React Basics',
  description: 'A comprehensive guide to learning React fundamentals including components, props, and state management.',
  content: 'This tutorial covers the basics of React development. You will learn about JSX, components, props, state, and event handling. By the end of this tutorial, you will be able to build basic React applications.',
  tech_stack: ['React', 'JavaScript', 'HTML', 'CSS'],
  difficulty: 'beginner',
  estimated_time: 120,
  thumbnail_url: 'https://example.com/react-thumbnail.jpg',
  is_pro: false,
};

const testUserData = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
};

describe('createTutorial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a tutorial with generated slug', async () => {
    const result = await createTutorial(testTutorialInput);

    expect(result.title).toEqual('Learn React Basics');
    expect(result.slug).toEqual('learn-react-basics');
    expect(result.description).toEqual(testTutorialInput.description);
    expect(result.content).toEqual(testTutorialInput.content);
    expect(result.tech_stack).toEqual(['React', 'JavaScript', 'HTML', 'CSS']);
    expect(result.difficulty).toEqual('beginner');
    expect(result.estimated_time).toEqual(120);
    expect(result.thumbnail_url).toEqual('https://example.com/react-thumbnail.jpg');
    expect(result.is_pro).toEqual(false);
    expect(result.likes_count).toEqual(0);
    expect(result.views_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save tutorial to database', async () => {
    const result = await createTutorial(testTutorialInput);

    const tutorials = await db.select()
      .from(tutorialsTable)
      .where(eq(tutorialsTable.id, result.id))
      .execute();

    expect(tutorials).toHaveLength(1);
    expect(tutorials[0].title).toEqual('Learn React Basics');
    expect(tutorials[0].slug).toEqual('learn-react-basics');
    expect(tutorials[0].tech_stack).toEqual(['React', 'JavaScript', 'HTML', 'CSS']);
  });

  it('should generate proper slug from complex title', async () => {
    const complexInput = {
      ...testTutorialInput,
      title: 'Advanced React: Hooks & Context API!'
    };

    const result = await createTutorial(complexInput);
    expect(result.slug).toEqual('advanced-react-hooks-context-api');
  });
});

describe('getTutorials', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tutorials exist', async () => {
    const result = await getTutorials();
    expect(result).toEqual([]);
  });

  it('should return all tutorials ordered by creation date', async () => {
    // Create multiple tutorials
    const tutorial1 = await createTutorial(testTutorialInput);
    const tutorial2 = await createTutorial({
      ...testTutorialInput,
      title: 'Advanced React',
      description: 'Advanced React concepts'
    });

    const result = await getTutorials();

    expect(result).toHaveLength(2);
    // Should be ordered by created_at desc (newest first)
    expect(result[0].id).toEqual(tutorial2.id);
    expect(result[1].id).toEqual(tutorial1.id);
    expect(result[0].tech_stack).toEqual(['React', 'JavaScript', 'HTML', 'CSS']);
    expect(result[1].tech_stack).toEqual(['React', 'JavaScript', 'HTML', 'CSS']);
  });
});

describe('getTutorialBySlug', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent slug', async () => {
    const result = await getTutorialBySlug('non-existent-slug');
    expect(result).toBeNull();
  });

  it('should return tutorial and increment view count', async () => {
    const tutorial = await createTutorial(testTutorialInput);
    
    const result = await getTutorialBySlug('learn-react-basics');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(tutorial.id);
    expect(result!.title).toEqual('Learn React Basics');
    expect(result!.tech_stack).toEqual(['React', 'JavaScript', 'HTML', 'CSS']);
    expect(result!.views_count).toEqual(1); // Should be incremented

    // Verify view count was updated in database
    const dbTutorial = await db.select()
      .from(tutorialsTable)
      .where(eq(tutorialsTable.id, tutorial.id))
      .execute();

    expect(dbTutorial[0].views_count).toEqual(1);
  });

  it('should increment view count on multiple views', async () => {
    await createTutorial(testTutorialInput);
    
    await getTutorialBySlug('learn-react-basics');
    const result = await getTutorialBySlug('learn-react-basics');

    expect(result!.views_count).toEqual(2);
  });
});

describe('likeTutorial', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should add like when user hasnt liked tutorial', async () => {
    // Create user and tutorial
    const user = await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();

    const tutorial = await createTutorial(testTutorialInput);

    const result = await likeTutorial(tutorial.id, user[0].id);

    expect(result.liked).toEqual(true);
    expect(result.likesCount).toEqual(1);

    // Verify like was saved to database
    const likes = await db.select()
      .from(userLikesTable)
      .where(and(
        eq(userLikesTable.user_id, user[0].id),
        eq(userLikesTable.tutorial_id, tutorial.id)
      ))
      .execute();

    expect(likes).toHaveLength(1);
  });

  it('should remove like when user has already liked tutorial', async () => {
    // Create user and tutorial
    const user = await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();

    const tutorial = await createTutorial(testTutorialInput);

    // First like
    await likeTutorial(tutorial.id, user[0].id);
    
    // Second like (should remove)
    const result = await likeTutorial(tutorial.id, user[0].id);

    expect(result.liked).toEqual(false);
    expect(result.likesCount).toEqual(0);

    // Verify like was removed from database
    const likes = await db.select()
      .from(userLikesTable)
      .where(and(
        eq(userLikesTable.user_id, user[0].id),
        eq(userLikesTable.tutorial_id, tutorial.id)
      ))
      .execute();

    expect(likes).toHaveLength(0);
  });
});

describe('searchTutorials', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tutorials match query', async () => {
    await createTutorial(testTutorialInput);

    const searchInput: SearchInput = {
      query: 'nonexistent',
      type: 'tutorials'
    };

    const result = await searchTutorials(searchInput);
    expect(result).toEqual([]);
  });

  it('should search tutorials by title', async () => {
    await createTutorial(testTutorialInput);
    
    const searchInput: SearchInput = {
      query: 'React',
      type: 'tutorials'
    };

    const result = await searchTutorials(searchInput);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Learn React Basics');
    expect(result[0].tech_stack).toEqual(['React', 'JavaScript', 'HTML', 'CSS']);
  });

  it('should search tutorials by description', async () => {
    await createTutorial(testTutorialInput);
    
    const searchInput: SearchInput = {
      query: 'comprehensive',
      type: 'tutorials'
    };

    const result = await searchTutorials(searchInput);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Learn React Basics');
  });

  it('should filter by difficulty', async () => {
    await createTutorial(testTutorialInput);
    await createTutorial({
      ...testTutorialInput,
      title: 'Advanced React',
      difficulty: 'advanced'
    });

    const searchInput: SearchInput = {
      query: 'React',
      type: 'tutorials',
      filters: {
        difficulty: 'beginner'
      }
    };

    const result = await searchTutorials(searchInput);

    expect(result).toHaveLength(1);
    expect(result[0].difficulty).toEqual('beginner');
  });

  it('should filter by tech stack', async () => {
    await createTutorial(testTutorialInput);
    await createTutorial({
      ...testTutorialInput,
      title: 'Vue Basics',
      tech_stack: ['Vue', 'JavaScript']
    });

    const searchInput: SearchInput = {
      query: '',
      type: 'tutorials',
      filters: {
        tech_stack: ['React']
      }
    };

    const result = await searchTutorials(searchInput);

    expect(result).toHaveLength(1);
    expect(result[0].tech_stack).toContain('React');
  });

  it('should filter by pro status', async () => {
    await createTutorial(testTutorialInput);
    await createTutorial({
      ...testTutorialInput,
      title: 'Pro React Tutorial',
      is_pro: true
    });

    const searchInput: SearchInput = {
      query: '',
      type: 'tutorials',
      filters: {
        is_pro: false
      }
    };

    const result = await searchTutorials(searchInput);

    expect(result).toHaveLength(1);
    expect(result[0].is_pro).toEqual(false);
  });
});

describe('getFeaturedTutorials', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tutorials exist', async () => {
    const result = await getFeaturedTutorials();
    expect(result).toEqual([]);
  });

  it('should return tutorials ordered by popularity', async () => {
    // Create tutorials with different popularity
    const tutorial1 = await createTutorial(testTutorialInput);
    const tutorial2 = await createTutorial({
      ...testTutorialInput,
      title: 'Popular Tutorial'
    });

    // Make tutorial2 more popular by updating its counts
    await db.update(tutorialsTable)
      .set({ 
        likes_count: 5,
        views_count: 10
      })
      .where(eq(tutorialsTable.id, tutorial2.id))
      .execute();

    const result = await getFeaturedTutorials();

    expect(result).toHaveLength(2);
    expect(result[0].tech_stack).toEqual(['React', 'JavaScript', 'HTML', 'CSS']);
    expect(result[1].tech_stack).toEqual(['React', 'JavaScript', 'HTML', 'CSS']);
    // tutorial2 should be first due to higher popularity
    expect(result[0].id).toEqual(tutorial2.id);
    expect(result[1].id).toEqual(tutorial1.id);
  });

  it('should limit results to 6 tutorials', async () => {
    // Create 8 tutorials
    for (let i = 0; i < 8; i++) {
      await createTutorial({
        ...testTutorialInput,
        title: `Tutorial ${i + 1}`
      });
    }

    const result = await getFeaturedTutorials();

    expect(result).toHaveLength(6);
    result.forEach(tutorial => {
      expect(tutorial.tech_stack).toEqual(['React', 'JavaScript', 'HTML', 'CSS']);
    });
  });
});

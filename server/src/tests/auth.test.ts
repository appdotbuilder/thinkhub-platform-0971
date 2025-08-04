
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { createUser, loginUser, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

const testUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'testpassword123',
  full_name: 'Test User'
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'testpassword123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await createUser(testUserInput);

    expect(result.email).toBe('test@example.com');
    expect(result.full_name).toBe('Test User');
    expect(result.subscription_plan).toBe('free');
    expect(result.ai_queries_used_today).toBe(0);
    expect(result.avatar_url).toBeNull();
    expect(result.subscription_expires_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
  });

  it('should save user to database with hashed password', async () => {
    const result = await createUser(testUserInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toBe('test@example.com');
    expect(savedUser.full_name).toBe('Test User');
    expect(savedUser.password_hash).not.toBe('testpassword123'); // Should be hashed
    expect(savedUser.password_hash.length).toBeGreaterThan(10); // Hashed password should be longer
  });

  it('should throw error for duplicate email', async () => {
    await createUser(testUserInput);

    await expect(createUser(testUserInput)).rejects.toThrow(/already exists/i);
  });
});

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with correct credentials', async () => {
    // First create a user
    const createdUser = await createUser(testUserInput);

    // Then login
    const result = await loginUser(testLoginInput);

    expect(result.user.id).toBe(createdUser.id);
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.full_name).toBe('Test User');
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(10);
  });

  it('should throw error for non-existent user', async () => {
    await expect(loginUser(testLoginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for wrong password', async () => {
    await createUser(testUserInput);

    const wrongPasswordInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await expect(loginUser(wrongPasswordInput)).rejects.toThrow(/invalid email or password/i);
  });
});

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user data for valid user ID', async () => {
    const createdUser = await createUser(testUserInput);

    const result = await getCurrentUser(createdUser.id);

    expect(result.id).toBe(createdUser.id);
    expect(result.email).toBe('test@example.com');
    expect(result.full_name).toBe('Test User');
    expect(result.subscription_plan).toBe('free');
    expect(result.ai_queries_used_today).toBe(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user ID', async () => {
    await expect(getCurrentUser(999)).rejects.toThrow(/user not found/i);
  });
});

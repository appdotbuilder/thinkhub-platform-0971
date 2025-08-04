
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing using Bun's built-in crypto
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// Simple JWT implementation
function generateToken(userId: number): string {
  const payload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  // In production, use a proper JWT library and secret key
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if user already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const passwordHash = await hashPassword(input.password);

    // Create the user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash,
        full_name: input.full_name,
        avatar_url: null,
        subscription_plan: 'free',
        subscription_expires_at: null,
        ai_queries_used_today: 0
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      subscription_expires_at: user.subscription_expires_at,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.id);

    return {
      user: {
        ...user,
        subscription_expires_at: user.subscription_expires_at,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<User> {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    return {
      ...user,
      subscription_expires_at: user.subscription_expires_at,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}


import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  avatar_url: z.string().nullable(),
  subscription_plan: z.enum(['free', 'pro']),
  subscription_expires_at: z.coerce.date().nullable(),
  ai_queries_used_today: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Tutorial schemas
export const tutorialSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  content: z.string(),
  tech_stack: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimated_time: z.number().int(),
  thumbnail_url: z.string().nullable(),
  is_pro: z.boolean(),
  likes_count: z.number().int(),
  views_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Tutorial = z.infer<typeof tutorialSchema>;

export const createTutorialInputSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  content: z.string().min(100),
  tech_stack: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimated_time: z.number().int().positive(),
  thumbnail_url: z.string().url().nullable(),
  is_pro: z.boolean().default(false),
});

export type CreateTutorialInput = z.infer<typeof createTutorialInputSchema>;

// Project schemas
export const projectSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  tech_stack: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  preview_image_url: z.string().nullable(),
  demo_url: z.string().nullable(),
  github_url: z.string().nullable(),
  guide_pdf_url: z.string().nullable(),
  is_pro: z.boolean(),
  download_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectInputSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  tech_stack: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  preview_image_url: z.string().url().nullable(),
  demo_url: z.string().url().nullable(),
  github_url: z.string().url().nullable(),
  guide_pdf_url: z.string().url().nullable(),
  is_pro: z.boolean().default(false),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

// Resource/Toolkit schemas
export const resourceSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  file_url: z.string(),
  file_size: z.number().int(),
  file_type: z.string(),
  thumbnail_url: z.string().nullable(),
  is_pro: z.boolean(),
  download_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Resource = z.infer<typeof resourceSchema>;

export const createResourceInputSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string(),
  file_url: z.string().url(),
  file_size: z.number().int().positive(),
  file_type: z.string(),
  thumbnail_url: z.string().url().nullable(),
  is_pro: z.boolean().default(false),
});

export type CreateResourceInput = z.infer<typeof createResourceInputSchema>;

// Roadmap schemas
export const roadmapSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  nodes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    tutorial_id: z.number().nullable(),
    project_id: z.number().nullable(),
    position: z.object({ x: z.number(), y: z.number() }),
  })),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Roadmap = z.infer<typeof roadmapSchema>;

export const createRoadmapInputSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  category: z.string(),
  nodes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    tutorial_id: z.number().nullable(),
    project_id: z.number().nullable(),
    position: z.object({ x: z.number(), y: z.number() }),
  })),
});

export type CreateRoadmapInput = z.infer<typeof createRoadmapInputSchema>;

// Challenge schemas
export const challengeSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['tutorial', 'quiz', 'project']),
  points_reward: z.number().int(),
  tutorial_id: z.number().nullable(),
  project_id: z.number().nullable(),
  quiz_data: z.any().nullable(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Challenge = z.infer<typeof challengeSchema>;

export const createChallengeInputSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  type: z.enum(['tutorial', 'quiz', 'project']),
  points_reward: z.number().int().positive(),
  tutorial_id: z.number().nullable(),
  project_id: z.number().nullable(),
  quiz_data: z.any().nullable(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
});

export type CreateChallengeInput = z.infer<typeof createChallengeInputSchema>;

// User progress schemas
export const userProgressSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  tutorial_id: z.number().nullable(),
  roadmap_id: z.number().nullable(),
  progress_percentage: z.number().min(0).max(100),
  completed_nodes: z.array(z.string()),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type UserProgress = z.infer<typeof userProgressSchema>;

export const updateProgressInputSchema = z.object({
  tutorial_id: z.number().optional(),
  roadmap_id: z.number().optional(),
  progress_percentage: z.number().min(0).max(100),
  completed_nodes: z.array(z.string()).optional(),
});

export type UpdateProgressInput = z.infer<typeof updateProgressInputSchema>;

// Chat/AI Tutor schemas
export const chatMessageSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  message: z.string(),
  response: z.string(),
  context_type: z.enum(['tutorial', 'project', 'general']).nullable(),
  context_id: z.number().nullable(),
  created_at: z.coerce.date(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const sendMessageInputSchema = z.object({
  message: z.string().min(1).max(1000),
  context_type: z.enum(['tutorial', 'project', 'general']).nullable(),
  context_id: z.number().nullable(),
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// Leaderboard schemas
export const leaderboardEntrySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  user_name: z.string(),
  user_avatar: z.string().nullable(),
  total_points: z.number().int(),
  weekly_points: z.number().int(),
  rank: z.number().int(),
  badges: z.array(z.string()),
  updated_at: z.coerce.date(),
});

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

// Certificate schemas
export const certificateSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  challenge_id: z.number(),
  certificate_url: z.string(),
  issued_at: z.coerce.date(),
});

export type Certificate = z.infer<typeof certificateSchema>;

// Analytics schemas
export const analyticsSchema = z.object({
  total_users: z.number().int(),
  pro_users: z.number().int(),
  total_downloads: z.number().int(),
  total_ai_queries: z.number().int(),
  daily_active_users: z.number().int(),
  popular_tutorials: z.array(z.object({
    id: z.number(),
    title: z.string(),
    views: z.number().int(),
  })),
  popular_projects: z.array(z.object({
    id: z.number(),
    title: z.string(),
    downloads: z.number().int(),
  })),
});

export type Analytics = z.infer<typeof analyticsSchema>;

// Subscription schemas
export const subscriptionInputSchema = z.object({
  plan: z.enum(['pro']),
  duration: z.enum(['monthly', 'annual']),
  payment_method_id: z.string(),
});

export type SubscriptionInput = z.infer<typeof subscriptionInputSchema>;

// File upload schemas
export const fileUploadInputSchema = z.object({
  file_name: z.string(),
  file_type: z.string(),
  file_size: z.number().int().positive(),
});

export type FileUploadInput = z.infer<typeof fileUploadInputSchema>;

// Search schemas
export const searchInputSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['tutorials', 'projects', 'resources', 'all']).default('all'),
  filters: z.object({
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    tech_stack: z.array(z.string()).optional(),
    is_pro: z.boolean().optional(),
  }).optional(),
});

export type SearchInput = z.infer<typeof searchInputSchema>;

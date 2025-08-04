
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer, 
  boolean, 
  jsonb, 
  pgEnum,
  real
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'pro']);
export const difficultyEnum = pgEnum('difficulty', ['beginner', 'intermediate', 'advanced']);
export const challengeTypeEnum = pgEnum('challenge_type', ['tutorial', 'quiz', 'project']);
export const contextTypeEnum = pgEnum('context_type', ['tutorial', 'project', 'general']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  avatar_url: text('avatar_url'),
  subscription_plan: subscriptionPlanEnum('subscription_plan').notNull().default('free'),
  subscription_expires_at: timestamp('subscription_expires_at'),
  ai_queries_used_today: integer('ai_queries_used_today').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Tutorials table
export const tutorialsTable = pgTable('tutorials', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  content: text('content').notNull(),
  tech_stack: jsonb('tech_stack').notNull(),
  difficulty: difficultyEnum('difficulty').notNull(),
  estimated_time: integer('estimated_time').notNull(),
  thumbnail_url: text('thumbnail_url'),
  is_pro: boolean('is_pro').notNull().default(false),
  likes_count: integer('likes_count').notNull().default(0),
  views_count: integer('views_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Projects table
export const projectsTable = pgTable('projects', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  tech_stack: jsonb('tech_stack').notNull(),
  difficulty: difficultyEnum('difficulty').notNull(),
  preview_image_url: text('preview_image_url'),
  demo_url: text('demo_url'),
  github_url: text('github_url'),
  guide_pdf_url: text('guide_pdf_url'),
  is_pro: boolean('is_pro').notNull().default(false),
  download_count: integer('download_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Resources table
export const resourcesTable = pgTable('resources', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  file_url: text('file_url').notNull(),
  file_size: integer('file_size').notNull(),
  file_type: text('file_type').notNull(),
  thumbnail_url: text('thumbnail_url'),
  is_pro: boolean('is_pro').notNull().default(false),
  download_count: integer('download_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Roadmaps table
export const roadmapsTable = pgTable('roadmaps', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  nodes: jsonb('nodes').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Challenges table
export const challengesTable = pgTable('challenges', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  type: challengeTypeEnum('type').notNull(),
  points_reward: integer('points_reward').notNull(),
  tutorial_id: integer('tutorial_id').references(() => tutorialsTable.id),
  project_id: integer('project_id').references(() => projectsTable.id),
  quiz_data: jsonb('quiz_data'),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// User progress table
export const userProgressTable = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  tutorial_id: integer('tutorial_id').references(() => tutorialsTable.id),
  roadmap_id: integer('roadmap_id').references(() => roadmapsTable.id),
  progress_percentage: real('progress_percentage').notNull().default(0),
  completed_nodes: jsonb('completed_nodes').notNull().default('[]'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Chat messages table
export const chatMessagesTable = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  message: text('message').notNull(),
  response: text('response').notNull(),
  context_type: contextTypeEnum('context_type'),
  context_id: integer('context_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// User points table
export const userPointsTable = pgTable('user_points', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  challenge_id: integer('challenge_id').references(() => challengesTable.id).notNull(),
  points_earned: integer('points_earned').notNull(),
  earned_at: timestamp('earned_at').defaultNow().notNull(),
});

// Certificates table
export const certificatesTable = pgTable('certificates', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  challenge_id: integer('challenge_id').references(() => challengesTable.id).notNull(),
  certificate_url: text('certificate_url').notNull(),
  issued_at: timestamp('issued_at').defaultNow().notNull(),
});

// User likes table (for tutorials)
export const userLikesTable = pgTable('user_likes', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  tutorial_id: integer('tutorial_id').references(() => tutorialsTable.id).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// User downloads table (for tracking resource downloads)
export const userDownloadsTable = pgTable('user_downloads', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  resource_id: integer('resource_id').references(() => resourcesTable.id),
  project_id: integer('project_id').references(() => projectsTable.id),
  downloaded_at: timestamp('downloaded_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  progress: many(userProgressTable),
  chatMessages: many(chatMessagesTable),
  points: many(userPointsTable),
  certificates: many(certificatesTable),
  likes: many(userLikesTable),
  downloads: many(userDownloadsTable),
}));

export const tutorialsRelations = relations(tutorialsTable, ({ many }) => ({
  progress: many(userProgressTable),
  challenges: many(challengesTable),
  likes: many(userLikesTable),
}));

export const projectsRelations = relations(projectsTable, ({ many }) => ({
  challenges: many(challengesTable),
  downloads: many(userDownloadsTable),
}));

export const resourcesRelations = relations(resourcesTable, ({ many }) => ({
  downloads: many(userDownloadsTable),
}));

export const roadmapsRelations = relations(roadmapsTable, ({ many }) => ({
  progress: many(userProgressTable),
}));

export const challengesRelations = relations(challengesTable, ({ one, many }) => ({
  tutorial: one(tutorialsTable, {
    fields: [challengesTable.tutorial_id],
    references: [tutorialsTable.id],
  }),
  project: one(projectsTable, {
    fields: [challengesTable.project_id],
    references: [projectsTable.id],
  }),
  userPoints: many(userPointsTable),
  certificates: many(certificatesTable),
}));

export const userProgressRelations = relations(userProgressTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userProgressTable.user_id],
    references: [usersTable.id],
  }),
  tutorial: one(tutorialsTable, {
    fields: [userProgressTable.tutorial_id],
    references: [tutorialsTable.id],
  }),
  roadmap: one(roadmapsTable, {
    fields: [userProgressTable.roadmap_id],
    references: [roadmapsTable.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessagesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [chatMessagesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const userPointsRelations = relations(userPointsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userPointsTable.user_id],
    references: [usersTable.id],
  }),
  challenge: one(challengesTable, {
    fields: [userPointsTable.challenge_id],
    references: [challengesTable.id],
  }),
}));

export const certificatesRelations = relations(certificatesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [certificatesTable.user_id],
    references: [usersTable.id],
  }),
  challenge: one(challengesTable, {
    fields: [certificatesTable.challenge_id],
    references: [challengesTable.id],
  }),
}));

export const userLikesRelations = relations(userLikesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userLikesTable.user_id],
    references: [usersTable.id],
  }),
  tutorial: one(tutorialsTable, {
    fields: [userLikesTable.tutorial_id],
    references: [tutorialsTable.id],
  }),
}));

export const userDownloadsRelations = relations(userDownloadsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userDownloadsTable.user_id],
    references: [usersTable.id],
  }),
  resource: one(resourcesTable, {
    fields: [userDownloadsTable.resource_id],
    references: [resourcesTable.id],
  }),
  project: one(projectsTable, {
    fields: [userDownloadsTable.project_id],
    references: [projectsTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  tutorials: tutorialsTable,
  projects: projectsTable,
  resources: resourcesTable,
  roadmaps: roadmapsTable,
  challenges: challengesTable,
  userProgress: userProgressTable,
  chatMessages: chatMessagesTable,
  userPoints: userPointsTable,
  certificates: certificatesTable,
  userLikes: userLikesTable,
  userDownloads: userDownloadsTable,
};

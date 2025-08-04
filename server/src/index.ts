
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Schema imports
import {
  createUserInputSchema,
  loginInputSchema,
  createTutorialInputSchema,
  createProjectInputSchema,
  createResourceInputSchema,
  createRoadmapInputSchema,
  updateProgressInputSchema,
  sendMessageInputSchema,
  createChallengeInputSchema,
  subscriptionInputSchema,
  fileUploadInputSchema,
  searchInputSchema,
} from './schema';

// Handler imports
import { createUser, loginUser, getCurrentUser } from './handlers/auth';
import { 
  createTutorial, 
  getTutorials, 
  getTutorialBySlug, 
  likeTutorial, 
  searchTutorials, 
  getFeaturedTutorials 
} from './handlers/tutorials';
import { 
  createProject, 
  getProjects, 
  getProjectBySlug, 
  downloadProject, 
  searchProjects, 
  getFeaturedProjects 
} from './handlers/projects';
import { 
  createResource, 
  getResources, 
  getResourcesByCategory, 
  downloadResource, 
  searchResources 
} from './handlers/resources';
import { 
  createRoadmap, 
  getRoadmaps, 
  getRoadmapById, 
  updateUserProgress, 
  getUserProgress 
} from './handlers/roadmaps';
import { 
  sendMessage, 
  getChatHistory, 
  checkAIUsageLimit, 
  generateTutorialSummary 
} from './handlers/ai_tutor';
import { 
  createChallenge, 
  getActiveChallenges, 
  participateInChallenge, 
  getLeaderboard, 
  getUserRank, 
  issueCertificate 
} from './handlers/challenges';
import { 
  createSubscription, 
  cancelSubscription, 
  upgradeWinner, 
  checkProAccess 
} from './handlers/subscriptions';
import { getDashboardData, getAnalytics } from './handlers/dashboard';
import { 
  grantProAccess, 
  revokeProAccess, 
  getDetailedAnalytics, 
  moderateContent 
} from './handlers/admin';
import { 
  generateUploadUrl, 
  confirmFileUpload, 
  deleteFile 
} from './handlers/file_upload';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  getCurrentUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCurrentUser(input.userId)),

  // Tutorial routes
  createTutorial: publicProcedure
    .input(createTutorialInputSchema)
    .mutation(({ input }) => createTutorial(input)),

  getTutorials: publicProcedure
    .query(() => getTutorials()),

  getTutorialBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => getTutorialBySlug(input.slug)),

  likeTutorial: publicProcedure
    .input(z.object({ tutorialId: z.number(), userId: z.number() }))
    .mutation(({ input }) => likeTutorial(input.tutorialId, input.userId)),

  searchTutorials: publicProcedure
    .input(searchInputSchema)
    .query(({ input }) => searchTutorials(input)),

  getFeaturedTutorials: publicProcedure
    .query(() => getFeaturedTutorials()),

  // Project routes
  createProject: publicProcedure
    .input(createProjectInputSchema)
    .mutation(({ input }) => createProject(input)),

  getProjects: publicProcedure
    .query(() => getProjects()),

  getProjectBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => getProjectBySlug(input.slug)),

  downloadProject: publicProcedure
    .input(z.object({ projectId: z.number(), userId: z.number() }))
    .mutation(({ input }) => downloadProject(input.projectId, input.userId)),

  searchProjects: publicProcedure
    .input(searchInputSchema)
    .query(({ input }) => searchProjects(input)),

  getFeaturedProjects: publicProcedure
    .query(() => getFeaturedProjects()),

  // Resource routes
  createResource: publicProcedure
    .input(createResourceInputSchema)
    .mutation(({ input }) => createResource(input)),

  getResources: publicProcedure
    .query(() => getResources()),

  getResourcesByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(({ input }) => getResourcesByCategory(input.category)),

  downloadResource: publicProcedure
    .input(z.object({ resourceId: z.number(), userId: z.number() }))
    .mutation(({ input }) => downloadResource(input.resourceId, input.userId)),

  searchResources: publicProcedure
    .input(searchInputSchema)
    .query(({ input }) => searchResources(input)),

  // Roadmap routes
  createRoadmap: publicProcedure
    .input(createRoadmapInputSchema)
    .mutation(({ input }) => createRoadmap(input)),

  getRoadmaps: publicProcedure
    .query(() => getRoadmaps()),

  getRoadmapById: publicProcedure
    .input(z.object({ roadmapId: z.number() }))
    .query(({ input }) => getRoadmapById(input.roadmapId)),

  updateUserProgress: publicProcedure
    .input(z.object({ userId: z.number() }).merge(updateProgressInputSchema))
    .mutation(({ input }) => updateUserProgress(input.userId, input)),

  getUserProgress: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserProgress(input.userId)),

  // AI Tutor routes
  sendMessage: publicProcedure
    .input(z.object({ userId: z.number() }).merge(sendMessageInputSchema))
    .mutation(({ input }) => sendMessage(input.userId, input)),

  getChatHistory: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getChatHistory(input.userId)),

  checkAIUsageLimit: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => checkAIUsageLimit(input.userId)),

  generateTutorialSummary: publicProcedure
    .input(z.object({ tutorialId: z.number() }))
    .query(({ input }) => generateTutorialSummary(input.tutorialId)),

  // Challenge routes
  createChallenge: publicProcedure
    .input(createChallengeInputSchema)
    .mutation(({ input }) => createChallenge(input)),

  getActiveChallenges: publicProcedure
    .query(() => getActiveChallenges()),

  participateInChallenge: publicProcedure
    .input(z.object({ userId: z.number(), challengeId: z.number() }))
    .mutation(({ input }) => participateInChallenge(input.userId, input.challengeId)),

  getLeaderboard: publicProcedure
    .query(() => getLeaderboard()),

  getUserRank: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserRank(input.userId)),

  issueCertificate: publicProcedure
    .input(z.object({ userId: z.number(), challengeId: z.number() }))
    .mutation(({ input }) => issueCertificate(input.userId, input.challengeId)),

  // Subscription routes
  createSubscription: publicProcedure
    .input(z.object({ userId: z.number() }).merge(subscriptionInputSchema))
    .mutation(({ input }) => createSubscription(input.userId, input)),

  cancelSubscription: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => cancelSubscription(input.userId)),

  upgradeWinner: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => upgradeWinner(input.userId)),

  checkProAccess: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => checkProAccess(input.userId)),

  // Dashboard routes
  getDashboardData: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getDashboardData(input.userId)),

  getAnalytics: publicProcedure
    .query(() => getAnalytics()),

  // Admin routes
  grantProAccess: publicProcedure
    .input(z.object({ userId: z.number(), duration: z.number() }))
    .mutation(({ input }) => grantProAccess(input.userId, input.duration)),

  revokeProAccess: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(({ input }) => revokeProAccess(input.userId)),

  getDetailedAnalytics: publicProcedure
    .query(() => getDetailedAnalytics()),

  moderateContent: publicProcedure
    .input(z.object({ 
      contentId: z.number(),
      contentType: z.enum(['tutorial', 'project', 'resource']),
      action: z.enum(['approve', 'reject'])
    }))
    .mutation(({ input }) => moderateContent(input.contentId, input.contentType, input.action)),

  // File upload routes
  generateUploadUrl: publicProcedure
    .input(fileUploadInputSchema)
    .mutation(({ input }) => generateUploadUrl(input)),

  confirmFileUpload: publicProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(({ input }) => confirmFileUpload(input.fileId)),

  deleteFile: publicProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(({ input }) => deleteFile(input.fileId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`ThinkHub TRPC server listening at port: ${port}`);
}

start();


import { db } from '../db';
import { challengesTable, userPointsTable, usersTable, certificatesTable, tutorialsTable, projectsTable } from '../db/schema';
import { type CreateChallengeInput, type Challenge, type LeaderboardEntry, type Certificate } from '../schema';
import { eq, and, desc, sql, gte, lte, sum, count } from 'drizzle-orm';

export async function createChallenge(input: CreateChallengeInput): Promise<Challenge> {
  try {
    // Validate foreign key references if provided
    if (input.tutorial_id) {
      const tutorial = await db.select()
        .from(tutorialsTable)
        .where(eq(tutorialsTable.id, input.tutorial_id))
        .execute();
      
      if (tutorial.length === 0) {
        throw new Error(`Tutorial with id ${input.tutorial_id} does not exist`);
      }
    }

    if (input.project_id) {
      const project = await db.select()
        .from(projectsTable)
        .where(eq(projectsTable.id, input.project_id))
        .execute();
      
      if (project.length === 0) {
        throw new Error(`Project with id ${input.project_id} does not exist`);
      }
    }

    // Insert challenge record
    const result = await db.insert(challengesTable)
      .values({
        title: input.title,
        description: input.description,
        type: input.type,
        points_reward: input.points_reward,
        tutorial_id: input.tutorial_id,
        project_id: input.project_id,
        quiz_data: input.quiz_data,
        start_date: input.start_date,
        end_date: input.end_date,
        is_active: true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Challenge creation failed:', error);
    throw error;
  }
}

export async function getActiveChallenges(): Promise<Challenge[]> {
  try {
    const now = new Date();
    
    const results = await db.select()
      .from(challengesTable)
      .where(
        and(
          eq(challengesTable.is_active, true),
          lte(challengesTable.start_date, now),
          gte(challengesTable.end_date, now)
        )
      )
      .orderBy(desc(challengesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch active challenges:', error);
    throw error;
  }
}

export async function participateInChallenge(userId: number, challengeId: number): Promise<{ success: boolean; pointsEarned: number }> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    
    if (user.length === 0) {
      throw new Error(`User with id ${userId} does not exist`);
    }

    // Verify challenge exists and is active
    const challenge = await db.select()
      .from(challengesTable)
      .where(eq(challengesTable.id, challengeId))
      .execute();
    
    if (challenge.length === 0) {
      throw new Error(`Challenge with id ${challengeId} does not exist`);
    }

    const challengeData = challenge[0];
    const now = new Date();
    
    if (!challengeData.is_active || challengeData.start_date > now || challengeData.end_date < now) {
      throw new Error('Challenge is not currently active');
    }

    // Check if user already participated
    const existingParticipation = await db.select()
      .from(userPointsTable)
      .where(
        and(
          eq(userPointsTable.user_id, userId),
          eq(userPointsTable.challenge_id, challengeId)
        )
      )
      .execute();

    if (existingParticipation.length > 0) {
      throw new Error('User has already participated in this challenge');
    }

    // Record participation and award points
    await db.insert(userPointsTable)
      .values({
        user_id: userId,
        challenge_id: challengeId,
        points_earned: challengeData.points_reward
      })
      .execute();

    return {
      success: true,
      pointsEarned: challengeData.points_reward
    };
  } catch (error) {
    console.error('Challenge participation failed:', error);
    throw error;
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    // Get user points with user details
    const results = await db.select({
      user_id: usersTable.id,
      user_name: usersTable.full_name,
      user_avatar: usersTable.avatar_url,
      total_points: sum(userPointsTable.points_earned).mapWith(Number),
      weekly_points: sql<number>`
        COALESCE(SUM(CASE 
          WHEN ${userPointsTable.earned_at} >= NOW() - INTERVAL '7 days' 
          THEN ${userPointsTable.points_earned} 
          ELSE 0 
        END), 0)
      `.mapWith(Number)
    })
      .from(usersTable)
      .leftJoin(userPointsTable, eq(usersTable.id, userPointsTable.user_id))
      .groupBy(usersTable.id, usersTable.full_name, usersTable.avatar_url)
      .having(sql`SUM(${userPointsTable.points_earned}) > 0`)
      .orderBy(desc(sum(userPointsTable.points_earned)))
      .limit(100)
      .execute();

    // Add rank and badges (simplified badge system)
    return results.map((result, index) => ({
      id: index + 1,
      user_id: result.user_id,
      user_name: result.user_name,
      user_avatar: result.user_avatar,
      total_points: result.total_points || 0,
      weekly_points: result.weekly_points || 0,
      rank: index + 1,
      badges: result.total_points >= 1000 ? ['high_achiever'] : 
              result.total_points >= 500 ? ['achiever'] : 
              result.total_points >= 100 ? ['participant'] : [],
      updated_at: new Date()
    }));
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    throw error;
  }
}

export async function getUserRank(userId: number): Promise<{ rank: number; totalPoints: number; weeklyPoints: number }> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    
    if (user.length === 0) {
      throw new Error(`User with id ${userId} does not exist`);
    }

    // Get user's total points
    const userPointsResult = await db.select({
      total_points: sum(userPointsTable.points_earned).mapWith(Number),
      weekly_points: sql<number>`
        COALESCE(SUM(CASE 
          WHEN ${userPointsTable.earned_at} >= NOW() - INTERVAL '7 days' 
          THEN ${userPointsTable.points_earned} 
          ELSE 0 
        END), 0)
      `.mapWith(Number)
    })
      .from(userPointsTable)
      .where(eq(userPointsTable.user_id, userId))
      .execute();

    const totalPoints = userPointsResult[0]?.total_points || 0;
    const weeklyPoints = userPointsResult[0]?.weekly_points || 0;

    // Calculate rank by counting users with more points
    const rankResult = await db.select({
      rank: count().mapWith(Number)
    })
      .from(sql`(
        SELECT ${usersTable.id}
        FROM ${usersTable}
        LEFT JOIN ${userPointsTable} ON ${usersTable.id} = ${userPointsTable.user_id}
        GROUP BY ${usersTable.id}
        HAVING COALESCE(SUM(${userPointsTable.points_earned}), 0) > ${totalPoints}
      ) AS higher_users`)
      .execute();

    const rank = (rankResult[0]?.rank || 0) + 1;

    return {
      rank,
      totalPoints,
      weeklyPoints
    };
  } catch (error) {
    console.error('Failed to get user rank:', error);
    throw error;
  }
}

export async function issueCertificate(userId: number, challengeId: number): Promise<Certificate> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    
    if (user.length === 0) {
      throw new Error(`User with id ${userId} does not exist`);
    }

    // Verify challenge exists
    const challenge = await db.select()
      .from(challengesTable)
      .where(eq(challengesTable.id, challengeId))
      .execute();
    
    if (challenge.length === 0) {
      throw new Error(`Challenge with id ${challengeId} does not exist`);
    }

    // Verify user participated in the challenge
    const participation = await db.select()
      .from(userPointsTable)
      .where(
        and(
          eq(userPointsTable.user_id, userId),
          eq(userPointsTable.challenge_id, challengeId)
        )
      )
      .execute();

    if (participation.length === 0) {
      throw new Error('User has not participated in this challenge');
    }

    // Check if certificate already exists
    const existingCertificate = await db.select()
      .from(certificatesTable)
      .where(
        and(
          eq(certificatesTable.user_id, userId),
          eq(certificatesTable.challenge_id, challengeId)
        )
      )
      .execute();

    if (existingCertificate.length > 0) {
      return existingCertificate[0];
    }

    // Generate certificate URL (in real app, this would be generated by a service)
    const certificateUrl = `https://certificates.devchallenge.com/challenge-${challengeId}-user-${userId}.pdf`;

    // Issue new certificate
    const result = await db.insert(certificatesTable)
      .values({
        user_id: userId,
        challenge_id: challengeId,
        certificate_url: certificateUrl
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Certificate issuance failed:', error);
    throw error;
  }
}

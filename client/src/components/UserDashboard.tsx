
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import type { User } from '../../../server/src/schema';

interface UserDashboardProps {
  user: User;
}

interface DashboardData {
  user: User;
  progress: Array<{
    id: number;
    tutorial_id: number | null;
    roadmap_id: number | null;
    progress_percentage: number;
    completed_nodes: string[];
  }>;
  recentChatMessages: number;
  downloadHistory: Array<{
    id: number;
    title: string;
    type: string;
    downloadedAt: Date;
  }>;
  userRank: {
    rank: number;
    totalPoints: number;
    weeklyPoints: number;
  };
  certificates: Array<{
    id: number;
    user_id: number;
    challenge_id: number;
    certificate_url: string;
    issued_at: Date;
  }>;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await trpc.getDashboardData.query({ userId: user.id });
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-8"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-12 bg-slate-200 rounded mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-2xl font-semibold text-slate-700 mb-2">
            Failed to load dashboard
          </h3>
          <p className="text-slate-500 mb-4">
            There was an error loading your dashboard data.
          </p>
          <Button onClick={loadDashboardData}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { progress, recentChatMessages, downloadHistory, userRank, certificates } = dashboardData;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
              {user.full_name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Welcome back, {user.full_name.split(' ')[0]}! 👋
            </h1>
            <p className="text-slate-600">
              {user.subscription_plan === 'pro' ? '✨ Pro Member' : '🆓 Free Account'} • 
              Member since {user.created_at.toLocaleDateString()}
            </p>
          </div>
        </div>
        
        {user.subscription_plan !== 'pro' && (
          <Button className="bg-gradient-to-r from-yellow-400 to-orange-500">
            ✨ Upgrade to Pro
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-2xl">📚</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {progress.filter(p => p.tutorial_id).length}
                </div>
                <div className="text-sm text-slate-500">Tutorials in Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-2xl">🗺️</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {progress.filter(p => p.roadmap_id).length}
                </div>
                <div className="text-sm text-slate-500">Active Roadmaps</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {user.ai_queries_used_today}
                </div>
                <div className="text-sm text-slate-500">
                  AI Queries Today ({user.subscription_plan === 'pro' ? 'Unlimited' : '10 max'})
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <span className="text-2xl">🏆</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  #{userRank.rank}
                </div>
                <div className="text-sm text-slate-500">
                  Global Rank ({userRank.totalPoints} pts)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="progress">📊 Progress</TabsTrigger>
          <TabsTrigger value="downloads">⬇️ Downloads</TabsTrigger>
          <TabsTrigger value="certificates">🏆 Certificates</TabsTrigger>
          <TabsTrigger value="challenges">🎯 Challenges</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Learning Progress */}
            <Card>
              <CardHeader>
                <CardTitle>📚 Learning Progress</CardTitle>
                <CardDescription>Your current tutorials and roadmaps</CardDescription>
              </CardHeader>
              <CardContent>
                {progress.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎯</div>
                    <p className="text-slate-500 mb-4">No active learning paths yet</p>
                    <Button>Browse Tutorials</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {progress.slice(0, 5).map((item) => (
                      <div key={item.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {item.tutorial_id ? `Tutorial #${item.tutorial_id}` : `Roadmap #${item.roadmap_id}`}
                          </span>
                          <span>{item.progress_percentage}%</span>
                        </div>
                        <Progress value={item.progress_percentage} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Activity */}
            <Card>
              <CardHeader>
                <CardTitle>📈 Weekly Activity</CardTitle>
                <CardDescription>Your learning activity this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span>🤖</span>
                      <span className="text-sm">AI Chat Messages</span>
                    </div>
                    <Badge>{recentChatMessages}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span>⬇️</span>
                      <span className="text-sm">Downloads</span>
                    </div>
                    <Badge>{downloadHistory.length}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span>🏆</span>
                      <span className="text-sm">Points This Week</span>
                    </div>
                    <Badge>{userRank.weeklyPoints}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Downloads Tab */}
        <TabsContent value="downloads" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>⬇️ Download History</CardTitle>
              <CardDescription>Your recently downloaded resources and projects</CardDescription>
            </CardHeader>
            <CardContent>
              {downloadHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="text-slate-500 mb-4">No downloads yet</p>
                  <Button>Browse Resources</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {downloadHistory.map((download) => (
                    <div key={download.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-100 rounded">
                          {download.type === 'project' ? '🛠️' : '📄'}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{download.title}</div>
                          <div className="text-sm text-slate-500">
                            {download.type} • {download.downloadedAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Re-download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>🏆 Certificates</CardTitle>
              <CardDescription>Your earned certificates and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🎓</div>
                  <p className="text-slate-500 mb-4">No certificates earned yet</p>
                  <Button>View Challenges</Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <Card key={cert.id} className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
                      
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">🏆</div>
                        <h3 className="font-semibold mb-1">Challenge Certificate</h3>
                        <p className="text-sm text-slate-600 mb-3">
                          Issued on {cert.issued_at.toLocaleDateString()}
                        </p>
                        <Button size="sm" variant="outline">
                          Download PDF
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🎯 Current Rank</CardTitle>
                <CardDescription>Your position on the leaderboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    #{userRank.rank}
                  </div>
                  <div className="text-lg text-slate-700 mb-4">
                    {userRank.totalPoints} Total Points
                  </div>
                  <div className="text-sm text-slate-500">
                    {userRank.weeklyPoints} points earned this week
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🏆 Weekly Challenges</CardTitle>
                <CardDescription>Participate in challenges to earn points</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="text-4xl mb-4">🎪</div>
                  <p className="text-slate-500 mb-4">No active challenges</p>
                  <Button>View All Challenges</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>👤 Profile Settings</CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <div className="mt-1 p-2 bg-slate-50 rounded border">
                    {user.full_name}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <div className="mt-1 p-2 bg-slate-50 rounded border">
                    {user.email}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Subscription</label>
                  <div className="mt-1">
                    <Badge className={user.subscription_plan === 'pro' ? 'bg-yellow-500' : 'bg-slate-500'}>
                      {user.subscription_plan.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <Button>Edit Profile</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔔 Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email notifications</span>
                  <Badge variant="outline">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI suggestions</span>
                  <Badge variant="outline">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progress reminders</span>
                  <Badge variant="outline">Enabled</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Manage Preferences
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

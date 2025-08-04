
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { Roadmap, UserProgress, User } from '../../../server/src/schema';

interface InteractiveRoadmapsProps {
  user: User | null;
}

export function InteractiveRoadmaps({ user }: InteractiveRoadmapsProps) {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRoadmaps = useCallback(async () => {
    setIsLoading(true);
    try {
      const allRoadmaps = await trpc.getRoadmaps.query();
      setRoadmaps(allRoadmaps);
      
      if (user) {
        const progress = await trpc.getUserProgress.query({ userId: user.id });
        setUserProgress(progress);
      }
    } catch (error) {
      console.error('Failed to load roadmaps:', error);
      setRoadmaps([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRoadmaps();
  }, [loadRoadmaps]);

  const handleNodeComplete = async (roadmapId: number, nodeId: string) => {
    if (!user) return;

    try {
      const currentProgress = userProgress.find((p: UserProgress) => p.roadmap_id === roadmapId);
      const completedNodes = currentProgress ? [...currentProgress.completed_nodes, nodeId] : [nodeId];
      const roadmap = roadmaps.find((r: Roadmap) => r.id === roadmapId);
      const progressPercentage = roadmap ? Math.round((completedNodes.length / roadmap.nodes.length) * 100) : 0;

      await trpc.updateUserProgress.mutate({
        userId: user.id,
        roadmap_id: roadmapId,
        progress_percentage: progressPercentage,
        completed_nodes: completedNodes,
      });

      // Update local state
      setUserProgress((prev: UserProgress[]) => {
        const updated = prev.filter((p: UserProgress) => p.roadmap_id !== roadmapId);
        return [...updated, {
          id: Date.now(),
          user_id: user.id,
          tutorial_id: null,
          roadmap_id: roadmapId,
          progress_percentage: progressPercentage,
          completed_nodes: completedNodes,
          created_at: new Date(),
          updated_at: new Date(),
        }];
      });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const getUserProgress = (roadmapId: number) => {
    return userProgress.find((p: UserProgress) => p.roadmap_id === roadmapId);
  };

  const isNodeCompleted = (roadmapId: number, nodeId: string) => {
    const progress = getUserProgress(roadmapId);
    return progress ? progress.completed_nodes.includes(nodeId) : false;
  };

  const roadmapCategories = [
    { name: 'Frontend', icon: '🎨', color: 'from-blue-500 to-cyan-500' },
    { name: 'Backend', icon: '⚙️', color: 'from-green-500 to-teal-500' },
    { name: 'Full Stack', icon: '🌐', color: 'from-purple-500 to-pink-500' },
    { name: 'Mobile', icon: '📱', color: 'from-orange-500 to-red-500' },
    { name: 'DevOps', icon: '🔧', color: 'from-gray-500 to-slate-500' },
    { name: 'AI/ML', icon: '🤖', color: 'from-indigo-500 to-purple-500' },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-96 mx-auto"></div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-slate-200 rounded mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          🗺️ Interactive Roadmaps
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Follow structured learning paths to master any technology stack. 
          Track your progress and unlock achievements along the way.
        </p>
      </div>

      {/* Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-12">
        {roadmapCategories.map((category) => {
          const categoryRoadmaps = roadmaps.filter((r: Roadmap) => r.category === category.name);
          return (
            <Card 
              key={category.name}
              className="text-center cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <CardContent className="p-4">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r ${category.color} flex items-center justify-center text-2xl`}>
                  {category.icon}
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{category.name}</h3>
                <p className="text-sm text-slate-500">
                  {categoryRoadmaps.length} roadmap{categoryRoadmaps.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedRoadmap ? (
        /* Detailed Roadmap View */
        <div>
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setSelectedRoadmap(null)}
              className="mb-4"
            >
              ← Back to Roadmaps
            </Button>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{selectedRoadmap.title}</CardTitle>
                  <CardDescription className="text-lg">
                    {selectedRoadmap.description}
                  </CardDescription>
                  <Badge className="mt-2" variant="outline">
                    {selectedRoadmap.category}
                  </Badge>
                </div>
                {user && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {getUserProgress(selectedRoadmap.id)?.progress_percentage || 0}%
                    </div>
                    <div className="text-sm text-slate-500">Complete</div>
                  </div>
                )}
              </div>
              {user && (
                <Progress 
                  value={getUserProgress(selectedRoadmap.id)?.progress_percentage || 0} 
                  className="mt-4"
                />
              )}
            </CardHeader>
          </Card>

          {/* Roadmap Nodes */}
          <div className="grid gap-4">
            {selectedRoadmap.nodes.map((node, index) => {
              const isCompleted = user ? isNodeCompleted(selectedRoadmap.id, node.id) : false;
              const isPrevCompleted = index === 0 || (user ? isNodeCompleted(selectedRoadmap.id, selectedRoadmap.nodes[index - 1].id) : false);
              const isAccessible = index === 0 || isPrevCompleted;

              return (
                <Card 
                  key={node.id}
                  className={`transition-all duration-200 ${
                    isCompleted 
                      ? 'border-green-300 bg-green-50' 
                      : isAccessible 
                        ? 'border-blue-300 hover:shadow-md' 
                        : 'border-slate-200 opacity-60'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : isAccessible
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-300 text-slate-500'
                          }`}>
                            {isCompleted ? '✓' : index + 1}
                          </div>
                          <h3 className="text-xl font-semibold text-slate-800">
                            {node.title}
                          </h3>
                        </div>
                        
                        <p className="text-slate-600 mb-4 ml-11">
                          {node.description}
                        </p>

                        <div className="flex items-center space-x-4 ml-11">
                          {node.tutorial_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isAccessible}
                            >
                              📚 Tutorial
                            </Button>
                          )}
                          {node.project_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isAccessible}
                            >
                              🛠️ Project
                            </Button>
                          )}
                          {user && isAccessible && !isCompleted && (
                            <Button
                              size="sm"
                              onClick={() => handleNodeComplete(selectedRoadmap.id, node.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              ✓ Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* Roadmaps Overview */
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="all">All</TabsTrigger>
            {roadmapCategories.map((category) => (
              <TabsTrigger key={category.name} value={category.name}>
                {category.icon} {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roadmaps.map((roadmap: Roadmap) => {
                const progress = user ? getUserProgress(roadmap.id) : null;
                return (
                  <Card 
                    key={roadmap.id}
                    className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    onClick={() => setSelectedRoadmap(roadmap)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{roadmap.title}</CardTitle>
                          <CardDescription className="line-clamp-3">
                            {roadmap.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <Badge variant="outline">{roadmap.category}</Badge>
                        <span className="text-sm text-slate-500">
                          {roadmap.nodes.length} steps
                        </span>
                      </div>
                    </CardHeader>

                    {user && progress && (
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-medium">{progress.progress_percentage}%</span>
                          </div>
                          <Progress value={progress.progress_percentage} />
                          <div className="text-xs text-slate-500">
                            {progress.completed_nodes.length} of {roadmap.nodes.length} completed
                          </div>
                        </div>
                      </CardContent>
                    )}

                    {!user && (
                      <CardContent>
                        <div className="text-center text-sm text-slate-500">
                          Sign in to track your progress
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {roadmapCategories.map((category) => (
            <TabsContent key={category.name} value={category.name} className="mt-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roadmaps
                  .filter((roadmap: Roadmap) => roadmap.category === category.name)
                  .map((roadmap: Roadmap) => {
                    const progress = user ? getUserProgress(roadmap.id) : null;
                    return (
                      <Card 
                        key={roadmap.id}
                        className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                        onClick={() => setSelectedRoadmap(roadmap)}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg mb-2">{roadmap.title}</CardTitle>
                          <CardDescription className="line-clamp-3">
                            {roadmap.description}
                          </CardDescription>
                          <div className="flex items-center justify-between mt-4">
                            <Badge variant="outline">{roadmap.category}</Badge>
                            <span className="text-sm text-slate-500">
                              {roadmap.nodes.length} steps
                            </span>
                          </div>
                        </CardHeader>

                        {user && progress && (
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span className="font-medium">{progress.progress_percentage}%</span>
                              </div>
                              <Progress value={progress.progress_percentage} />
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Call to Action */}
      {!user && (
        <div className="text-center mt-12 py-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <h3 className="text-2xl font-bold text-slate-800 mb-4">
            Start Your Learning Journey! 🚀
          </h3>
          <p className="text-slate-600 mb-6">
            Sign up to track your progress, earn achievements, and unlock advanced roadmaps.
          </p>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
            🎯 Create Free Account
          </Button>
        </div>
      )}
    </div>
  );
}

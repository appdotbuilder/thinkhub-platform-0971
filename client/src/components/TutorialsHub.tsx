
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { Tutorial, User, SearchInput } from '../../../server/src/schema';

interface TutorialsHubProps {
  user: User | null;
}

export function TutorialsHub({ user }: TutorialsHubProps) {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTechStack, setSelectedTechStack] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [likedTutorials, setLikedTutorials] = useState<Set<number>>(new Set());

  const loadTutorials = useCallback(async () => {
    setIsLoading(true);
    try {
      if (searchQuery.trim() || selectedDifficulty !== 'all' || selectedTechStack !== 'all') {
        // Search with filters
        const searchInput: SearchInput = {
          query: searchQuery.trim() || '',
          type: 'tutorials',
          filters: {
            difficulty: selectedDifficulty !== 'all' ? selectedDifficulty as 'beginner' | 'intermediate' | 'advanced' : undefined,
            tech_stack: selectedTechStack !== 'all' ? [selectedTechStack] : undefined,
          }
        };
        const results = await trpc.searchTutorials.query(searchInput);
        setTutorials(results);
      } else {
        // Load all tutorials
        const allTutorials = await trpc.getTutorials.query();
        setTutorials(allTutorials);
      }
    } catch (error) {
      console.error('Failed to load tutorials:', error);
      setTutorials([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedDifficulty, selectedTechStack]);

  useEffect(() => {
    loadTutorials();
  }, [loadTutorials]);

  const handleLikeTutorial = async (tutorialId: number) => {
    if (!user) return;

    try {
      const result = await trpc.likeTutorial.mutate({
        tutorialId,
        userId: user.id
      });

      // Update local state
      const newLikedTutorials = new Set(likedTutorials);
      if (result.liked) {
        newLikedTutorials.add(tutorialId);
      } else {
        newLikedTutorials.delete(tutorialId);
      }
      setLikedTutorials(newLikedTutorials);

      // Update tutorial likes count in state
      setTutorials((prev: Tutorial[]) =>
        prev.map((tutorial: Tutorial) =>
          tutorial.id === tutorialId
            ? { ...tutorial, likes_count: result.likesCount }
            : tutorial
        )
      );
    } catch (error) {
      console.error('Failed to like tutorial:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get unique tech stacks from tutorials for filter
  const uniqueTechStacks = [...new Set(tutorials.flatMap((tutorial: Tutorial) => tutorial.tech_stack))];

  const filteredTutorials = tutorials;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          📚 Tutorials Hub
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Master new technologies with our AI-enhanced tutorials. From beginner to advanced, 
          find exactly what you need to level up your skills.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="🔍 Search tutorials..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">🌱 Beginner</SelectItem>
              <SelectItem value="intermediate">🚀 Intermediate</SelectItem>
              <SelectItem value="advanced">⚡ Advanced</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTechStack} onValueChange={setSelectedTechStack}>
            <SelectTrigger>
              <SelectValue placeholder="Tech Stack" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technologies</SelectItem>
              {uniqueTechStacks.slice(0, 10).map((stack: string) => (
                <SelectItem key={stack} value={stack}>{stack}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-slate-200 rounded mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-slate-200 rounded w-16"></div>
                  <div className="h-6 bg-slate-200 rounded w-12"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && filteredTutorials.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-semibold text-slate-700 mb-2">No tutorials found</h3>
          <p className="text-slate-500 mb-4">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
          <Button
            onClick={() => {
              setSearchQuery('');
              setSelectedDifficulty('all');
              setSelectedTechStack('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Tutorials Grid */}
      {!isLoading && filteredTutorials.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutorials.map((tutorial: Tutorial) => (
            <Card key={tutorial.id} className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-slate-800 mb-2 line-clamp-2">
                      {tutorial.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {tutorial.description}
                    </CardDescription>
                  </div>
                  {tutorial.is_pro && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white ml-2">
                      PRO
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Tech Stack */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {tutorial.tech_stack.slice(0, 3).map((tech: string) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                  {tutorial.tech_stack.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{tutorial.tech_stack.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                  <div className="flex items-center space-x-3">
                    <Badge className={getDifficultyColor(tutorial.difficulty)}>
                      {tutorial.difficulty}
                    </Badge>
                    <span className="flex items-center">
                      ⏱️ {tutorial.estimated_time}m
                    </span>
                    <span className="flex items-center">
                      👁️ {tutorial.views_count}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Button 
                    size="sm" 
                    className="flex-1 mr-2"
                    disabled={tutorial.is_pro && user?.subscription_plan !== 'pro'}
                  >
                    {tutorial.is_pro && user?.subscription_plan !== 'pro' ? '🔒 Pro Only' : '📖 Start Learning'}
                  </Button>
                  
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLikeTutorial(tutorial.id)}
                      className={`${likedTutorials.has(tutorial.id) ? 'text-red-500 border-red-300' : ''}`}
                    >
                      ❤️ {tutorial.likes_count}
                    </Button>
                  )}
                </div>

                {!user && tutorial.is_pro && (
                  <div className="mt-2 text-xs text-slate-500 text-center">
                    Sign in to access Pro content
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Call to Action */}
      {!isLoading && filteredTutorials.length > 0 && (
        <div className="text-center mt-12 py-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <h3 className="text-2xl font-bold text-slate-800 mb-4">
            Want More? 🚀
          </h3>
          <p className="text-slate-600 mb-6">
            Upgrade to Pro for unlimited access to all tutorials, AI assistance, and exclusive content.
          </p>
          {user?.subscription_plan !== 'pro' && (
            <Button className="bg-gradient-to-r from-yellow-400 to-orange-500">
              ✨ Upgrade to Pro
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

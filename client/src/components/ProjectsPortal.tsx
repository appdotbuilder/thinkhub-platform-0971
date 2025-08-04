
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { Project, User, SearchInput } from '../../../server/src/schema';

interface ProjectsPortalProps {
  user: User | null;
}

export function ProjectsPortal({ user }: ProjectsPortalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTechStack, setSelectedTechStack] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      if (searchQuery.trim() || selectedDifficulty !== 'all' || selectedTechStack !== 'all') {
        // Search with filters
        const searchInput: SearchInput = {
          query: searchQuery.trim() || '',
          type: 'projects',
          filters: {
            difficulty: selectedDifficulty !== 'all' ? selectedDifficulty as 'beginner' | 'intermediate' | 'advanced' : undefined,
            tech_stack: selectedTechStack !== 'all' ? [selectedTechStack] : undefined,
          }
        };
        const results = await trpc.searchProjects.query(searchInput);
        setProjects(results);
      } else {
        // Load all projects
        const allProjects = await trpc.getProjects.query();
        setProjects(allProjects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedDifficulty, selectedTechStack]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDownloadProject = async (projectId: number) => {
    if (!user) return;

    try {
      await trpc.downloadProject.mutate({
        projectId,
        userId: user.id
      });
      
      // Update download count in local state
      setProjects((prev: Project[]) =>
        prev.map((project: Project) =>
          project.id === projectId
            ? { ...project, download_count: project.download_count + 1 }
            : project
        )
      );
    } catch (error) {
      console.error('Failed to download project:', error);
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

  // Get unique tech stacks from projects for filter
  const uniqueTechStacks = [...new Set(projects.flatMap((project: Project) => project.tech_stack))];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          🛠️ Projects Portal
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Build your portfolio with real-world projects. Complete with source code, 
          live demos, and step-by-step guides to help you learn by doing.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="🔍 Search projects..."
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

      {/* Project Categories */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {[
          { name: 'Web Apps', icon: '🌐', count: projects.filter((p: Project) => p.tech_stack.some((t: string) => ['React', 'Vue', 'Angular', 'Next.js'].includes(t))).length },
          { name: 'Mobile Apps', icon: '📱', count: projects.filter((p: Project) => p.tech_stack.some((t: string) => ['React Native', 'Flutter', 'Swift', 'Kotlin'].includes(t))).length },
          { name: 'AI/ML', icon: '🤖', count: projects.filter((p: Project) => p.tech_stack.some((t: string) => ['Python', 'TensorFlow', 'PyTorch', 'OpenAI'].includes(t))).length },
          { name: 'Backend', icon: '⚙️', count: projects.filter((p: Project) => p.tech_stack.some((t: string) => ['Node.js', 'Express', 'FastAPI', 'Django'].includes(t))).length },
        ].map((category) => (
          <Card key={category.name} className="text-center cursor-pointer hover:shadow-md transition-all duration-200 border-slate-200">
            <CardContent className="p-4">
              <div className="text-3xl mb-2">{category.icon}</div>
              <h3 className="font-semibold text-slate-800">{category.name}</h3>
              <p className="text-sm text-slate-500">{category.count} projects</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-slate-200 rounded-t-lg"></div>
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-slate-200 rounded mb-4"></div>
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
      {!isLoading && projects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-semibold text-slate-700 mb-2">No projects found</h3>
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

      {/* Projects Grid */}
      {!isLoading && projects.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: Project) => (
            <Card key={project.id} className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-md overflow-hidden">
              {/* Project Preview Image */}
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
                {project.preview_image_url ? (
                  <img
                    src={project.preview_image_url}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-6xl opacity-50">🛠️</div>
                  </div>
                )}
                {project.is_pro && (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                    PRO
                  </Badge>
                )}
              </div>

              <CardHeader>
                <CardTitle className="text-lg text-slate-800 line-clamp-2">
                  {project.title}
                </CardTitle>
                <CardDescription className="line-clamp-3">
                  {project.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* Tech Stack */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.tech_stack.slice(0, 3).map((tech: string) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                  {project.tech_stack.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{project.tech_stack.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                  <Badge className={getDifficultyColor(project.difficulty)}>
                    {project.difficulty}
                  </Badge>
                  <span className="flex items-center">
                    ⬇️ {project.download_count} downloads
                  </span>
                </div>

                {/* Action Links */}
                <div className="flex flex-wrap gap-2 mb-4 text-sm">
                  {project.demo_url && (
                    <a
                      href={project.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      🔗 Live Demo
                    </a>
                  )}
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 hover:underline flex items-center"
                    >
                      📂 Source Code
                    </a>
                  )}
                  {project.guide_pdf_url && (
                    <a
                      href={project.guide_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline flex items-center"
                    >
                      📄 Guide
                    </a>
                  )}
                </div>

                {/* Download Button */}
                <Button 
                  onClick={() => handleDownloadProject(project.id)}
                  disabled={!user || (project.is_pro && user?.subscription_plan !== 'pro')}
                  className="w-full"
                  size="sm"
                >
                  {!user ? (
                    '🔒 Sign in to Download'
                  ) : project.is_pro && user.subscription_plan !== 'pro' ? (
                    '🔒 Pro Only'
                  ) : (
                    '⬇️ Download Project'
                  )}
                </Button>

                {!user && (
                  <div className="mt-2 text-xs text-slate-500 text-center">
                    Create a free account to download projects
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Call to Action */}
      {!isLoading && projects.length > 0 && (
        <div className="text-center mt-12 py-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <h3 className="text-2xl font-bold text-slate-800 mb-4">
            Build Something Amazing! 🚀
          </h3>
          <p className="text-slate-600 mb-6">
            Download project templates, follow guided tutorials, and create portfolio-worthy applications.
          </p>
          {user?.subscription_plan !== 'pro' && (
            <Button className="bg-gradient-to-r from-yellow-400 to-orange-500">
              ✨ Upgrade for Exclusive Projects
            </Button>
          )}
        </div>
      )}
    </div>
  );
}


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import type { Tutorial, Project } from '../../../server/src/schema';

interface LandingHeroProps {
  onGetStarted: () => void;
}

export function LandingHero({ onGetStarted }: LandingHeroProps) {
  const [featuredTutorials, setFeaturedTutorials] = useState<Tutorial[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedContent = async () => {
      try {
        const [tutorials, projects] = await Promise.all([
          trpc.getFeaturedTutorials.query(),
          trpc.getFeaturedProjects.query()
        ]);
        setFeaturedTutorials(tutorials);
        setFeaturedProjects(projects);
      } catch (error) {
        console.error('Failed to load featured content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeaturedContent();
  }, []);

  const features = [
    {
      icon: '📚',
      title: 'Interactive Tutorials',
      description: 'Learn with AI-enhanced tutorials that adapt to your pace'
    },
    {
      icon: '🛠️',
      title: 'Real-World Projects',
      description: 'Build portfolio-worthy projects with step-by-step guides'
    },
    {
      icon: '🤖',
      title: 'AI-Powered Tutor',
      description: 'Get instant help and explanations from your personal AI assistant'
    },
    {
      icon: '🗺️',
      title: 'Learning Roadmaps',
      description: 'Follow structured paths to master any technology stack'
    },
    {
      icon: '🏆',
      title: 'Weekly Challenges',
      description: 'Compete with others and earn certificates and rewards'
    },
    {
      icon: '🚀',
      title: 'Startup Toolkit',
      description: 'Essential tools and resources for launching your startup'
    }
  ];

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-y-1"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6">
              <Badge className="bg-white/20 text-white border-white/30 mb-4">
                ✨ AI-Powered Learning Platform
              </Badge>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              Think. Learn. Build.
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Your comprehensive hub for tutorials, projects, AI assistance, and startup resources. 
              Join thousands of developers building the future.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg transform hover:scale-105 transition-all duration-200 px-8 py-4 text-lg font-semibold"
              >
                🚀 Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/50 text-white hover:bg-white/10 px-8 py-4 text-lg"
              >
                📖 View Tutorials
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-200">1000+</div>
                <div className="text-sm text-blue-300">Tutorials</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-200">500+</div>
                <div className="text-sm text-purple-300">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-200">10K+</div>
                <div className="text-sm text-indigo-300">Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-200">24/7</div>
                <div className="text-sm text-pink-300">AI Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              Everything You Need to Learn & Build
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From beginner tutorials to advanced projects, we've got you covered with AI-powered assistance every step of the way.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-white to-slate-50">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <CardTitle className="text-xl text-slate-800">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-slate-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Content Preview */}
      {!isLoading && (featuredTutorials.length > 0 || featuredProjects.length > 0) && (
        <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-800 mb-4">
                ⭐ Featured Content
              </h2>
              <p className="text-xl text-slate-600">
                Start your learning journey with our most popular tutorials and projects
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Featured Tutorials */}
              {featuredTutorials.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="mr-2">📚</span>
                    Popular Tutorials
                  </h3>
                  <div className="space-y-4">
                    {featuredTutorials.slice(0, 3).map((tutorial: Tutorial) => (
                      <Card key={tutorial.id} className="hover:shadow-md transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 mb-2">{tutorial.title}</h4>
                              <p className="text-sm text-slate-600 mb-3">{tutorial.description}</p>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {tutorial.difficulty}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {tutorial.estimated_time} min
                                </span>
                                <span className="text-xs text-slate-500">
                                  👁️ {tutorial.views_count}
                                </span>
                              </div>
                            </div>
                            {tutorial.is_pro && (
                              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                PRO
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Featured Projects */}
              {featuredProjects.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                    <span className="mr-2">🛠️</span>
                    Trending Projects
                  </h3>
                  <div className="space-y-4">
                    {featuredProjects.slice(0, 3).map((project: Project) => (
                      <Card key={project.id} className="hover:shadow-md transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 mb-2">{project.title}</h4>
                              <p className="text-sm text-slate-600 mb-3">{project.description}</p>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {project.difficulty}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  ⬇️ {project.download_count}
                                </span>
                                {project.demo_url && (
                                  <span className="text-xs text-blue-500">🔗 Live Demo</span>
                                )}
                              </div>
                            </div>
                            {project.is_pro && (
                              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                PRO
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Start Building? 🚀
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join our community of developers, get AI-powered assistance, and build amazing projects that matter.
          </p>
          <Button
            size="lg"
            onClick={onGetStarted}
            className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg transform hover:scale-105 transition-all duration-200 px-12 py-4 text-lg font-semibold"
          >
            🎯 Start Learning Now
          </Button>
        </div>
      </section>
    </div>
  );
}

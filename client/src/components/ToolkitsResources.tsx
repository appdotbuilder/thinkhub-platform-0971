
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { Resource, User, SearchInput } from '../../../server/src/schema';

interface ToolkitsResourcesProps {
  user: User | null;
}

export function ToolkitsResources({ user }: ToolkitsResourcesProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    try {
      if (selectedCategory !== 'all') {
        const categoryResources = await trpc.getResourcesByCategory.query({ category: selectedCategory });
        setResources(categoryResources);
      } else if (searchQuery.trim()) {
        const searchInput: SearchInput = {
          query: searchQuery.trim(),
          type: 'resources',
        };
        const results = await trpc.searchResources.query(searchInput);
        setResources(results);
      } else {
        const allResources = await trpc.getResources.query();
        setResources(allResources);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleDownloadResource = async (resourceId: number) => {
    if (!user) return;

    try {
      await trpc.downloadResource.mutate({
        resourceId,
        userId: user.id
      });
      
      // Update download count in local state
      setResources((prev: Resource[]) =>
        prev.map((resource: Resource) =>
          resource.id === resourceId
            ? { ...resource, download_count: resource.download_count + 1 }
            : resource
        )
      );
    } catch (error) {
      console.error('Failed to download resource:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return '📄';
      case 'zip': return '📦';
      case 'png':
      case 'jpg':
      case 'jpeg': return '🖼️';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      default: return '📎';
    }
  };

  // Get unique categories from resources
  const uniqueCategories = [...new Set(resources.map((resource: Resource) => resource.category))];

  // Filter resources by search query if not handled by API
  const filteredResources = resources.filter((resource: Resource) => {
    if (!searchQuery.trim()) return true;
    return resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
           resource.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const resourceCategories = [
    { name: 'Cheat Sheets', icon: '📋', description: 'Quick reference guides' },
    { name: 'Templates', icon: '📄', description: 'Ready-to-use templates' },
    { name: 'Code Snippets', icon: '💻', description: 'Useful code examples' },
    { name: 'Design Assets', icon: '🎨', description: 'UI kits and graphics' },
    { name: 'Documentation', icon: '📚', description: 'Comprehensive guides' },
    { name: 'Tools', icon: '🛠️', description: 'Development utilities' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          📋 Toolkits & Resources
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Download essential resources, templates, and tools to accelerate your development workflow. 
          From cheat sheets to complete starter kits.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="🔍 Search resources..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category: string) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resource Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {resourceCategories.map((category) => (
          <Card 
            key={category.name} 
            className="text-center cursor-pointer hover:shadow-md transition-all duration-200 border-slate-200"
            onClick={() => setSelectedCategory(category.name)}
          >
            <CardContent className="p-4">
              <div className="text-3xl mb-2">{category.icon}</div>
              <h3 className="font-semibold text-slate-800">{category.name}</h3>
              <p className="text-sm text-slate-500">{category.description}</p>
              <div className="text-xs text-blue-600 mt-2">
                {resources.filter((r: Resource) => r.category === category.name).length} items
              </div>
            </CardContent>
          </Card>
        ))}
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
      {!isLoading && filteredResources.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-semibold text-slate-700 mb-2">No resources found</h3>
          <p className="text-slate-500 mb-4">
            Try adjusting your search terms or category filter to find what you're looking for.
          </p>
          <Button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Resources Grid */}
      {!isLoading && filteredResources.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource: Resource) => (
            <Card key={resource.id} className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="text-3xl">
                      {getFileTypeIcon(resource.file_type)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg text-slate-800 line-clamp-2">
                        {resource.title}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {resource.category}
                      </Badge>
                    </div>
                  </div>
                  {resource.is_pro && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                      PRO
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <CardDescription className="line-clamp-3 mb-4">
                  {resource.description}
                </CardDescription>

                {/* File Info */}
                <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                  <span className="flex items-center">
                    📁 {formatFileSize(resource.file_size)}
                  </span>
                  <span className="flex items-center">
                    ⬇️ {resource.download_count} downloads
                  </span>
                </div>

                {/* Download Button */}
                <Button 
                  onClick={() => handleDownloadResource(resource.id)}
                  disabled={!user || (resource.is_pro && user?.subscription_plan !== 'pro')}
                  className="w-full"
                  size="sm"
                >
                  {!user ? (
                    '🔒 Sign in to Download'
                  ) : resource.is_pro && user.subscription_plan !== 'pro' ? (
                    '🔒 Pro Only'
                  ) : (
                    `⬇️ Download ${resource.file_type.toUpperCase()}`
                  )}
                </Button>

                {!user && (
                  <div className="mt-2 text-xs text-slate-500 text-center">
                    Create a free account to download resources
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Section for Pro Users */}
      {user?.subscription_plan === 'pro' && (
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-200">
          <div className="text-center">
            <div className="text-4xl mb-4">☁️</div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Share Your Resources
            </h3>
            <p className="text-slate-600 mb-4">
              As a Pro member, you can upload and share your own resources with the community.
            </p>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              📤 Upload Resource
            </Button>
          </div>
        </div>
      )}

      {/* Call to Action */}
      {!isLoading && filteredResources.length > 0 && user?.subscription_plan !== 'pro' && (
        <div className="text-center mt-12 py-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <h3 className="text-2xl font-bold text-slate-800 mb-4">
            Want More Resources? 🚀
          </h3>
          <p className="text-slate-600 mb-6">
            Upgrade to Pro for access to exclusive templates, advanced tools, and the ability to upload your own resources.
          </p>
          <Button className="bg-gradient-to-r from-yellow-400 to-orange-500">
            ✨ Upgrade to Pro
          </Button>
        </div>
      )}
    </div>
  );
}

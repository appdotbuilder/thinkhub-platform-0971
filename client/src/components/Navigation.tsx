
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User } from '../../../server/src/schema';

type AppView = 'landing' | 'tutorials' | 'projects' | 'resources' | 'roadmaps' | 'dashboard' | 'ai-tutor';

interface NavigationProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  user: User | null;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
}

export function Navigation({
  currentView,
  onViewChange,
  user,
  onLogin,
  onRegister,
  onLogout
}: NavigationProps) {
  const navItems = [
    { id: 'landing' as const, label: 'Home', icon: '🏠' },
    { id: 'tutorials' as const, label: 'Tutorials', icon: '📚' },
    { id: 'projects' as const, label: 'Projects', icon: '🛠️' },
    { id: 'resources' as const, label: 'Resources', icon: '📋' },
    { id: 'roadmaps' as const, label: 'Roadmaps', icon: '🗺️' },
    { id: 'ai-tutor' as const, label: 'AI Tutor', icon: '🤖' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onViewChange('landing')}
            className="flex items-center space-x-2 text-xl font-bold text-slate-800 hover:text-blue-600 transition-colors"
          >
            <span className="text-2xl">🚀</span>
            <span>ThinkHub</span>
          </button>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  currentView === item.id
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Pro Badge */}
                {user.subscription_plan === 'pro' && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold">
                    ✨ PRO
                  </Badge>
                )}

                {/* Dashboard Button */}
                <Button
                  variant={currentView === 'dashboard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onViewChange('dashboard')}
                  className="hidden sm:flex"
                >
                  📊 Dashboard
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-slate-200 hover:ring-blue-300 transition-all">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                        {user.full_name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{user.full_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onViewChange('dashboard')}>
                      📊 Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewChange('ai-tutor')}>
                      🤖 AI Tutor
                      <Badge variant="outline" className="ml-auto text-xs">
                        {user.ai_queries_used_today}/
                        {user.subscription_plan === 'pro' ? '∞' : '10'}
                      </Badge>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600">
                      🚪 Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={onLogin}>
                  Login
                </Button>
                <Button size="sm" onClick={onRegister} className="bg-gradient-to-r from-blue-600 to-purple-600">
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

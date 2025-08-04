
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Navigation } from '@/components/Navigation';
import { LandingHero } from '@/components/LandingHero';
import { TutorialsHub } from '@/components/TutorialsHub';
import { ProjectsPortal } from '@/components/ProjectsPortal';
import { ToolkitsResources } from '@/components/ToolkitsResources';
import { AITutor } from '@/components/AITutor';
import { InteractiveRoadmaps } from '@/components/InteractiveRoadmaps';
import { UserDashboard } from '@/components/UserDashboard';
import { LoginModal } from '@/components/LoginModal';
import { RegisterModal } from '@/components/RegisterModal';
// Using type-only imports for better TypeScript compliance
import type { User } from '../../server/src/schema';

type AppView = 'landing' | 'tutorials' | 'projects' | 'resources' | 'roadmaps' | 'dashboard' | 'ai-tutor';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load user if logged in (using stored user ID for persistence)
  const loadUser = useCallback(async () => {
    try {
      // In a real app, you'd get the user ID from localStorage or context
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        const userData = await trpc.getCurrentUser.query({ userId: parseInt(storedUserId) });
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      // User not logged in or session expired
      localStorage.removeItem('userId');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await trpc.login.mutate({ email, password });
      setUser(result.user);
      setShowLoginModal(false);
      // Store user ID for persistence
      localStorage.setItem('userId', result.user.id.toString());
      console.log('Login successful, token:', result.token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const newUser = await trpc.register.mutate({
        email,
        password,
        full_name: fullName
      });
      setUser(newUser);
      setShowRegisterModal(false);
      // Store user ID for persistence
      localStorage.setItem('userId', newUser.id.toString());
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('landing');
    localStorage.removeItem('userId');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingHero onGetStarted={() => user ? setCurrentView('dashboard') : setShowLoginModal(true)} />;
      case 'tutorials':
        return <TutorialsHub user={user} />;
      case 'projects':
        return <ProjectsPortal user={user} />;
      case 'resources':
        return <ToolkitsResources user={user} />;
      case 'roadmaps':
        return <InteractiveRoadmaps user={user} />;
      case 'dashboard':
        return user ? <UserDashboard user={user} /> : <div className="p-8 text-center">Please log in to access your dashboard</div>;
      case 'ai-tutor':
        return <AITutor user={user} />;
      default:
        return <LandingHero onGetStarted={() => user ? setCurrentView('dashboard') : setShowLoginModal(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
        user={user}
        onLogin={() => setShowLoginModal(true)}
        onRegister={() => setShowRegisterModal(true)}
        onLogout={handleLogout}
      />

      <main className="pt-16">
        {renderCurrentView()}
      </main>

      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
        isLoading={isLoading}
      />

      <RegisterModal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegister={handleRegister}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
        isLoading={isLoading}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 text-blue-400">🚀 ThinkHub</h3>
              <p className="text-slate-400">
                Your AI-powered learning companion for developers, students, and startup founders.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Learning</h4>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => setCurrentView('tutorials')} className="hover:text-white transition-colors">Tutorials</button></li>
                <li><button onClick={() => setCurrentView('projects')} className="hover:text-white transition-colors">Projects</button></li>
                <li><button onClick={() => setCurrentView('roadmaps')} className="hover:text-white transition-colors">Roadmaps</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Tools</h4>
              <ul className="space-y-2 text-slate-400">
                <li><button onClick={() => setCurrentView('resources')} className="hover:text-white transition-colors">Resources</button></li>
                <li><button onClick={() => setCurrentView('ai-tutor')} className="hover:text-white transition-colors">AI Tutor</button></li>
                <li><span className="opacity-50">Startup Toolkit</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-slate-400">
                <li><span className="opacity-50">Challenges</span></li>
                <li><span className="opacity-50">Leaderboard</span></li>
                <li><span className="opacity-50">Certificates</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2024 ThinkHub. Built with ❤️ for the developer community.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

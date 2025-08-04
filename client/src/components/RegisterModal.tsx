
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  onRegister: (email: string, password: string, fullName: string) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading: boolean;
}

export function RegisterModal({ open, onClose, onRegister, onSwitchToLogin, isLoading }: RegisterModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (fullName.length < 2) {
      setError('Full name must be at least 2 characters long');
      return;
    }

    try {
      await onRegister(email, password, fullName);
      // Reset form on successful registration
      setEmail('');
      setPassword('');
      setFullName('');
    } catch {
      setError('Registration failed. Email might already be in use.');
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Join ThinkHub! 🎉
          </DialogTitle>
          <DialogDescription className="text-center">
            Create your account and start learning with AI
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account 🚀'}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:underline font-medium"
          >
            Sign in here
          </button>
        </div>

        {/* Features included with free account */}
        <div className="bg-green-50 p-3 rounded-lg text-sm text-green-700">
          <p className="font-medium mb-1">Free Account Includes:</p>
          <ul className="text-xs space-y-1">
            <li>✅ Access to all free tutorials & projects</li>
            <li>✅ 10 AI tutor queries per day</li>
            <li>✅ Progress tracking & certificates</li>
            <li>✅ Community challenges</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

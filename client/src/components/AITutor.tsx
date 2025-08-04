
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, ChatMessage, SendMessageInput } from '../../../server/src/schema';

interface AITutorProps {
  user: User | null;
}

export function AITutor({ user }: AITutorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [contextType, setContextType] = useState<'general' | 'tutorial' | 'project'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [usageLimit, setUsageLimit] = useState<{ used: number; limit: number; canUse: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChatHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const history = await trpc.getChatHistory.query({ userId: user.id });
      setMessages(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setMessages([]);
    }
  }, [user]);

  const checkUsageLimit = useCallback(async () => {
    if (!user) return;
    
    try {
      const limitInfo = await trpc.checkAIUsageLimit.query({ userId: user.id });
      // Map the API response to match our state structure
      setUsageLimit({
        used: limitInfo.queriesUsed,
        limit: limitInfo.limit,
        canUse: limitInfo.canUse
      });
    } catch (error) {
      console.error('Failed to check usage limit:', error);
      setUsageLimit(null);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadChatHistory();
      checkUsageLimit();
    }
  }, [user, loadChatHistory, checkUsageLimit]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentMessage.trim() || isLoading) return;

    if (usageLimit && !usageLimit.canUse) {
      return;
    }

    const messageInput: SendMessageInput = {
      message: currentMessage.trim(),
      context_type: contextType === 'general' ? null : contextType,
      context_id: null,
    };

    setIsLoading(true);
    const userMessage = currentMessage;
    setCurrentMessage('');

    try {
      const response = await trpc.sendMessage.mutate({
        userId: user.id,
        ...messageInput
      });

      // Add both user message and AI response to local state
      const newUserMessage: ChatMessage = {
        id: Date.now(), // Temporary ID
        user_id: user.id,
        message: userMessage,
        response: '',
        context_type: messageInput.context_type,
        context_id: messageInput.context_id,
        created_at: new Date(),
      };

      const newAIMessage: ChatMessage = {
        id: Date.now() + 1, // Temporary ID
        user_id: user.id,
        message: '',
        response: response.response,
        context_type: messageInput.context_type,
        context_id: messageInput.context_id,
        created_at: new Date(),
      };

      setMessages((prev: ChatMessage[]) => [...prev, newUserMessage, newAIMessage]);
      
      // Update usage limit
      await checkUsageLimit();
    } catch (error) {
      console.error('Failed to send message:', error);
      setCurrentMessage(userMessage); // Restore message on error
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { text: "Explain this concept to me", icon: "💡" },
    { text: "Help me debug this code", icon: "🐛" },
    { text: "What's the best practice for...", icon: "✅" },
    { text: "How do I implement...", icon: "🛠️" },
    { text: "Compare these technologies", icon: "⚖️" },
    { text: "Review my code structure", icon: "📝" },
  ];

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🤖</div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">AI Tutor</h1>
          <p className="text-xl text-slate-600 mb-8">
            Sign in to access your personal AI programming assistant
          </p>
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
            <h3 className="font-semibold text-slate-800 mb-4">What you can do with AI Tutor:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-left">
              {[
                "💬 Get instant coding help",
                "🔍 Debug complex problems", 
                "📚 Learn new concepts",
                "⚡ Code reviews & optimization",
                "🎯 Project guidance",
                "🤔 Technical explanations"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          🤖 AI Tutor
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-4">
          Your personal AI programming assistant. Get instant help, explanations, and code reviews.
        </p>
        
        {/* Usage Indicator */}
        {usageLimit && (
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <span className="text-slate-600">Today's usage:</span>
              <Badge variant={usageLimit.canUse ? "outline" : "destructive"}>
                {usageLimit.used} / {user.subscription_plan === 'pro' ? '∞' : usageLimit.limit}
              </Badge>
              {user.subscription_plan !== 'pro' && (
                <span className="text-xs text-blue-600">
                  Upgrade to Pro for unlimited usage
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <span>💬</span>
                    <span>Chat with AI Tutor</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={contextType} onValueChange={(value: 'general' | 'tutorial' | 'project') => setContextType(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">💡 General</SelectItem>
                        <SelectItem value="tutorial">📚 Tutorial</SelectItem>
                        <SelectItem value="project">🛠️ Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">👋</div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">
                        Hi {user.full_name}! I'm your AI Tutor
                      </h3>
                      <p className="text-slate-500">
                        Ask me anything about programming, debugging, or learning new technologies!
                      </p>
                    </div>
                  )}

                  {messages.map((message: ChatMessage) => (
                    <div key={message.id}>
                      {/* User Message */}
                      {message.message && (
                        <div className="flex justify-end mb-2">
                          <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
                            <p className="text-sm">{message.message}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* AI Response */}
                      {message.response && (
                        <div className="flex justify-start mb-4">
                          <div className="bg-slate-100 rounded-lg px-4 py-2 max-w-[80%]">
                            <div className="flex items-start space-x-2">
                              <span className="text-lg">🤖</span>
                              <div className="flex-1">
                                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                                  {message.response}
                                </pre>
                                <div className="text-xs text-slate-500 mt-2">
                                  {message.created_at.toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-lg px-4 py-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🤖</span>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="flex-shrink-0 p-4 border-t">
                {usageLimit && !usageLimit.canUse ? (
                  <Alert>
                    <AlertDescription>
                      You've reached your daily limit of {usageLimit.limit} queries. 
                      Upgrade to Pro for unlimited access or try again tomorrow.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <Input
                      value={currentMessage}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMessage(e.target.value)}
                      placeholder="Ask me anything about programming..."
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !currentMessage.trim()}>
                      {isLoading ? '⏳' : '📤'}
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Prompts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">⚡ Quick Prompts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {quickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setCurrentMessage(prompt.text)}
                      disabled={usageLimit ? !usageLimit.canUse : false}
                    >
                      <span className="mr-2">{prompt.icon}</span>
                      <span className="text-xs">{prompt.text}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🧠 I can help with</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: '💻', text: 'Code debugging & optimization' },
                    { icon: '📚', text: 'Concept explanations' },
                    { icon: '🏗️', text: 'Architecture guidance' },
                    { icon: '🔍', text: 'Code reviews' },
                    { icon: '🎯', text: 'Best practices' },
                    { icon: '🚀', text: 'Performance tips' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 text-slate-600">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pro Upgrade CTA */}
            {user.subscription_plan !== 'pro' && (
              <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">✨</div>
                  <h3 className="font-semibold text-slate-800 mb-2">Unlimited AI Access</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Upgrade to Pro for unlimited daily queries and priority support.
                  </p>
                  <Button size="sm" className="bg-gradient-to-r from-yellow-400 to-orange-500">
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

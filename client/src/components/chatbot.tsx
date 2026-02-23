import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, X, Send } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m Hostezee\'s AI Assistant. I can help you with booking management, guest information, financial reports, property settings, and more. What can I help you with today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Detect if this is a PMS analytics question
      const pmsKeywords = [
        'booking', 'revenue', 'business', 'occupancy', 'payment', 'bill', 'monthly', 'weekly',
        'total', 'current', 'how many', 'how much', 'what\'s', 'food order', 'guest', 'rooms',
        'profit', 'income', 'earning', 'expense', 'sales', 'orders', 'checkin', 'checkout',
        'pending', 'collect', 'paid', 'unpaid', 'analytics', 'metrics', 'data', 'report'
      ];
      
      const lowerInput = input.toLowerCase();
      const isPMSQuestion = pmsKeywords.some(keyword => lowerInput.includes(keyword));
      
      let response;
      let data;
      
      if (isPMSQuestion) {
        // Route to PMS analytics chat for real data
        response = await apiRequest('/api/pms-analytics-chat', 'POST', {
          query: input,
        });
        data = await response.json();
        
        // PMS chat returns { response: string }
        if (!response.ok || !data.response) {
          throw new Error('PMS query failed');
        }
      } else {
        // Route to generic chat for other questions
        response = await apiRequest('/api/chat', 'POST', {
          messages: messages.concat(userMessage).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });
        data = await response.json();
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: isPMSQuestion ? data.response : data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
      {isOpen ? (
        <div 
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            width: '384px',
            height: '384px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999
          }}
        >
          <Card className="w-full h-full shadow-xl flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">Hostezee Assistant</CardTitle>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-chatbot"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                    data-testid={`message-${msg.role}-${msg.id}`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="border-t p-3 flex gap-2 flex-shrink-0">
              <Input
                placeholder="Ask anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={loading}
                data-testid="input-chat-message"
                className="text-sm"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 9998
          }}
          className="rounded-full w-10 h-10 shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          size="icon"
          data-testid="button-open-chatbot"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      )}
    </>
  );

  return createPortal(content, document.body);
}

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Mic, Send, Loader2, Bot, User, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-sim`;

const InterviewSimPage: React.FC = () => {
  const { studentProfile } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [started, setStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const streamChat = async (msgs: Msg[]) => {
    setIsStreaming(true);
    let assistantSoFar = '';

    try {
      const resp = await fetch(STREAM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: msgs,
          role,
          difficulty,
          student_profile: studentProfile ? { name: studentProfile.name, degree: studentProfile.degree, branch: studentProfile.branch } : null,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) { toast({ title: 'Rate limited', description: 'Please try again later.', variant: 'destructive' }); return; }
        if (resp.status === 402) { toast({ title: 'Credits required', description: 'Please add funds.', variant: 'destructive' }); return; }
        throw new Error('Stream failed');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { buf = line + '\n' + buf; break; }
        }
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsStreaming(false);
    }
  };

  const startInterview = async () => {
    if (!role.trim()) { toast({ title: 'Enter a role', variant: 'destructive' }); return; }
    setStarted(true);
    setMessages([]);
    const initMsg: Msg[] = [{ role: 'user', content: `I'm ready for my ${role} interview. Please begin.` }];
    setMessages(initMsg);
    await streamChat(initMsg);
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Msg = { role: 'user', content: input };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    await streamChat(allMsgs);
  };

  const reset = () => {
    setStarted(false);
    setMessages([]);
    setInput('');
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/student/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Mic className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Interview Simulator</h1>
        </div>
        <p className="text-muted-foreground mb-8">Practice mock interviews with AI and get real-time feedback.</p>

        {!started ? (
          <Card className="glass-card">
            <CardContent className="pt-6 space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Target Role *</label>
                <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Frontend Developer, Data Scientist..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (Entry Level)</SelectItem>
                    <SelectItem value="medium">Medium (Mid Level)</SelectItem>
                    <SelectItem value="hard">Hard (Senior Level)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={startInterview} className="btn-primary w-full gap-2">
                <Mic className="w-4 h-4" /> Start Interview
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{role}</Badge>
                <Badge variant="secondary" className="capitalize">{difficulty}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={reset} className="gap-1">
                <RotateCcw className="w-3 h-3" /> New Session
              </Button>
            </div>

            <Card className="glass-card">
              <CardContent className="pt-4 pb-4 max-h-[500px] overflow-y-auto">
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : msg.content}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-3"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type your answer..."
                disabled={isStreaming}
              />
              <Button onClick={sendMessage} disabled={isStreaming || !input.trim()} className="btn-primary">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewSimPage;

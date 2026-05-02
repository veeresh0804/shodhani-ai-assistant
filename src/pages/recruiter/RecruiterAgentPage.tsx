import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Bot, User, RotateCcw, Sparkles, Briefcase, Users, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { describeEdgeError, parseEdgeError } from '@/lib/edgeError';

type Msg = { role: 'user' | 'assistant'; content: string };

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recruiter-agent`;

const quickPrompts = [
  { icon: <Briefcase className="w-4 h-4" />, label: 'Draft JD', prompt: 'Help me draft a job description for a Senior Full Stack Developer with React and Node.js experience' },
  { icon: <Users className="w-4 h-4" />, label: 'Interview Questions', prompt: 'Suggest 5 technical interview questions for a React frontend developer role' },
  { icon: <MessageSquare className="w-4 h-4" />, label: 'Outreach Template', prompt: 'Draft a cold outreach message for a passive candidate on LinkedIn for a backend engineering role' },
  { icon: <Sparkles className="w-4 h-4" />, label: 'Pipeline Tips', prompt: 'What are the best practices to improve my hiring pipeline conversion rate?' },
];

const RecruiterAgentPage: React.FC = () => {
  const { recruiterProfile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [recruiterContext, setRecruiterContext] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!recruiterProfile?.id) return;
    const loadContext = async () => {
      const { data: jobs } = await supabase.from('jobs').select('id, title, status, applications_count').eq('recruiter_id', recruiterProfile.id);
      const { data: apps } = await supabase.from('applications').select('id, status, job_id').in('job_id', (jobs || []).map(j => j.id));
      setRecruiterContext({
        company: recruiterProfile.company_name,
        name: recruiterProfile.recruiter_name,
        active_jobs: jobs?.filter(j => j.status === 'active').length || 0,
        total_applications: apps?.length || 0,
        jobs_summary: jobs?.map(j => ({ title: j.title, status: j.status, applicants: j.applications_count })) || [],
      });
    };
    loadContext();
  }, [recruiterProfile?.id]);

  const streamChat = async (msgs: Msg[]) => {
    setIsStreaming(true);
    let assistantSoFar = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(STREAM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: msgs, recruiter_context: recruiterContext }),
      });

      if (!resp.ok || !resp.body) {
        let parsed: ReturnType<typeof parseEdgeError> = { message: 'Stream failed' };
        try { parsed = parseEdgeError(await resp.json()); } catch { /* no body */ }
        if (resp.status === 429) {
          toast({ title: 'Rate limited', description: describeEdgeError(parsed), variant: 'destructive' });
          return;
        }
        if (resp.status === 402) {
          toast({ title: 'Credits required', description: describeEdgeError(parsed), variant: 'destructive' });
          return;
        }
        toast({ title: 'Error', description: describeEdgeError(parsed), variant: 'destructive' });
        return;
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
    } catch (e: unknown) {
      console.error(e);
      toast({ title: 'Error', description: describeEdgeError(e), variant: 'destructive' });
    } finally {
      setIsStreaming(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isStreaming) return;
    const userMsg: Msg = { role: 'user', content: msg };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    await streamChat(allMsgs);
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/recruiter/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">AI Recruiter Agent</h1>
            </div>
            <p className="text-muted-foreground">Your autonomous AI hiring assistant.</p>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setMessages([])} className="gap-1">
              <RotateCcw className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>

        {messages.length === 0 ? (
          <div className="space-y-6">
            <Card className="glass-card bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-8 pb-8 text-center">
                <Bot className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  I can draft job descriptions, suggest interview questions, analyze candidates, optimize your pipeline, and more.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(qp.prompt)}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">{qp.icon}</div>
                  <div>
                    <p className="font-medium text-sm">{qp.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{qp.prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Card className="glass-card mb-4">
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
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask anything about hiring..."
            disabled={isStreaming}
          />
          <Button onClick={() => sendMessage()} disabled={isStreaming || !input.trim()} className="btn-primary">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecruiterAgentPage;

import React, { useEffect, useState } from 'react';
import { Bell, Trophy, Calendar, Info, CheckCheck, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { logger } from '@/lib/logger';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id ?? '')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data } = await query;
      if (data) setNotifications(data as Notification[]);
      setLoading(false);
    };
    fetch();
  }, [filter]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    if (error) { logger.error('Failed to mark notifications read', error); return; }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
      if (error) logger.error('Failed to mark notification read', error);
      else setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
    }
    if (notification.link) navigate(notification.link);
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'shortlisted':
        return <Trophy className="w-5 h-5 text-green-500 shrink-0" />;
      case 'interview':
        return <Calendar className="w-5 h-5 text-primary shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground shrink-0" />;
    }
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case 'shortlisted':
        return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">Shortlisted</Badge>;
      case 'interview':
        return <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">Interview</Badge>;
      default:
        return <Badge variant="secondary">General</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <Filter className="w-3.5 h-3.5" /> All
          </TabsTrigger>
          <TabsTrigger value="shortlisted" className="gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Shortlisted
          </TabsTrigger>
          <TabsTrigger value="interview" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Interviews
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-1.5">
            <Info className="w-3.5 h-3.5" /> General
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {loading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No notifications found</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition-all hover:shadow-md ${!n.is_read ? 'border-primary/30 bg-primary/[0.03]' : ''}`}
              onClick={() => handleClick(n)}
            >
              <CardContent className="flex gap-4 items-start py-4 px-5">
                <div className="mt-0.5">{typeIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                      {n.title}
                    </p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {typeBadge(n.type)}
                    <span className="text-xs text-muted-foreground/70">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      {' · '}
                      {format(new Date(n.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

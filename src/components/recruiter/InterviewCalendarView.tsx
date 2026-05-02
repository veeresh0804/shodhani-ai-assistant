import React, { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Interview {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  notes: string | null;
  status: string;
  student_name?: string;
  student_email?: string;
  job_title?: string;
}

interface Props {
  interviews: Interview[];
  onCancel: (id: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const InterviewCalendarView: React.FC<Props> = ({ interviews, onCancel }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const interviewsByDay = useMemo(() => {
    const map = new Map<string, Interview[]>();
    interviews.forEach((iv) => {
      const key = format(new Date(iv.scheduled_at), 'yyyy-MM-dd');
      const existing = map.get(key) || [];
      existing.push(iv);
      map.set(key, existing);
    });
    return map;
  }, [interviews]);

  const statusDot = (status: string) => {
    if (status === 'scheduled') return 'bg-primary';
    if (status === 'completed') return 'bg-green-500';
    if (status === 'cancelled') return 'bg-destructive/50';
    return 'bg-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-border bg-border">
        {/* Weekday headers */}
        {WEEKDAYS.map((day) => (
          <div key={day} className="bg-muted px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Day cells */}
        {calendarDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayInterviews = interviewsByDay.get(key) || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={key}
              className={`bg-card min-h-[80px] p-1.5 flex flex-col transition-colors ${
                !inMonth ? 'opacity-40' : ''
              } ${today ? 'ring-2 ring-inset ring-primary/40' : ''}`}
            >
              <span
                className={`text-xs font-medium self-end w-6 h-6 flex items-center justify-center rounded-full ${
                  today ? 'bg-primary text-primary-foreground' : 'text-foreground'
                }`}
              >
                {format(day, 'd')}
              </span>

              <div className="flex flex-col gap-0.5 mt-1 flex-1">
                {dayInterviews.slice(0, 3).map((iv) => (
                  <Popover key={iv.id}>
                    <PopoverTrigger asChild>
                      <button
                        className={`w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-medium transition-colors hover:opacity-80 ${
                          iv.status === 'cancelled'
                            ? 'bg-destructive/10 text-destructive line-through'
                            : iv.status === 'completed'
                            ? 'bg-green-500/10 text-green-700'
                            : 'bg-primary/15 text-primary'
                        }`}
                      >
                        {format(new Date(iv.scheduled_at), 'h:mm a')} {iv.student_name?.split(' ')[0] || ''}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" side="right" align="start">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm">{iv.student_name || 'Candidate'}</p>
                            <p className="text-xs text-muted-foreground">{iv.student_email}</p>
                          </div>
                          <Badge
                            variant={iv.status === 'cancelled' ? 'destructive' : 'default'}
                            className="text-[10px] capitalize"
                          >
                            {iv.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{iv.job_title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(iv.scheduled_at), 'h:mm a')} · {iv.duration_minutes}min
                          </span>
                        </div>
                        {iv.meeting_link && (
                          <a
                            href={iv.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary flex items-center gap-1 hover:underline"
                          >
                            <Video className="w-3 h-3" /> Join Meeting
                          </a>
                        )}
                        {iv.notes && (
                          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded p-1.5">{iv.notes}</p>
                        )}
                        {iv.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive text-xs w-full mt-1"
                            onClick={() => onCancel(iv.id)}
                          >
                            Cancel Interview
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
                {dayInterviews.length > 3 && (
                  <span className="text-[10px] text-muted-foreground text-center">
                    +{dayInterviews.length - 3} more
                  </span>
                )}
              </div>

              {/* Dot indicators for quick scanning */}
              {dayInterviews.length > 0 && (
                <div className="flex gap-0.5 justify-center mt-auto pt-0.5">
                  {dayInterviews.slice(0, 4).map((iv) => (
                    <span key={iv.id} className={`w-1.5 h-1.5 rounded-full ${statusDot(iv.status)}`} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" /> Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive/50" /> Cancelled
        </span>
      </div>
    </div>
  );
};

export default InterviewCalendarView;

import { useWebex } from '@/contexts/WebexContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Mail, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IncomingTask } from '@/types/webex';
import { useEffect, useState } from 'react';

interface IncomingTaskCardProps {
  task: IncomingTask;
}

const channelIcons = { voice: Phone, chat: MessageSquare, email: Mail, social: MessageSquare };

export function IncomingTaskCard({ task }: IncomingTaskCardProps) {
  const { acceptTask, declineTask } = useWebex();
  const [timeLeft, setTimeLeft] = useState(task.ronaTimeout);
  const Icon = channelIcons[task.mediaType];

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - task.startTime) / 1000);
      setTimeLeft(Math.max(0, task.ronaTimeout - elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [task]);

  return (
    <Card className="incoming-pulse border-success bg-success/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-xl", `bg-channel-${task.mediaType}/20`)}>
              <Icon className={cn("w-6 h-6", `channel-${task.mediaType}`)} />
            </div>
            <div>
              <p className="font-semibold">Incoming {task.mediaType}</p>
              <p className="text-sm text-muted-foreground">{task.ani}</p>
              <p className="text-xs text-muted-foreground">{task.queueName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-warning font-mono">
            <Clock className="w-4 h-4" />{timeLeft}s
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => acceptTask(task.taskId)} className="flex-1 bg-success hover:bg-success/90">Accept</Button>
          <Button onClick={() => declineTask(task.taskId)} variant="outline" className="flex-1">Decline</Button>
        </div>
      </CardContent>
    </Card>
  );
}

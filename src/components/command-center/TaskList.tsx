import { useWebex } from '@/contexts/WebexContext';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, MessageSquare, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/webex';

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
}

const channelIcons = { voice: Phone, chat: MessageSquare, email: Mail, social: MessageSquare };

export function TaskList({ tasks, selectedTaskId }: TaskListProps) {
  const { selectTask } = useWebex();

  if (tasks.length <= 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Active Tasks ({tasks.length})</p>
      {tasks.map(task => {
        const Icon = channelIcons[task.mediaType];
        return (
          <Card 
            key={task.taskId} 
            className={cn("cursor-pointer transition-all", selectedTaskId === task.taskId ? "border-primary" : "hover:border-primary/50")}
            onClick={() => selectTask(task.taskId)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <Icon className={cn("w-4 h-4", `channel-${task.mediaType}`)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.ani}</p>
                <p className="text-xs text-muted-foreground">{task.state}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

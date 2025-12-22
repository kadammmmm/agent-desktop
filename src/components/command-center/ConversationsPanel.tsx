import { useWebex } from '@/contexts/WebexContext';
import { Phone, MessageSquare, Mail, Plus, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, IncomingTask } from '@/types/webex';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const channelIcons = { voice: Phone, chat: MessageSquare, email: Mail, social: MessageSquare };

function formatWaitTime(startTime: number) {
  const secs = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface ConversationCardProps {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}

function ConversationCard({ task, isSelected, onClick }: ConversationCardProps) {
  const Icon = channelIcons[task.mediaType];
  const DirectionIcon = task.direction === 'inbound' ? ArrowDownLeft : ArrowUpRight;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all border-l-4 group",
        "hover:bg-accent/50",
        isSelected 
          ? "bg-accent border-l-primary" 
          : "bg-card border-l-transparent hover:border-l-primary/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Channel Icon */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          task.mediaType === 'voice' && "bg-blue-500/10",
          task.mediaType === 'chat' && "bg-green-500/10",
          task.mediaType === 'email' && "bg-purple-500/10"
        )}>
          <Icon className={cn("w-5 h-5", `channel-${task.mediaType}`)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate">
              {task.customerName || task.ani}
            </span>
            <DirectionIcon className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
          
          <p className="text-xs text-muted-foreground truncate mb-1">
            {task.queueName}
          </p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatWaitTime(task.startTime)}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
              task.state === 'connected' && "bg-success/10 text-success",
              task.state === 'held' && "bg-warning/10 text-warning",
              task.state === 'wrapup' && "bg-purple-500/10 text-purple-500"
            )}>
              {task.state}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface IncomingConversationCardProps {
  task: IncomingTask;
}

function IncomingConversationCard({ task }: IncomingConversationCardProps) {
  const { acceptTask, declineTask } = useWebex();
  const Icon = channelIcons[task.mediaType];

  return (
    <div className="p-3 rounded-lg border-l-4 border-l-success bg-success/5 incoming-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">Incoming {task.mediaType}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{task.ani}</p>
          <p className="text-xs text-muted-foreground">{task.queueName}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={() => acceptTask(task.taskId)}>
          Accept
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => declineTask(task.taskId)}>
          Decline
        </Button>
      </div>
    </div>
  );
}

export function ConversationsPanel() {
  const { activeTasks, incomingTask, selectedTaskId, selectTask } = useWebex();

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Conversations</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {activeTasks.length}
          </span>
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Incoming Task */}
          {incomingTask && <IncomingConversationCard task={incomingTask} />}

          {/* Active Tasks */}
          {activeTasks.map(task => (
            <ConversationCard
              key={task.taskId}
              task={task}
              isSelected={task.taskId === selectedTaskId}
              onClick={() => selectTask(task.taskId)}
            />
          ))}

          {/* Empty State */}
          {activeTasks.length === 0 && !incomingTask && (
            <div className="p-8 text-center text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active conversations</p>
              <p className="text-xs mt-1">Waiting for incoming interactions</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

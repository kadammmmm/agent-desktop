import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { User, MoreHorizontal, Paperclip, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoEscalationButton } from '../VideoEscalationButton';

export function ChatInteractionView() {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  if (!task) return null;

  // Mock chat messages - in production, these would come from the SDK
  const messages = [
    { id: '1', sender: 'customer', text: 'Hi, I need help with my account', time: '10:30 AM' },
    { id: '2', sender: 'agent', text: 'Hello! I\'d be happy to help you. What seems to be the issue?', time: '10:31 AM' },
    { id: '3', sender: 'customer', text: 'I can\'t access my billing information', time: '10:32 AM' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{task.customerName || task.ani}</h3>
          <p className="text-xs text-muted-foreground">{task.queueName}</p>
        </div>
        <div className="flex items-center gap-2">
          <VideoEscalationButton taskId={task.taskId} />
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={cn(
                "flex",
                msg.sender === 'agent' ? 'justify-end' : 'justify-start'
              )}
            >
              <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2",
                msg.sender === 'agent' 
                  ? "bg-primary text-primary-foreground rounded-br-sm" 
                  : "bg-muted rounded-bl-sm"
              )}>
                <p className="text-sm">{msg.text}</p>
                <p className={cn(
                  "text-[10px] mt-1",
                  msg.sender === 'agent' ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Textarea 
            placeholder="Type your message..." 
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button size="icon" className="shrink-0">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

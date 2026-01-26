import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { User, Reply, Forward } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoEscalationButton } from '../VideoEscalationButton';

export function EmailInteractionView() {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  if (!task) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Email Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{task.customerName || task.ani}</h3>
            <p className="text-xs text-muted-foreground">{task.customerEmail || task.ani}</p>
          </div>
          <div className="flex gap-2">
            <VideoEscalationButton taskId={task.taskId} />
            <Button variant="outline" size="sm">
              <Reply className="w-4 h-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline" size="sm">
              <Forward className="w-4 h-4 mr-2" />
              Forward
            </Button>
          </div>
        </div>
        <h2 className="text-lg font-medium">Account Inquiry - Billing Question</h2>
        <p className="text-xs text-muted-foreground mt-1">Received via {task.queueName}</p>
      </div>

      {/* Email Body */}
      <ScrollArea className="flex-1 p-4">
        <div className="prose prose-sm max-w-none">
          <p>Hello,</p>
          <p>
            I'm writing to inquire about my recent billing statement. I noticed a charge 
            that I don't recognize and would like some clarification.
          </p>
          <p>
            The charge in question is dated December 15th for $49.99. Could you please 
            help me understand what this is for?
          </p>
          <p>Thank you for your assistance.</p>
          <p>
            Best regards,<br />
            {task.customerName || 'Customer'}
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}

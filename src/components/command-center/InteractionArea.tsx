import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { 
  Phone, MessageSquare, Mail, 
  Pause, Play, Mic, MicOff, PhoneOff, 
  Circle, Send, Paperclip, Reply, Forward,
  User, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoEscalationButton } from './VideoEscalationButton';

const channelIcons = { voice: Phone, chat: MessageSquare, email: Mail, social: MessageSquare };

function VoiceInteractionView() {
  const { activeTasks, selectedTaskId, holdTask, resumeTask, muteTask, unmuteTask, endTask, startRecording, stopRecording, wrapUpCodes, wrapUpTask } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  if (!task) return null;

  const formatDuration = () => {
    const secs = Math.floor((Date.now() - task.startTime) / 1000);
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (task.state === 'wrapup') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-purple-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Call Ended</h2>
          <p className="text-muted-foreground">Duration: {formatDuration()}</p>
        </div>

        <div className="w-full max-w-md">
          <p className="text-sm font-medium mb-3">Select wrap-up reason:</p>
          <div className="grid grid-cols-2 gap-2">
            {wrapUpCodes.map(code => (
              <Button 
                key={code.id} 
                variant="outline" 
                className="justify-start"
                onClick={() => wrapUpTask(task.taskId, code.id)}
              >
                {code.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      {/* Call Visual */}
      <div className="text-center mb-8">
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 relative",
          task.isHeld ? "bg-warning/10" : "bg-primary/10"
        )}>
          <Phone className={cn(
            "w-12 h-12",
            task.isHeld ? "text-warning" : "text-primary"
          )} />
          {task.isRecording && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-destructive rounded-full animate-pulse" />
          )}
        </div>
        
        <h2 className="text-xl font-semibold mb-1">{task.customerName || task.ani}</h2>
        <p className="text-muted-foreground mb-2">{task.queueName}</p>
        <p className="text-3xl font-mono font-bold text-primary">{formatDuration()}</p>
        
        {task.isHeld && (
          <span className="inline-block mt-2 px-3 py-1 bg-warning/10 text-warning text-sm rounded-full">
            On Hold
          </span>
        )}
      </div>

      {/* Call Controls */}
      <div className="flex items-center gap-3">
        <Button 
          size="lg" 
          variant={task.isHeld ? "default" : "outline"} 
          className="h-14 w-14 rounded-full"
          onClick={() => task.isHeld ? resumeTask(task.taskId) : holdTask(task.taskId)}
        >
          {task.isHeld ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
        </Button>

        <Button 
          size="lg" 
          variant={task.isMuted ? "default" : "outline"} 
          className="h-14 w-14 rounded-full"
          onClick={() => task.isMuted ? unmuteTask(task.taskId) : muteTask(task.taskId)}
        >
          {task.isMuted ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>

        <Button 
          size="lg" 
          variant={task.isRecording ? "destructive" : "outline"} 
          className="h-14 w-14 rounded-full"
          onClick={() => task.isRecording ? stopRecording(task.taskId) : startRecording(task.taskId)}
        >
          <Circle className={cn("w-6 h-6", task.isRecording && "fill-current")} />
        </Button>

        <Button 
          size="lg" 
          variant="destructive" 
          className="h-14 w-14 rounded-full"
          onClick={() => endTask(task.taskId)}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

function ChatInteractionView() {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  if (!task) return null;

  // Mock chat messages
  const messages = [
    { id: '1', sender: 'customer', text: 'Hi, I need help with my account', time: '10:30 AM' },
    { id: '2', sender: 'agent', text: 'Hello! I\'d be happy to help you. What seems to be the issue?', time: '10:31 AM' },
    { id: '3', sender: 'customer', text: 'I can\'t access my billing information', time: '10:32 AM' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <User className="w-5 h-5 text-green-500" />
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

function EmailInteractionView() {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  if (!task) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Email Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
            <User className="w-5 h-5 text-purple-500" />
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

function EmptyInteractionView() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No Interaction Selected</h2>
      <p className="text-muted-foreground max-w-md">
        Select a conversation from the left panel to view details and interact with the customer.
      </p>
    </div>
  );
}

export function InteractionArea() {
  const { activeTasks, selectedTaskId } = useWebex();
  const selectedTask = activeTasks.find(t => t.taskId === selectedTaskId);

  if (!selectedTask) {
    return <EmptyInteractionView />;
  }

  switch (selectedTask.mediaType) {
    case 'voice':
      return <VoiceInteractionView />;
    case 'chat':
      return <ChatInteractionView />;
    case 'email':
      return <EmailInteractionView />;
    default:
      return <VoiceInteractionView />;
  }
}

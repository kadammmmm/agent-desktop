import { useWebex } from '@/contexts/WebexContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Mail, Pause, Play, Mic, MicOff, PhoneOff, Circle, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/webex';

interface ActiveTaskCardProps {
  task: Task;
}

const channelIcons = { voice: Phone, chat: MessageSquare, email: Mail, social: MessageSquare };

export function ActiveTaskCard({ task }: ActiveTaskCardProps) {
  const { holdTask, resumeTask, muteTask, unmuteTask, endTask, startRecording, stopRecording } = useWebex();
  const Icon = channelIcons[task.mediaType];

  const formatDuration = () => {
    const secs = Math.floor((Date.now() - task.startTime) / 1000);
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={cn("w-5 h-5", `channel-${task.mediaType}`)} />
            {task.direction === 'inbound' ? 'Inbound' : 'Outbound'} {task.mediaType}
          </CardTitle>
          <span className="text-sm font-mono text-muted-foreground">{formatDuration()}</span>
        </div>
        <p className="text-sm text-muted-foreground">{task.ani} • {task.queueName}</p>
      </CardHeader>
      <CardContent>
        {task.state === 'wrapup' ? (
          <WrapUpControls taskId={task.taskId} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={task.isHeld ? "default" : "outline"} onClick={() => task.isHeld ? resumeTask(task.taskId) : holdTask(task.taskId)}>
              {task.isHeld ? <Play className="w-4 h-4 mr-1" /> : <Pause className="w-4 h-4 mr-1" />}{task.isHeld ? 'Resume' : 'Hold'}
            </Button>
            {task.mediaType === 'voice' && (
              <Button size="sm" variant={task.isMuted ? "default" : "outline"} onClick={() => task.isMuted ? unmuteTask(task.taskId) : muteTask(task.taskId)}>
                {task.isMuted ? <Mic className="w-4 h-4 mr-1" /> : <MicOff className="w-4 h-4 mr-1" />}{task.isMuted ? 'Unmute' : 'Mute'}
              </Button>
            )}
            <Button size="sm" variant={task.isRecording ? "destructive" : "outline"} onClick={() => task.isRecording ? stopRecording(task.taskId) : startRecording(task.taskId)}>
              <Circle className={cn("w-4 h-4 mr-1", task.isRecording && "fill-current")} />{task.isRecording ? 'Stop Rec' : 'Record'}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => endTask(task.taskId)}>
              <PhoneOff className="w-4 h-4 mr-1" />End
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WrapUpControls({ taskId }: { taskId: string }) {
  const { wrapUpCodes, wrapUpTask } = useWebex();
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Select wrap-up reason:</p>
      <div className="flex flex-wrap gap-2">
        {wrapUpCodes.map(code => (
          <Button key={code.id} size="sm" variant="outline" onClick={() => wrapUpTask(taskId, code.id)}>{code.name}</Button>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { Phone, Pause, Play, Mic, MicOff, PhoneOff, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VoiceInteractionView() {
  const { 
    activeTasks, 
    selectedTaskId, 
    holdTask, 
    resumeTask, 
    muteTask, 
    unmuteTask, 
    endTask, 
    startRecording, 
    stopRecording, 
    wrapUpCodes, 
    wrapUpTask 
  } = useWebex();
  
  const task = activeTasks.find(t => t.taskId === selectedTaskId);
  const [duration, setDuration] = useState('0:00');
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Update duration timer
  useEffect(() => {
    if (!task) return;
    
    const updateDuration = () => {
      const secs = Math.floor((Date.now() - task.startTime) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setDuration(`${m}:${s.toString().padStart(2, '0')}`);
    };
    
    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [task?.startTime]);

  if (!task) return null;

  // Wrapup view
  if (task.state === 'wrapup') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        {/* Hidden audio element for remote stream */}
        <audio ref={audioRef} id="remote-audio" autoPlay className="hidden" />
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-secondary-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Call Ended</h2>
          <p className="text-muted-foreground">Duration: {duration}</p>
        </div>

        {/* Auto-wrapup timer if available */}
        <AutoWrapupTimer task={task} />

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

  // Active call view
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      {/* Hidden audio element for remote stream */}
      <audio ref={audioRef} id="remote-audio" autoPlay className="hidden" />
      
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
        <p className="text-3xl font-mono font-bold text-primary">{duration}</p>
        
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

/**
 * Auto-Wrapup Timer Component
 * Shows countdown when auto-wrapup is active on a task
 */
function AutoWrapupTimer({ task }: { task: any }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  useEffect(() => {
    // Check if task has auto-wrapup functionality (SDK feature)
    if (!task?.autoWrapup?.isRunning?.()) return;
    
    const updateTimer = () => {
      const remaining = task.autoWrapup.getTimeLeftSeconds?.() || 0;
      setTimeLeft(remaining);
    };
    
    updateTimer();
    const interval = setInterval(() => {
      const remaining = task.autoWrapup?.getTimeLeftSeconds?.() || 0;
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [task]);
  
  if (timeLeft <= 0) return null;
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return (
    <div className="flex items-center gap-2 text-muted-foreground mb-4 px-3 py-2 bg-muted/50 rounded-lg">
      <Clock className="w-4 h-4" />
      <span className="text-sm">
        Auto wrap-up in: <span className="font-mono font-medium">{minutes}:{seconds.toString().padStart(2, '0')}</span>
      </span>
    </div>
  );
}

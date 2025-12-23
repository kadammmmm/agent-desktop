import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Loader2 } from 'lucide-react';
import { useWebex } from '@/contexts/WebexContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VideoEscalationButtonProps {
  taskId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function VideoEscalationButton({ 
  taskId, 
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className 
}: VideoEscalationButtonProps) {
  const { escalateToVideo, activeTasks, isDemoMode } = useWebex();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const task = activeTasks.find(t => t.taskId === taskId);
  
  // Only show for chat/email/social interactions
  if (!task || task.mediaType === 'voice') {
    return null;
  }

  const handleEscalate = async () => {
    setIsLoading(true);
    try {
      await escalateToVideo(taskId);
      toast({
        title: 'Video Escalation Started',
        description: isDemoMode 
          ? 'Demo: Video link would be sent to customer'
          : 'Guest link sent to customer. Opening your video session...',
      });
    } catch (error) {
      console.error('[VideoEscalation] Error:', error);
      toast({
        title: 'Video Escalation Failed',
        description: error instanceof Error ? error.message : 'Could not create video meeting',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleEscalate}
      disabled={isLoading}
      className={cn('gap-2', className)}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Video className="w-4 h-4" />
      )}
      {showLabel && (size !== 'icon' ? (isLoading ? 'Starting...' : 'Video') : null)}
    </Button>
  );
}

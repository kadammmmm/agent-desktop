import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function QueueToggle() {
  const { agentState, setAgentState } = useWebex();
  const isOnQueue = agentState?.state === 'Available';

  const handleToggle = () => {
    if (isOnQueue) {
      setAgentState('Idle');
    } else {
      setAgentState('Available');
    }
  };

  return (
    <Button
      variant={isOnQueue ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      className={cn(
        "min-w-[100px] transition-all",
        isOnQueue && "bg-success hover:bg-success/90 text-success-foreground"
      )}
    >
      <span className={cn(
        "w-2 h-2 rounded-full mr-2",
        isOnQueue ? "bg-success-foreground" : "bg-muted-foreground"
      )} />
      {isOnQueue ? 'On Queue' : 'Off Queue'}
    </Button>
  );
}

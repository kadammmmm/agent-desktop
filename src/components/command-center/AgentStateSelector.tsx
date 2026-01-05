import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useWebex } from '@/contexts/WebexContext';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type { AgentState } from '@/types/webex';

interface AgentStateSelectorProps {
  collapsed: boolean;
}

const stateConfig: Record<AgentState, { label: string; className: string }> = {
  Available: { label: 'Available', className: 'state-available' },
  Idle: { label: 'Idle', className: 'state-idle' },
  RONA: { label: 'RONA', className: 'state-rona' },
  Engaged: { label: 'Engaged', className: 'state-engaged' },
  WrapUp: { label: 'Wrap Up', className: 'state-wrapup' },
  Offline: { label: 'Offline', className: 'state-offline' },
};

export function AgentStateSelector({ collapsed }: AgentStateSelectorProps) {
  const { agentState, agentProfile, idleCodes, setAgentState, isLoading, connectionError, initialize } = useWebex();
  const [displayTime, setDisplayTime] = useState('0:00');
  const [isRetrying, setIsRetrying] = useState(false);

  // Update timer display every second
  useEffect(() => {
    if (!agentState?.lastStateChangeTime) return;
    
    const updateTimer = () => {
      const seconds = Math.floor((Date.now() - agentState.lastStateChangeTime) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setDisplayTime(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [agentState?.lastStateChangeTime]);

  const handleStateChange = async (state: AgentState, idleCodeId?: string) => {
    await setAgentState(state, idleCodeId);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await initialize();
    } finally {
      setIsRetrying(false);
    }
  };

  // Show error state if connection failed
  if (connectionError) {
    return (
      <div className={cn(
        "flex flex-col items-center gap-2 px-3 py-2",
        collapsed && "justify-center px-2"
      )}>
        <AlertCircle className="w-4 h-4 text-destructive" />
        {!collapsed && (
          <>
            <span className="text-xs text-destructive text-center line-clamp-2">{connectionError}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-xs h-7 px-2"
            >
              {isRetrying ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Retry
            </Button>
          </>
        )}
      </div>
    );
  }

  // Show loading state while SDK initializes
  if (isLoading || !agentProfile) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 text-sidebar-muted",
        collapsed && "justify-center px-2"
      )}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {!collapsed && <span className="text-sm">Connecting...</span>}
      </div>
    );
  }

  const currentState = agentState?.state || 'Offline';
  const config = stateConfig[currentState];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "justify-center px-2"
          )}
        >
          <div className={cn("state-indicator shrink-0", config.className)} />
          {!collapsed && (
            <>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{config.label}</div>
                {agentState?.idleCode && (
                  <div className="text-xs text-sidebar-muted">{agentState.idleCode.name}</div>
                )}
              </div>
              {agentState && (
                <div className="flex items-center gap-1 text-xs text-sidebar-muted">
                  <Clock className="w-3 h-3" />
                  {displayTime}
                </div>
              )}
              <ChevronDown className="w-4 h-4 text-sidebar-muted" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? "center" : "start"} className="w-56">
        <DropdownMenuItem onClick={() => handleStateChange('Available')}>
          <div className="state-indicator state-available mr-2" />
          Available
        </DropdownMenuItem>
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <div className="state-indicator state-idle mr-2" />
            Idle
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {idleCodes.map(code => (
              <DropdownMenuItem 
                key={code.id}
                onClick={() => handleStateChange('Idle', code.id)}
              >
                {code.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => handleStateChange('Offline')}
          className="text-muted-foreground"
        >
          <div className="state-indicator state-offline mr-2" />
          Offline
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

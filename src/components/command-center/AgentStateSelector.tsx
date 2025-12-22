import { useState } from 'react';
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
import { ChevronDown, Clock } from 'lucide-react';
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
  const { agentState, agentProfile, idleCodes, setAgentState, login, logout } = useWebex();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login('team-001', '+1-800-555-0100');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStateChange = async (state: AgentState, idleCodeId?: string) => {
    await setAgentState(state, idleCodeId);
  };

  const formatDuration = (startTime: number) => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!agentProfile) {
    return (
      <Button
        onClick={handleLogin}
        disabled={isLoggingIn}
        size={collapsed ? "icon" : "default"}
        className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
      >
        {collapsed ? '→' : (isLoggingIn ? 'Logging in...' : 'Login')}
      </Button>
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
                  {formatDuration(agentState.lastStateChangeTime)}
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

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={logout} className="text-destructive">
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

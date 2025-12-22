import { 
  Phone, 
  Users, 
  ArrowRightLeft, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebex } from '@/contexts/WebexContext';
import { AgentStateSelector } from './AgentStateSelector';
import type { NavigationSection } from '@/types/webex';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CommandCenterSidebarProps {
  activeSection: NavigationSection;
  onSectionChange: (section: NavigationSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems: { id: NavigationSection; label: string; icon: React.ElementType }[] = [
  { id: 'interactions', label: 'Interactions', icon: Phone },
  { id: 'customer', label: 'Customer', icon: Users },
  { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function CommandCenterSidebar({ 
  activeSection, 
  onSectionChange, 
  collapsed, 
  onToggleCollapse 
}: CommandCenterSidebarProps) {
  const { isConnected, agentState, activeTasks } = useWebex();

  return (
    <aside 
      className={cn(
        "h-full bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Phone className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">WebexCC</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Connection Status */}
      <div className={cn(
        "px-3 py-2 border-b border-sidebar-border",
        collapsed ? "flex justify-center" : ""
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-2 text-xs",
              isConnected ? "text-state-available" : "text-state-rona"
            )}>
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {!collapsed && <span>{isConnected ? 'Connected' : 'Disconnected'}</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isConnected ? 'WebSocket Connected' : 'Connection Lost'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Agent State Selector */}
      <div className={cn(
        "p-3 border-b border-sidebar-border",
        collapsed ? "flex justify-center" : ""
      )}>
        <AgentStateSelector collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const hasNotification = item.id === 'interactions' && activeTasks.length > 0;

          const button = (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "nav-item w-full relative",
                isActive && "nav-item-active",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {hasNotification && (
                <span className={cn(
                  "absolute w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium",
                  collapsed ? "top-0 right-0" : "right-2"
                )}>
                  {activeTasks.length}
                </span>
              )}
            </button>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </nav>

      {/* Active Tasks Count */}
      {!collapsed && activeTasks.length > 0 && (
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-muted">
            {activeTasks.length} active {activeTasks.length === 1 ? 'task' : 'tasks'}
          </div>
        </div>
      )}
    </aside>
  );
}

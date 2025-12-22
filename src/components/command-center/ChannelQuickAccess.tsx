import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Mail, Grid3X3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useWebex } from '@/contexts/WebexContext';
import { cn } from '@/lib/utils';

const channels = [
  { id: 'chat', icon: MessageSquare, label: 'Chats' },
  { id: 'voice', icon: Phone, label: 'Calls' },
  { id: 'email', icon: Mail, label: 'Inbox' },
  { id: 'apps', icon: Grid3X3, label: 'Apps' },
];

export function ChannelQuickAccess() {
  const { activeTasks } = useWebex();

  const getChannelCount = (channelId: string) => {
    if (channelId === 'apps') return 0;
    return activeTasks.filter(t => t.mediaType === channelId).length;
  };

  return (
    <div className="flex items-center gap-1">
      {channels.map(channel => {
        const Icon = channel.icon;
        const count = getChannelCount(channel.id);
        
        return (
          <Tooltip key={channel.id}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9"
              >
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className={cn(
                    "absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-medium",
                    "flex items-center justify-center",
                    "bg-primary text-primary-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{channel.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

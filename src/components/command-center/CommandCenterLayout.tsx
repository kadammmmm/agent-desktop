import { useState } from 'react';
import { CommandCenterSidebar } from './CommandCenterSidebar';
import { ConversationsPanel } from './ConversationsPanel';
import { InteractionArea } from './InteractionArea';
import { ContextualPanelTabs } from './ContextualPanelTabs';
import { GlobalSearchBar } from './GlobalSearchBar';
import { ChannelQuickAccess } from './ChannelQuickAccess';
import { QueueToggle } from './QueueToggle';
import { useWebex } from '@/contexts/WebexContext';
import type { NavigationSection } from '@/types/webex';
import { ChevronRight, ChevronLeft, PanelRightOpen, PanelRightClose, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function CommandCenterLayout() {
  const { agentProfile } = useWebex();
  const [activeSection, setActiveSection] = useState<NavigationSection>('interactions');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar Navigation */}
      <CommandCenterSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Enhanced Header */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden"
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
            
            {/* Global Search */}
            <GlobalSearchBar />
          </div>

          {/* Center Section - Channel Quick Access */}
          <div className="hidden md:flex items-center">
            <ChannelQuickAccess />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Queue Toggle */}
            <QueueToggle />

            {/* Context Panel Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowContextPanel(!showContextPanel)}
              className="hidden lg:flex"
            >
              {showContextPanel ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
            </Button>

            {/* Agent Avatar */}
            {agentProfile && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {agentProfile.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>

        {/* 3-Column Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations Panel (Left Column) */}
          <aside className={cn(
            "w-72 border-r border-border shrink-0 transition-all duration-300",
            "hidden md:block"
          )}>
            <ConversationsPanel />
          </aside>

          {/* Interaction Area (Center Column) */}
          <main className="flex-1 overflow-hidden bg-background">
            <InteractionArea />
          </main>

          {/* Contextual Panel (Right Column) */}
          {showContextPanel && (
            <aside className="hidden lg:flex w-80 xl:w-96 border-l border-border bg-card/30 flex-col shrink-0">
              <ContextualPanelTabs onClose={() => setShowContextPanel(false)} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

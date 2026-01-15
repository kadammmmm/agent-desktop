import { useState, useEffect, useCallback } from 'react';
import { CommandCenterSidebar } from './CommandCenterSidebar';
import { ConversationsPanel } from './ConversationsPanel';
import { InteractionArea } from './InteractionArea';
import { ContextualPanelTabs } from './ContextualPanelTabs';
import { GlobalSearchBar } from './GlobalSearchBar';
import { ChannelQuickAccess } from './ChannelQuickAccess';
import { QueueToggle } from './QueueToggle';
import { DemoControlPanel } from './DemoControlPanel';
import { Customer360Enhanced } from './enhanced-panels/Customer360Enhanced';
import { CustomerDirectoryPanel } from './panels/CustomerDirectoryPanel';
import { TransferConsultPanel } from './panels/TransferConsultPanel';
import { AgentMetricsDashboard } from './panels/AgentMetricsDashboard';
import { SettingsPanel } from './panels/SettingsPanel';
import { SDKDebugPanel } from './SDKDebugPanel';
import { useWebex } from '@/contexts/WebexContext';
import type { NavigationSection } from '@/types/webex';
import { ChevronRight, ChevronLeft, PanelRightOpen, PanelRightClose, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function CommandCenterLayout() {
  const { agentProfile, sdkLogs, clearSDKLogs, exportSDKLogs, initialize, isInitialized, activeTasks, customerProfile } = useWebex();
  const [activeSection, setActiveSection] = useState<NavigationSection>('interactions');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Initialize SDK on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Keyboard shortcut for debug panel (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCloseDebugPanel = useCallback(() => {
    setShowDebugPanel(false);
  }, []);

  // Render main content based on active section
  const renderMainContent = () => {
    switch (activeSection) {
      case 'interactions':
        return (
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
        );

      case 'customer':
        // Show Customer360 if there's an active task with customer data, otherwise show directory
        const hasActiveCustomer = activeTasks.length > 0 && customerProfile;
        return (
          <main className="flex-1 overflow-auto bg-background">
            {hasActiveCustomer ? (
              <div className="p-4">
                <Customer360Enhanced />
              </div>
            ) : (
              <CustomerDirectoryPanel />
            )}
          </main>
        );

      case 'transfer':
        return (
          <main className="flex-1 overflow-auto bg-background p-4">
            <TransferConsultPanel />
          </main>
        );

      case 'analytics':
        return (
          <main className="flex-1 overflow-hidden bg-background">
            <AgentMetricsDashboard />
          </main>
        );

      case 'settings':
        return (
          <main className="flex-1 overflow-auto bg-background p-4">
            <SettingsPanel />
          </main>
        );

      default:
        return (
          <main className="flex-1 overflow-hidden bg-background">
            <InteractionArea />
          </main>
        );
    }
  };

  // Only show context panel toggle for interactions view
  const showContextToggle = activeSection === 'interactions';

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
        {/* Enhanced Header with b+s gradient accent */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 relative">
          {/* Gradient accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-bs-gradient-accent" />
          
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
            
            {/* Brand Title */}
            <h2 className="hidden sm:block text-sm font-medium text-foreground/80">
              Webex CC Agent Desktop
            </h2>
            
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

            {/* Debug Panel Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className={cn(
                "relative",
                showDebugPanel && "bg-primary/10 text-primary"
              )}
              title="Toggle SDK Debug Panel (Ctrl+Shift+D)"
            >
              <Bug className="h-5 w-5" />
              {sdkLogs.filter(l => l.level === 'error').length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {sdkLogs.filter(l => l.level === 'error').length}
                </span>
              )}
            </Button>

            {/* Context Panel Toggle - only for interactions view */}
            {showContextToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowContextPanel(!showContextPanel)}
                className="hidden lg:flex"
              >
                {showContextPanel ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
              </Button>
            )}

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

        {/* Dynamic Content Area */}
        {renderMainContent()}
      </div>
      
      {/* Demo Control Panel - floating */}
      <DemoControlPanel />

      {/* SDK Debug Panel */}
      {showDebugPanel && (
        <SDKDebugPanel
          logs={sdkLogs}
          onClearLogs={clearSDKLogs}
          onExportLogs={exportSDKLogs}
          onClose={handleCloseDebugPanel}
        />
      )}
    </div>
  );
}

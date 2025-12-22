import { useState } from 'react';
import { CommandCenterSidebar } from './CommandCenterSidebar';
import { InteractionsPanel } from './panels/InteractionsPanel';
import { CustomerPanel } from './panels/CustomerPanel';
import { TransferPanel } from './panels/TransferPanel';
import { AnalyticsPanel } from './panels/AnalyticsPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { Customer360Panel } from './enhanced-panels/Customer360Panel';
import { NotesPanel } from './enhanced-panels/NotesPanel';
import { useWebex } from '@/contexts/WebexContext';
import type { NavigationSection, EnhancedPanelState } from '@/types/webex';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CommandCenterLayout() {
  const { isInitialized, agentProfile } = useWebex();
  const [activeSection, setActiveSection] = useState<NavigationSection>('interactions');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [enhancedPanels, setEnhancedPanels] = useState<EnhancedPanelState>({
    customer360: false,
    analytics: false,
    transferDirectory: false,
    notes: false,
  });

  const toggleEnhancedPanel = (panel: keyof EnhancedPanelState) => {
    setEnhancedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel],
    }));
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case 'interactions':
        return <InteractionsPanel onTogglePanel={toggleEnhancedPanel} enhancedPanels={enhancedPanels} />;
      case 'customer':
        return <CustomerPanel />;
      case 'transfer':
        return <TransferPanel />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <InteractionsPanel onTogglePanel={toggleEnhancedPanel} enhancedPanels={enhancedPanels} />;
    }
  };

  const hasActiveEnhancedPanel = Object.values(enhancedPanels).some(v => v);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <CommandCenterSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden"
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              Agent Command Center
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {agentProfile && (
              <span className="text-sm text-muted-foreground">
                {agentProfile.name} • {agentProfile.teamName}
              </span>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Primary Content */}
          <main className={`flex-1 overflow-auto p-4 transition-all duration-300 ${hasActiveEnhancedPanel ? 'lg:pr-0' : ''}`}>
            {renderMainContent()}
          </main>

          {/* Enhanced Panels (Right Side) */}
          {hasActiveEnhancedPanel && (
            <aside className="hidden lg:flex w-80 xl:w-96 border-l border-border bg-card/30 flex-col shrink-0">
              <div className="flex-1 overflow-auto scrollbar-thin">
                {enhancedPanels.customer360 && (
                  <Customer360Panel onClose={() => toggleEnhancedPanel('customer360')} />
                )}
                {enhancedPanels.notes && (
                  <NotesPanel onClose={() => toggleEnhancedPanel('notes')} />
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

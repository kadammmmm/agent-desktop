import { useWebex } from '@/contexts/WebexContext';
import { IncomingTaskCard } from '../IncomingTaskCard';
import { ActiveTaskCard } from '../ActiveTaskCard';
import { TaskList } from '../TaskList';
import { OutdialPanel } from '../OutdialPanel';
import { Button } from '@/components/ui/button';
import { User, StickyNote } from 'lucide-react';
import type { EnhancedPanelState } from '@/types/webex';

interface InteractionsPanelProps {
  onTogglePanel: (panel: keyof EnhancedPanelState) => void;
  enhancedPanels: EnhancedPanelState;
}

export function InteractionsPanel({ onTogglePanel, enhancedPanels }: InteractionsPanelProps) {
  const { activeTasks, incomingTask, selectedTaskId, agentProfile } = useWebex();
  const selectedTask = activeTasks.find(t => t.taskId === selectedTaskId);

  if (!agentProfile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Welcome to Agent Command Center</p>
          <p className="text-sm mt-2">Please login using the sidebar to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant={enhancedPanels.customer360 ? "default" : "outline"}
          size="sm"
          onClick={() => onTogglePanel('customer360')}
        >
          <User className="w-4 h-4 mr-2" />
          Customer 360
        </Button>
        <Button
          variant={enhancedPanels.notes ? "default" : "outline"}
          size="sm"
          onClick={() => onTogglePanel('notes')}
        >
          <StickyNote className="w-4 h-4 mr-2" />
          Notes
        </Button>
      </div>

      {/* Incoming Task */}
      {incomingTask && <IncomingTaskCard task={incomingTask} />}

      {/* Active Task Controls */}
      {selectedTask && <ActiveTaskCard task={selectedTask} />}

      {/* Task List */}
      {activeTasks.length > 0 && <TaskList tasks={activeTasks} selectedTaskId={selectedTaskId} />}

      {/* Outdial */}
      {!selectedTask && <OutdialPanel />}
    </div>
  );
}

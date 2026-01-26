import { useWebex } from '@/contexts/WebexContext';
import { 
  VoiceInteractionView, 
  ChatInteractionView, 
  EmailInteractionView, 
  EmptyInteractionView 
} from './interaction-views';

/**
 * InteractionArea - Main interaction display component
 * Renders the appropriate view based on the selected task's media type
 * Refactored from large single file into focused view components
 */
export function InteractionArea() {
  const { activeTasks, selectedTaskId } = useWebex();
  const selectedTask = activeTasks.find(t => t.taskId === selectedTaskId);

  if (!selectedTask) {
    return <EmptyInteractionView />;
  }

  switch (selectedTask.mediaType) {
    case 'voice':
      return <VoiceInteractionView />;
    case 'chat':
      return <ChatInteractionView />;
    case 'email':
      return <EmailInteractionView />;
    default:
      return <VoiceInteractionView />;
  }
}

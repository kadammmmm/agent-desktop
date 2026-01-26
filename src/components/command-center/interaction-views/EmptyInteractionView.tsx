import { MessageSquare } from 'lucide-react';

export function EmptyInteractionView() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No Interaction Selected</h2>
      <p className="text-muted-foreground max-w-md">
        Select a conversation from the left panel to view details and interact with the customer.
      </p>
    </div>
  );
}

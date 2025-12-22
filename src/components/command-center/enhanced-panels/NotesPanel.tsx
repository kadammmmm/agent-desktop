import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, StickyNote, Save } from 'lucide-react';

interface NotesPanelProps {
  onClose: () => void;
}

export function NotesPanel({ onClose }: NotesPanelProps) {
  const [notes, setNotes] = useState('');

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><StickyNote className="w-4 h-4" />Notes</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <Textarea placeholder="Add notes for this interaction..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[120px] mb-3" />
      <Button size="sm" className="w-full"><Save className="w-4 h-4 mr-2" />Save Notes</Button>
    </div>
  );
}

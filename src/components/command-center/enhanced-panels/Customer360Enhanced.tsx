import { useState } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  User, Phone, Mail, MapPin, Building, CheckCircle2,
  ChevronDown, ChevronUp, Edit2, Save, X, Plus,
  MessageSquare, Clock, Pin, TrendingUp, TrendingDown, Minus,
  PhoneCall, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

export function Customer360Enhanced() {
  const {
    activeTasks,
    selectedTaskId,
    customerProfile,
    customerNotes,
    interactionHistory,
    updateCADVariable,
    addCustomerNote,
  } = useWebex();

  const task = activeTasks.find(t => t.taskId === selectedTaskId);
  const [expandedSections, setExpandedSections] = useState<string[]>(['contact', 'cad']);
  const [editingCAD, setEditingCAD] = useState(false);
  const [cadEdits, setCadEdits] = useState<Record<string, string>>({});
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleSaveCAD = () => {
    if (!task) return;
    Object.entries(cadEdits).forEach(([key, value]) => {
      updateCADVariable(task.taskId, key, value);
    });
    setEditingCAD(false);
    setCadEdits({});
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addCustomerNote(newNote.trim());
    setNewNote('');
    setShowNoteInput(false);
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return <TrendingUp className="w-4 h-4 text-state-available" />;
      case 'negative': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'voice': return <PhoneCall className="w-4 h-4" />;
      case 'chat': return <MessageSquare className="w-4 h-4" />;
      case 'email': return <FileText className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  if (!task || !customerProfile) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
        <User className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="font-medium mb-1">No Customer Selected</h3>
        <p className="text-sm">Accept an interaction to view customer details</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 animate-fade-in">
        {/* Customer Header */}
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            {customerProfile.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-state-available" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold truncate">{customerProfile.name}</h2>
            </div>
            {customerProfile.company && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building className="w-3 h-3" />
                {customerProfile.company}
              </p>
            )}
            {/* Tags */}
            {customerProfile.tags && customerProfile.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {customerProfile.tags.map((tag, i) => (
                  <span
                    key={i}
                    className={cn("px-2 py-0.5 rounded-full text-xs font-medium", tag.color)}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sentiment Indicator */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm font-medium">Current Sentiment</span>
          <div className="flex items-center gap-2">
            {getSentimentIcon(task.cadVariables.Sentiment)}
            <span className="text-sm capitalize">
              {task.cadVariables.Sentiment || 'Neutral'}
            </span>
          </div>
        </div>

        {/* Contact Details */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection('contact')}
          >
            <span className="font-medium text-sm">Contact Information</span>
            {expandedSections.includes('contact')
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />
            }
          </button>
          {expandedSections.includes('contact') && (
            <div className="px-3 pb-3 space-y-3">
              {customerProfile.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${customerProfile.phone}`} className="hover:text-primary transition-colors">
                    {customerProfile.phone}
                  </a>
                </div>
              )}
              {customerProfile.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${customerProfile.email}`} className="hover:text-primary transition-colors truncate">
                    {customerProfile.email}
                  </a>
                </div>
              )}
              {customerProfile.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{customerProfile.address}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CAD Variables */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection('cad')}
          >
            <span className="font-medium text-sm">Call Data (CAD)</span>
            <div className="flex items-center gap-2">
              {!editingCAD && expandedSections.includes('cad') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCAD(true);
                    setCadEdits({ ...task.cadVariables });
                  }}
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
              {expandedSections.includes('cad')
                ? <ChevronUp className="w-4 h-4" />
                : <ChevronDown className="w-4 h-4" />
              }
            </div>
          </button>
          {expandedSections.includes('cad') && (
            <div className="px-3 pb-3">
              {editingCAD ? (
                <div className="space-y-2">
                  {Object.entries(cadEdits).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{key}</span>
                      <Input
                        value={value}
                        onChange={(e) => setCadEdits(prev => ({ ...prev, [key]: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={handleSaveCAD}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingCAD(false);
                      setCadEdits({});
                    }}>
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(task.cadVariables).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection('notes')}
          >
            <span className="font-medium text-sm">Notes ({customerNotes.length})</span>
            <div className="flex items-center gap-2">
              {expandedSections.includes('notes') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNoteInput(true);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              )}
              {expandedSections.includes('notes')
                ? <ChevronUp className="w-4 h-4" />
                : <ChevronDown className="w-4 h-4" />
              }
            </div>
          </button>
          {expandedSections.includes('notes') && (
            <div className="px-3 pb-3 space-y-3">
              {showNoteInput && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setShowNoteInput(false);
                      setNewNote('');
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {customerNotes.map(note => (
                <div
                  key={note.id}
                  className={cn(
                    "p-3 rounded-lg bg-muted/50 relative",
                    note.isPinned && "border-l-2 border-primary"
                  )}
                >
                  {note.isPinned && (
                    <Pin className="w-3 h-3 text-primary absolute top-2 right-2" />
                  )}
                  <p className="text-sm">{note.text}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.author} • {formatDistanceToNow(note.timestamp, { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interaction History */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection('history')}
          >
            <span className="font-medium text-sm">Interaction History ({interactionHistory.length})</span>
            {expandedSections.includes('history')
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />
            }
          </button>
          {expandedSections.includes('history') && (
            <div className="px-3 pb-3 space-y-2">
              {interactionHistory.map((entry, index) => (
                <div
                  key={entry.taskId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    entry.mediaType === 'voice' && "bg-blue-500/10 text-blue-500",
                    entry.mediaType === 'chat' && "bg-green-500/10 text-green-500",
                    entry.mediaType === 'email' && "bg-purple-500/10 text-purple-500"
                  )}>
                    {getMediaIcon(entry.mediaType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{entry.mediaType}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {entry.direction}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(entry.timestamp, 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">
                      {Math.floor(entry.duration / 60)}:{(entry.duration % 60).toString().padStart(2, '0')}
                    </p>
                    {entry.wrapUpCode && (
                      <p className="text-xs text-muted-foreground capitalize">{entry.wrapUpCode}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
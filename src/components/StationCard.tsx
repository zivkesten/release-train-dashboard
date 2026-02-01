import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stop, STOP_CONFIGS } from '@/types/release';
import { StatusPill } from './StatusPill';
import { StopIcon } from './StopIcon';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  CheckCircle2, 
  Ban, 
  MessageSquarePlus, 
  Bot, 
  User,
  ChevronDown,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface StationCardProps {
  stop: Stop;
  isCurrent: boolean;
  isReadOnly: boolean;
  onStart: () => void;
  onComplete: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onAddNote: (text: string) => void;
}

export function StationCard({
  stop,
  isCurrent,
  isReadOnly,
  onStart,
  onComplete,
  onBlock,
  onUnblock,
  onAddNote,
}: StationCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const config = STOP_CONFIGS[stop.number - 1];

  const handleAddNote = () => {
    if (noteText.trim()) {
      onAddNote(noteText.trim());
      setNoteText('');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative bg-card rounded-lg border shadow-card p-4 min-w-[280px] max-w-[320px]',
        'transition-all duration-300',
        isCurrent && 'ring-2 ring-primary shadow-glow-sm',
        stop.status === 'done' && 'opacity-80',
        stop.status === 'blocked' && 'ring-2 ring-status-blocked'
      )}
      role="article"
      aria-label={`Station ${stop.number}: ${stop.title}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div 
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg',
            stop.status === 'done' ? 'bg-status-done/10 text-status-done' :
            stop.status === 'in-progress' ? 'bg-primary/10 text-primary' :
            stop.status === 'blocked' ? 'bg-status-blocked/10 text-status-blocked' :
            'bg-muted text-muted-foreground'
          )}
        >
          <StopIcon icon={config.icon} className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Stop {stop.number}
            </span>
            <StatusPill status={stop.status} />
          </div>
          <h3 className="font-semibold text-sm leading-tight truncate">
            {stop.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {stop.description}
      </p>

      {/* Owner */}
      <div className="flex items-center gap-2 text-xs mb-3">
        {stop.ownerType === 'automation' ? (
          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <User className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">
          {stop.ownerType === 'automation' ? 'Automation' : 'Owner'}:
        </span>
        <span className="font-medium">{stop.ownerName}</span>
      </div>

      {/* Timestamps */}
      {(stop.startedAt || stop.completedAt) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Clock className="w-3 h-3" />
          {stop.completedAt ? (
            <span>Completed {formatDistanceToNow(new Date(stop.completedAt), { addSuffix: true })}</span>
          ) : stop.startedAt ? (
            <span>Started {formatDistanceToNow(new Date(stop.startedAt), { addSuffix: true })}</span>
          ) : null}
        </div>
      )}

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex flex-wrap gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
          {stop.status === 'not-started' && isCurrent && (
            <Button 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              className="h-7 text-xs focus-ring"
            >
              <Play className="w-3 h-3 mr-1" />
              Start
            </Button>
          )}
          
          {stop.status === 'in-progress' && (
            <>
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
                className="h-7 text-xs focus-ring"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Mark Done
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onBlock();
                }}
                className="h-7 text-xs focus-ring"
              >
                <Ban className="w-3 h-3 mr-1" />
                Block
              </Button>
            </>
          )}
          
          {stop.status === 'blocked' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onUnblock();
              }}
              className="h-7 text-xs focus-ring"
            >
              Unblock
            </Button>
          )}
        </div>
      )}

      {/* Notes Section */}
      <div className="border-t pt-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowNotes(!showNotes);
          }}
          className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring rounded"
          aria-expanded={showNotes}
        >
          <span className="flex items-center gap-1.5">
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Notes ({stop.notes.length})
          </span>
          <ChevronDown className={cn(
            'w-3.5 h-3.5 transition-transform',
            showNotes && 'rotate-180'
          )} />
        </button>
        
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2">
                {stop.notes.map(note => (
                  <div key={note.id} className="bg-muted/50 rounded p-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{note.author}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{note.text}</p>
                  </div>
                ))}
                
                {!isReadOnly && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Add a note..."
                      className="flex-1 h-7 px-2 text-xs rounded border bg-background focus-ring"
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleAddNote();
                      }}
                    />
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddNote();
                      }}
                      disabled={!noteText.trim()}
                      className="h-7 text-xs"
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

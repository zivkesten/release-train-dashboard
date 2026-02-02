import { Stop, STOP_CONFIGS } from '@/types/release';
import { StatusPill } from './StatusPill';
import { StopIcon } from './StopIcon';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Play, 
  CheckCircle2, 
  Ban, 
  Bot, 
  User,
  Clock,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface ProfileOption {
  id: string;
  display_name: string | null;
  email: string;
}

interface StationEditPanelProps {
  stop: Stop | null;
  isAdmin: boolean;
  isReadOnly: boolean;
  profiles?: ProfileOption[];
  onClose?: () => void;
  onStart: () => void;
  onComplete: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onOwnerChange?: (ownerName: string) => void;
  onOwnerTypeChange?: (ownerType: 'person' | 'automation') => void;
  showCloseButton?: boolean;
}

export function StationEditPanel({
  stop,
  isAdmin,
  isReadOnly,
  profiles = [],
  onClose,
  onStart,
  onComplete,
  onBlock,
  onUnblock,
  onOwnerChange,
  onOwnerTypeChange,
  showCloseButton = false,
}: StationEditPanelProps) {
  if (!stop) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-muted-foreground">
        <p>Select a station to view details</p>
      </div>
    );
  }

  const config = STOP_CONFIGS[stop.number - 1];
  const isDisabled = !isAdmin || isReadOnly;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div className="flex items-start gap-3">
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
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Stop {stop.number}
              </span>
              <StatusPill status={stop.status} />
            </div>
            <h3 className="font-semibold text-lg leading-tight">
              {stop.title}
            </h3>
          </div>
        </div>
        
        {showCloseButton && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={stop.description}
            disabled={isDisabled}
            className="min-h-[80px] resize-none"
            placeholder="No description"
          />
          {isDisabled && !isAdmin && (
            <p className="text-xs text-muted-foreground">Only admins can edit</p>
          )}
        </div>

        {/* Owner Type */}
        <div className="space-y-2">
          <Label>Owner Type</Label>
          <Select 
            disabled={isDisabled} 
            value={stop.ownerType}
            onValueChange={(value) => onOwnerTypeChange?.(value as 'person' | 'automation')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="person">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Person
                </div>
              </SelectItem>
              <SelectItem value="automation">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Automation
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Owner Name */}
        <div className="space-y-2">
          <Label htmlFor="ownerName">Owner</Label>
          <Select 
            disabled={isDisabled} 
            value={stop.ownerName}
            onValueChange={(value) => onOwnerChange?.(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.display_name || profile.email}>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {profile.display_name || profile.email}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timestamps */}
        {(stop.startedAt || stop.completedAt) && (
          <div className="space-y-2">
            <Label>Timestamps</Label>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              {stop.startedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Started {formatDistanceToNow(new Date(stop.startedAt), { addSuffix: true })}</span>
                </div>
              )}
              {stop.completedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed {formatDistanceToNow(new Date(stop.completedAt), { addSuffix: true })}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Summary */}
        {stop.notes.length > 0 && (
          <div className="space-y-2">
            <Label>Notes ({stop.notes.length})</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {stop.notes.map(note => (
                <div key={note.id} className="bg-muted/50 rounded p-2 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{note.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{note.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      {!isReadOnly && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {stop.status === 'not-started' && (
              <Button 
                onClick={onStart}
                disabled={isDisabled}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
            )}
            
            {stop.status === 'in-progress' && (
              <>
                <Button 
                  onClick={onComplete}
                  disabled={isDisabled}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Done
                </Button>
                <Button 
                  variant="destructive"
                  onClick={onBlock}
                  disabled={isDisabled}
                  className="flex-1"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Block
                </Button>
              </>
            )}
            
            {stop.status === 'blocked' && (
              <Button 
                variant="outline"
                onClick={onUnblock}
                disabled={isDisabled}
                className="flex-1"
              >
                Unblock
              </Button>
            )}
            
            {stop.status === 'done' && (
              <p className="w-full text-center text-sm text-muted-foreground py-2">
                This stop is complete
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

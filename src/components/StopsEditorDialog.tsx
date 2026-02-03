import { useState, useEffect } from 'react';
import { STOP_CONFIGS } from '@/types/release';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Bot, User, Plus, Trash2 } from 'lucide-react';
import { StopIcon } from '@/components/StopIcon';

interface StopData {
  id?: string;
  number: number;
  title: string;
  description: string;
  ownerType: 'person' | 'automation';
  ownerName: string;
  icon: string;
  status?: string;
  isNew?: boolean;
  toDelete?: boolean;
}

interface StopsEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releaseId: string;
  releaseName: string;
  currentStops: Array<{
    id: string;
    number: number;
    title: string;
    description: string | null;
    owner_type: string;
    owner_name: string;
    status: string;
  }>;
  onSave: (
    stopsToAdd: Array<{
      number: number;
      title: string;
      description: string;
      ownerType: 'person' | 'automation';
      ownerName: string;
    }>,
    stopIdsToDelete: string[]
  ) => Promise<void>;
}

export function StopsEditorDialog({
  open,
  onOpenChange,
  releaseId,
  releaseName,
  currentStops,
  onSave,
}: StopsEditorDialogProps) {
  const [stops, setStops] = useState<StopData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize stops from currentStops
  useEffect(() => {
    if (open) {
      const mappedStops: StopData[] = currentStops.map((stop) => {
        const config = STOP_CONFIGS.find((c) => c.title === stop.title);
        return {
          id: stop.id,
          number: stop.number,
          title: stop.title,
          description: stop.description || '',
          ownerType: stop.owner_type as 'person' | 'automation',
          ownerName: stop.owner_name,
          icon: config?.icon || 'circle',
          status: stop.status,
          isNew: false,
          toDelete: false,
        };
      });
      setStops(mappedStops);
    }
  }, [open, currentStops]);

  const updateStop = (index: number, updates: Partial<StopData>) => {
    setStops((prev) =>
      prev.map((stop, i) => (i === index ? { ...stop, ...updates } : stop))
    );
  };

  const toggleDeleteStop = (index: number) => {
    setStops((prev) =>
      prev.map((stop, i) =>
        i === index ? { ...stop, toDelete: !stop.toDelete } : stop
      )
    );
  };

  const addNewStop = () => {
    const maxNumber = Math.max(...stops.map((s) => s.number), 0);
    const defaultConfig = STOP_CONFIGS[0];
    
    setStops((prev) => [
      ...prev,
      {
        number: maxNumber + 1,
        title: '',
        description: '',
        ownerType: 'person',
        ownerName: '',
        icon: defaultConfig?.icon || 'circle',
        isNew: true,
        toDelete: false,
      },
    ]);
  };

  const removeNewStop = (index: number) => {
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validate new stops
    const newStops = stops.filter((s) => s.isNew && !s.toDelete);
    for (const stop of newStops) {
      if (!stop.title.trim() || !stop.ownerName.trim()) {
        return; // Don't save if validation fails
      }
    }

    setIsSaving(true);
    try {
      const stopsToAdd = newStops.map((stop) => ({
        number: stop.number,
        title: stop.title,
        description: stop.description,
        ownerType: stop.ownerType,
        ownerName: stop.ownerName,
      }));

      const stopIdsToDelete = stops
        .filter((s) => s.toDelete && s.id)
        .map((s) => s.id!);

      await onSave(stopsToAdd, stopIdsToDelete);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save stops:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const existingStops = stops.filter((s) => !s.isNew);
  const newStops = stops.filter((s) => s.isNew);
  const hasChanges =
    newStops.length > 0 || stops.some((s) => s.toDelete);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Release Stops</DialogTitle>
          <DialogDescription>
            Add or remove stops for <strong>{releaseName}</strong>. Existing
            stops marked for deletion will be removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Stops */}
          {existingStops.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Current Stops ({existingStops.filter((s) => !s.toDelete).length})
              </Label>
              <div className="space-y-2">
                {existingStops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      stop.toDelete
                        ? 'bg-destructive/10 border-destructive/30 opacity-60'
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
                      <StopIcon icon={stop.icon} className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Stop {stop.number}
                        </span>
                        {stop.status === 'done' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-status-done/20 text-status-done">
                            Done
                          </span>
                        )}
                        {stop.status === 'in_progress' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                            In Progress
                          </span>
                        )}
                        {stop.status === 'blocked' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                            Blocked
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{stop.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {stop.ownerType === 'automation' ? '🤖' : '👤'}{' '}
                        {stop.ownerName}
                      </p>
                    </div>
                    <Button
                      variant={stop.toDelete ? 'outline' : 'ghost'}
                      size="sm"
                      onClick={() =>
                        toggleDeleteStop(stops.findIndex((s) => s.id === stop.id))
                      }
                      className={stop.toDelete ? 'text-primary' : 'text-destructive'}
                    >
                      {stop.toDelete ? 'Undo' : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Stops */}
          {newStops.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                New Stops ({newStops.length})
              </Label>
              <Accordion type="single" collapsible className="w-full">
                {newStops.map((stop, newIndex) => {
                  const actualIndex = stops.findIndex(
                    (s) => s.isNew && s.number === stop.number
                  );
                  return (
                    <AccordionItem
                      key={`new-${stop.number}`}
                      value={`new-${stop.number}`}
                    >
                      <div className="flex items-center gap-2">
                        <AccordionTrigger className="hover:no-underline flex-1">
                          <div className="flex items-center gap-3 text-left">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                              <StopIcon icon={stop.icon} className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                New Stop {stop.number}
                              </span>
                              <p className="font-medium text-sm">
                                {stop.title || 'Untitled'}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNewStop(actualIndex);
                          }}
                          className="text-destructive mr-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <AccordionContent>
                        <div className="space-y-4 pt-2 pl-10">
                          <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input
                              value={stop.title}
                              onChange={(e) =>
                                updateStop(actualIndex, { title: e.target.value })
                              }
                              placeholder="Step title"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={stop.description}
                              onChange={(e) =>
                                updateStop(actualIndex, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Brief description"
                              rows={2}
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Owner Type</Label>
                              <Select
                                value={stop.ownerType}
                                onValueChange={(val) =>
                                  updateStop(actualIndex, {
                                    ownerType: val as 'person' | 'automation',
                                  })
                                }
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

                            <div className="space-y-2">
                              <Label>Owner Name *</Label>
                              <Input
                                value={stop.ownerName}
                                onChange={(e) =>
                                  updateStop(actualIndex, {
                                    ownerName: e.target.value,
                                  })
                                }
                                placeholder={
                                  stop.ownerType === 'automation'
                                    ? 'e.g., GitHub Action'
                                    : 'e.g., Diana'
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}

          {/* Add New Stop Button */}
          <Button
            variant="outline"
            onClick={addNewStop}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Stop
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

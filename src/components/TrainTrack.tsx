import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReleaseRun, STOP_CONFIGS, StopStatus, Stop } from '@/types/release';
import { StationCard } from './StationCard';
import { StationEditPanel } from './StationEditPanel';
import { TrainIcon } from './TrainIcon';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import confetti from 'canvas-confetti';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface TrainTrackProps {
  run: ReleaseRun;
  isReadOnly: boolean;
  onUpdateStatus: (stopId: string, status: StopStatus) => void;
  onAdvance: () => void;
  onAddNote: (stopId: string, author: string, text: string) => void;
}

export function TrainTrack({
  run,
  isReadOnly,
  onUpdateStatus,
  onAdvance,
  onAddNote,
}: TrainTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trainMoving, setTrainMoving] = useState(false);
  const [prevStopIndex, setPrevStopIndex] = useState(-1);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  const isMobile = useIsMobile();
  const { isAdmin, canEdit } = useAuth();

  const currentStopIndex = run.stops.findIndex(s => s.status === 'in-progress' || s.status === 'blocked');
  const completedCount = run.stops.filter(s => s.status === 'done').length;
  const progressPercent = (completedCount / run.stops.length) * 100;
  const isComplete = run.stops.every(s => s.status === 'done');

  // Handle train movement animation
  useEffect(() => {
    if (prevStopIndex !== -1 && currentStopIndex !== prevStopIndex) {
      setTrainMoving(true);
      const timer = setTimeout(() => setTrainMoving(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevStopIndex(currentStopIndex);
  }, [currentStopIndex, prevStopIndex]);

  // Confetti on completion
  useEffect(() => {
    if (isComplete && !isReadOnly) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#14b8a6', '#f59e0b', '#22c55e', '#3b82f6'],
      });
    }
  }, [isComplete, isReadOnly]);

  // Auto-select current stop for desktop edit panel
  useEffect(() => {
    if (!isMobile && currentStopIndex >= 0) {
      setSelectedStop(run.stops[currentStopIndex]);
    } else if (!isMobile && run.stops.length > 0 && !selectedStop) {
      setSelectedStop(run.stops[0]);
    }
  }, [currentStopIndex, isMobile, run.stops]);

  // Update selected stop when run changes
  useEffect(() => {
    if (selectedStop) {
      const updatedStop = run.stops.find(s => s.id === selectedStop.id);
      if (updatedStop) {
        setSelectedStop(updatedStop);
      }
    }
  }, [run.stops, selectedStop?.id]);

  const handleComplete = (stopId: string) => {
    onAdvance();
  };

  const handleCardClick = (stop: Stop) => {
    if (isMobile && isAdmin) {
      setSelectedStop(stop);
      setMobileDrawerOpen(true);
    } else if (!isMobile) {
      setSelectedStop(stop);
    }
  };

  const getStopActions = (stop: Stop) => ({
    onStart: () => onUpdateStatus(stop.id, 'in-progress'),
    onComplete: () => handleComplete(stop.id),
    onBlock: () => onUpdateStatus(stop.id, 'blocked'),
    onUnblock: () => onUpdateStatus(stop.id, 'in-progress'),
  });

  return (
    <div 
      ref={trackRef}
      className="relative"
      role="region"
      aria-label="Release train track"
    >
      <div className="flex gap-6">
        {/* Track Section */}
        <div className="flex-1 min-w-0">
          {/* Vertical Track for all screen sizes */}
          <div className="relative pl-8">
            {/* Vertical Track Line */}
            <div className="absolute left-3 top-0 bottom-0 w-1.5 bg-track-bg rounded-full">
              <motion.div
                className="absolute top-0 left-0 right-0 bg-gradient-to-b from-primary to-primary-glow rounded-full shadow-glow"
                initial={{ height: 0 }}
                animate={{ height: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
            
            {/* Station Cards */}
            <div className="space-y-4">
              {run.stops.map((stop, index) => {
                const isCurrent = index === currentStopIndex;
                const isDone = stop.status === 'done';
                const isSelected = selectedStop?.id === stop.id;
                
                return (
                  <div key={stop.id} className="relative flex gap-4">
                    {/* Station Dot & Train */}
                    <div className="absolute left-[-20px] flex flex-col items-center">
                      {isCurrent && (
                        <motion.div
                          className="absolute -left-3 z-10"
                          layoutId="train-vertical"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        >
                          <TrainIcon isMoving={trainMoving} isFinal={isComplete} />
                        </motion.div>
                      )}
                      
                      {!isCurrent && (
                        <motion.div
                          className={cn(
                            'w-4 h-4 rounded-full border-2',
                            isDone ? 'bg-status-done border-status-done' :
                            stop.status === 'blocked' ? 'bg-status-blocked border-status-blocked' :
                            'bg-muted border-muted-foreground/30'
                          )}
                        />
                      )}
                    </div>
                    
                    {/* Card */}
                    <div 
                      className={cn(
                        'flex-1',
                        isCurrent && 'ml-8',
                      )}
                    >
                      <div
                        className={cn(
                          'inline-block w-full max-w-xl',
                          !isMobile && isSelected && 'ring-2 ring-primary rounded-lg',
                          (isMobile && isAdmin) && 'cursor-pointer',
                          !isMobile && 'cursor-pointer'
                        )}
                        onClick={() => handleCardClick(stop)}
                      >
                        <StationCard
                          stop={stop}
                          isCurrent={isCurrent}
                          isReadOnly={isReadOnly}
                          onStart={() => onUpdateStatus(stop.id, 'in-progress')}
                          onComplete={() => handleComplete(stop.id)}
                          onBlock={() => onUpdateStatus(stop.id, 'blocked')}
                          onUnblock={() => onUpdateStatus(stop.id, 'in-progress')}
                          onAddNote={(text) => onAddNote(stop.id, 'You', text)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop Edit Panel */}
        {!isMobile && (
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24 border rounded-lg bg-card shadow-sm overflow-hidden min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedStop?.id || 'empty'}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <StationEditPanel
                    stop={selectedStop}
                    isAdmin={isAdmin}
                    isReadOnly={isReadOnly}
                    {...(selectedStop ? getStopActions(selectedStop) : {
                      onStart: () => {},
                      onComplete: () => {},
                      onBlock: () => {},
                      onUnblock: () => {},
                    })}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Edit Drawer - Admin only */}
      {isMobile && (
        <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>
                {selectedStop ? `Stop ${selectedStop.number}: ${selectedStop.title}` : 'Station Details'}
              </DrawerTitle>
            </DrawerHeader>
            <StationEditPanel
              stop={selectedStop}
              isAdmin={isAdmin}
              isReadOnly={isReadOnly}
              onClose={() => setMobileDrawerOpen(false)}
              showCloseButton
              {...(selectedStop ? getStopActions(selectedStop) : {
                onStart: () => {},
                onComplete: () => {},
                onBlock: () => {},
                onUnblock: () => {},
              })}
            />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

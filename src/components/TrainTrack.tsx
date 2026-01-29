import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ReleaseRun, STOP_CONFIGS, StopStatus } from '@/types/release';
import { StationCard } from './StationCard';
import { TrainIcon } from './TrainIcon';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

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

  const handleComplete = (stopId: string) => {
    onAdvance();
  };

  return (
    <div 
      ref={trackRef}
      className="relative"
      role="region"
      aria-label="Release train track"
    >
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
                <div className={cn('flex-1', isCurrent && 'ml-8')}>
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

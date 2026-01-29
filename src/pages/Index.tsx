import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReleaseData } from '@/hooks/useReleaseData';
import { Header } from '@/components/Header';
import { TrainTrack } from '@/components/TrainTrack';
import { PastRunsPanel } from '@/components/PastRunsPanel';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { History, Sparkles } from 'lucide-react';

const Index = () => {
  const {
    currentRun,
    pastRuns,
    selectedRun,
    selectedRunId,
    isViewingPast,
    isComplete,
    isLoaded,
    updateStopStatus,
    advanceToNextStop,
    addNote,
    resetDemoData,
    selectRun,
    getProgress,
  } = useReleaseData();

  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const allVersions = [currentRun, ...pastRuns].map(r => r.version);

  return (
    <div className="min-h-screen bg-background">
      <Header
        version={selectedRun.version}
        platform={selectedRun.platform}
        progress={getProgress(selectedRun)}
        isViewingPast={isViewingPast}
        versions={allVersions}
        onVersionChange={(v) => {
          const run = [currentRun, ...pastRuns].find(r => r.version === v);
          if (run) selectRun(run.id === currentRun.id ? null : run.id);
        }}
        onPlatformChange={() => {}} // Platform is per-run, not changeable
        onResetDemo={resetDemoData}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Release Title */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">
                  {selectedRun.version}
                </h2>
                {isComplete && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-status-done/10 text-status-done text-xs font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    Complete!
                  </motion.div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isViewingPast 
                  ? 'Viewing past release (read-only)'
                  : 'Current release train'
                }
              </p>
            </div>

            {/* Train Track */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedRun.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TrainTrack
                  run={selectedRun}
                  isReadOnly={isViewingPast}
                  onUpdateStatus={updateStopStatus}
                  onAdvance={advanceToNextStop}
                  onAddNote={addNote}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Desktop: Past Runs Sidebar */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <PastRunsPanel
                pastRuns={pastRuns}
                currentRunId={currentRun.id}
                selectedRunId={selectedRunId}
                onSelectRun={selectRun}
                getProgress={getProgress}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: History Sheet */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="rounded-full shadow-lg h-14 w-14"
              aria-label="View past runs"
            >
              <History className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
            <div className="pt-4">
              <PastRunsPanel
                pastRuns={pastRuns}
                currentRunId={currentRun.id}
                selectedRunId={selectedRunId}
                onSelectRun={(id) => {
                  selectRun(id);
                  setMobileHistoryOpen(false);
                }}
                getProgress={getProgress}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default Index;

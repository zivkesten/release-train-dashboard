import { useState, useEffect, useCallback } from 'react';
import { ReleaseRun, Note, StopStatus } from '@/types/release';
import { MOCK_CURRENT_RUN, MOCK_PAST_RUNS, createNewRun } from '@/data/mockData';

const STORAGE_KEY = 'release-train-data';

interface StoredData {
  currentRun: ReleaseRun;
  pastRuns: ReleaseRun[];
}

function loadFromStorage(): StoredData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return null;
}

function saveToStorage(data: StoredData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

export function useReleaseData() {
  const [currentRun, setCurrentRun] = useState<ReleaseRun>(MOCK_CURRENT_RUN);
  const [pastRuns, setPastRuns] = useState<ReleaseRun[]>(MOCK_PAST_RUNS);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setCurrentRun(stored.currentRun);
      setPastRuns(stored.pastRuns);
    }
    setIsLoaded(true);
  }, []);

  // Save data on change
  useEffect(() => {
    if (isLoaded) {
      saveToStorage({ currentRun, pastRuns });
    }
  }, [currentRun, pastRuns, isLoaded]);

  const selectedRun = selectedRunId 
    ? pastRuns.find(r => r.id === selectedRunId) || currentRun
    : currentRun;

  const isViewingPast = selectedRunId !== null && selectedRunId !== currentRun.id;

  const updateStopStatus = useCallback((stopId: string, status: StopStatus) => {
    if (isViewingPast) return;
    
    setCurrentRun(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      stops: prev.stops.map(stop => {
        if (stop.id !== stopId) return stop;
        
        return {
          ...stop,
          status,
          startedAt: status === 'in-progress' && !stop.startedAt 
            ? new Date().toISOString() 
            : stop.startedAt,
          completedAt: status === 'done' 
            ? new Date().toISOString() 
            : status === 'in-progress' ? null : stop.completedAt,
        };
      }),
    }));
  }, [isViewingPast]);

  const advanceToNextStop = useCallback(() => {
    if (isViewingPast) return;
    
    setCurrentRun(prev => {
      const currentStopIndex = prev.stops.findIndex(s => s.status === 'in-progress');
      if (currentStopIndex === -1) return prev;
      
      const currentStop = prev.stops[currentStopIndex];
      if (currentStop.status === 'blocked') return prev;
      
      const newStops = [...prev.stops];
      
      // Mark current as done
      newStops[currentStopIndex] = {
        ...currentStop,
        status: 'done',
        completedAt: new Date().toISOString(),
      };
      
      // Start next if exists
      if (currentStopIndex < newStops.length - 1) {
        newStops[currentStopIndex + 1] = {
          ...newStops[currentStopIndex + 1],
          status: 'in-progress',
          startedAt: new Date().toISOString(),
        };
      }
      
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        stops: newStops,
      };
    });
  }, [isViewingPast]);

  const addNote = useCallback((stopId: string, author: string, text: string) => {
    if (isViewingPast) return;
    
    const note: Note = {
      id: `note-${Date.now()}`,
      author,
      text,
      createdAt: new Date().toISOString(),
    };
    
    setCurrentRun(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      stops: prev.stops.map(stop => 
        stop.id === stopId 
          ? { ...stop, notes: [...stop.notes, note] }
          : stop
      ),
    }));
  }, [isViewingPast]);

  const resetDemoData = useCallback(() => {
    setCurrentRun(MOCK_CURRENT_RUN);
    setPastRuns(MOCK_PAST_RUNS);
    setSelectedRunId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const startNewRelease = useCallback((version: string, platform: 'ios' | 'android' | 'both') => {
    // Move current to past
    setPastRuns(prev => [currentRun, ...prev].slice(0, 5));
    // Create new
    setCurrentRun(createNewRun(version, platform));
    setSelectedRunId(null);
  }, [currentRun]);

  const selectRun = useCallback((runId: string | null) => {
    setSelectedRunId(runId);
  }, []);

  const getProgress = useCallback((run: ReleaseRun) => {
    const completed = run.stops.filter(s => s.status === 'done').length;
    return { completed, total: run.stops.length };
  }, []);

  const currentStopIndex = selectedRun.stops.findIndex(s => s.status === 'in-progress');
  const isComplete = selectedRun.stops.every(s => s.status === 'done');
  const isBlocked = selectedRun.stops.some(s => s.status === 'blocked');

  return {
    currentRun,
    pastRuns,
    selectedRun,
    selectedRunId,
    isViewingPast,
    currentStopIndex,
    isComplete,
    isBlocked,
    isLoaded,
    updateStopStatus,
    advanceToNextStop,
    addNote,
    resetDemoData,
    startNewRelease,
    selectRun,
    getProgress,
  };
}

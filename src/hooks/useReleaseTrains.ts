import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { STOP_CONFIGS } from '@/types/release';

export type Platform = 'ios' | 'android';
export type StopStatus = 'not_started' | 'in_progress' | 'done' | 'blocked';

export interface Stop {
  id: string;
  release_train_id: string;
  number: number;
  title: string;
  description: string | null;
  owner_type: string;
  owner_name: string;
  status: StopStatus;
  started_at: string | null;
  completed_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  stop_id: string;
  author_id: string;
  author_name: string;
  text: string;
  created_at: string;
}

export interface ReleaseTrain {
  id: string;
  app_id: string;
  platform: Platform;
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stops?: Stop[];
  notes?: Note[];
}

export function useReleaseTrains(appId: string | null, platform: Platform | null) {
  const { user, canEdit } = useAuth();
  const [releaseTrains, setReleaseTrains] = useState<ReleaseTrain[]>([]);
  const [stops, setStops] = useState<Record<string, Stop[]>>({});
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReleaseTrains = useCallback(async () => {
    if (!user || !appId || !platform) {
      setReleaseTrains([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('release_trains')
        .select('*')
        .eq('app_id', appId)
        .eq('platform', platform)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReleaseTrains(data || []);

      // Fetch stops for all release trains
      if (data && data.length > 0) {
        const trainIds = data.map(t => t.id);
        const { data: stopsData, error: stopsError } = await supabase
          .from('stops')
          .select('*')
          .in('release_train_id', trainIds)
          .order('number');

        if (stopsError) throw stopsError;

        // Group stops by release train
        const stopsMap: Record<string, Stop[]> = {};
        stopsData?.forEach(stop => {
          if (!stopsMap[stop.release_train_id]) {
            stopsMap[stop.release_train_id] = [];
          }
          stopsMap[stop.release_train_id].push(stop);
        });
        setStops(stopsMap);

        // Fetch notes for all stops
        if (stopsData && stopsData.length > 0) {
          const stopIds = stopsData.map(s => s.id);
          const { data: notesData, error: notesError } = await supabase
            .from('notes')
            .select('*')
            .in('stop_id', stopIds)
            .order('created_at', { ascending: false });

          if (notesError) throw notesError;

          // Group notes by stop
          const notesMap: Record<string, Note[]> = {};
          notesData?.forEach(note => {
            if (!notesMap[note.stop_id]) {
              notesMap[note.stop_id] = [];
            }
            notesMap[note.stop_id].push(note);
          });
          setNotes(notesMap);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, appId, platform]);

  useEffect(() => {
    fetchReleaseTrains();
  }, [fetchReleaseTrains]);

  const createReleaseTrain = async (version: string) => {
    if (!appId || !platform) throw new Error('App and platform required');

    // Create release train
    const { data: train, error: trainError } = await supabase
      .from('release_trains')
      .insert({ 
        app_id: appId, 
        platform, 
        version,
        is_active: true 
      })
      .select()
      .single();

    if (trainError) throw trainError;

    // Create all 10 stops - all start as not_started (train needs to be started)
    const stopsToCreate = STOP_CONFIGS.map((config, index) => ({
      release_train_id: train.id,
      number: index + 1,
      title: config.title,
      description: config.description,
      owner_type: config.ownerType,
      owner_name: config.ownerName,
      status: 'not_started' as StopStatus,
      started_at: null,
    }));

    const { data: newStops, error: stopsError } = await supabase
      .from('stops')
      .insert(stopsToCreate)
      .select();

    if (stopsError) throw stopsError;

    setReleaseTrains(prev => [train, ...prev]);
    setStops(prev => ({ ...prev, [train.id]: newStops || [] }));
    
    return train;
  };

  const updateStopStatus = async (stopId: string, status: StopStatus) => {
    if (!canEdit) throw new Error('No permission to edit');

    const updates: any = { 
      status,
      updated_by: user?.id,
    };

    if (status === 'in_progress' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (status === 'done') {
      updates.completed_at = new Date().toISOString();
    } else if (status === 'in_progress') {
      updates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('stops')
      .update(updates)
      .eq('id', stopId)
      .select()
      .single();

    if (error) throw error;

    // Update local state
    setStops(prev => {
      const newStops = { ...prev };
      for (const trainId in newStops) {
        newStops[trainId] = newStops[trainId].map(s => 
          s.id === stopId ? data : s
        );
      }
      return newStops;
    });

    return data;
  };

  const advanceToNextStop = async (trainId: string) => {
    if (!canEdit) throw new Error('No permission to edit');

    const trainStops = stops[trainId] || [];
    const currentIndex = trainStops.findIndex(s => s.status === 'in_progress');
    
    if (currentIndex === -1) return;

    const currentStop = trainStops[currentIndex];
    
    // Mark current as done
    await updateStopStatus(currentStop.id, 'done');

    // Start next if exists
    if (currentIndex < trainStops.length - 1) {
      await updateStopStatus(trainStops[currentIndex + 1].id, 'in_progress');
    }
  };

  const startTrain = async (trainId: string) => {
    if (!canEdit) throw new Error('No permission to edit');

    const trainStops = stops[trainId] || [];
    const firstStop = trainStops.find(s => s.number === 1);
    
    if (!firstStop) throw new Error('No stops found');
    if (firstStop.status !== 'not_started') throw new Error('Train already started');

    await updateStopStatus(firstStop.id, 'in_progress');
  };

  const resetTrain = async (trainId: string) => {
    if (!canEdit) throw new Error('No permission to edit');

    const trainStops = stops[trainId] || [];
    
    // Reset all stops to not_started
    for (const stop of trainStops) {
      const { error } = await supabase
        .from('stops')
        .update({
          status: 'not_started',
          started_at: null,
          completed_at: null,
          updated_by: user?.id,
        })
        .eq('id', stop.id);
      
      if (error) throw error;
    }

    // Refresh the data
    await fetchReleaseTrains();
  };

  const addNote = async (stopId: string, text: string) => {
    if (!user || !canEdit) throw new Error('No permission');

    const { data, error } = await supabase
      .from('notes')
      .insert({
        stop_id: stopId,
        author_id: user.id,
        author_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        text,
      })
      .select()
      .single();

    if (error) throw error;

    setNotes(prev => ({
      ...prev,
      [stopId]: [data, ...(prev[stopId] || [])],
    }));

    return data;
  };

  const getActiveRelease = () => releaseTrains.find(r => r.is_active);
  const getPastReleases = () => releaseTrains.filter(r => !r.is_active);

  return {
    releaseTrains,
    stops,
    notes,
    loading,
    error,
    fetchReleaseTrains,
    createReleaseTrain,
    updateStopStatus,
    advanceToNextStop,
    startTrain,
    resetTrain,
    addNote,
    getActiveRelease,
    getPastReleases,
  };
}

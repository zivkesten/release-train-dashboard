import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ReleaseWithDetails {
  id: string;
  app_id: string;
  app_name: string;
  platform: 'ios' | 'android';
  version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deadline: string | null;
  total_stops: number;
  completed_stops: number;
  in_progress_stops: number;
  blocked_stops: number;
  current_stop_title: string | null;
  is_complete: boolean;
}

export function useAllReleases() {
  const { user, isAdmin } = useAuth();
  const [releases, setReleases] = useState<ReleaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllReleases = useCallback(async () => {
    if (!user) {
      setReleases([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch all release trains with app info
      const { data: trains, error: trainsError } = await supabase
        .from('release_trains')
        .select(`
          *,
          apps!inner(name)
        `)
        .order('updated_at', { ascending: false });

      if (trainsError) throw trainsError;

      if (!trains || trains.length === 0) {
        setReleases([]);
        setLoading(false);
        return;
      }

      // Fetch all stops for these trains
      const trainIds = trains.map(t => t.id);
      const { data: stops, error: stopsError } = await supabase
        .from('stops')
        .select('*')
        .in('release_train_id', trainIds);

      if (stopsError) throw stopsError;

      // Group stops by train and calculate stats
      const stopsMap: Record<string, typeof stops> = {};
      stops?.forEach(stop => {
        if (!stopsMap[stop.release_train_id]) {
          stopsMap[stop.release_train_id] = [];
        }
        stopsMap[stop.release_train_id].push(stop);
      });

      // Build release details
      const releasesWithDetails: ReleaseWithDetails[] = trains.map(train => {
        const trainStops = stopsMap[train.id] || [];
        const completedStops = trainStops.filter(s => s.status === 'done').length;
        const inProgressStops = trainStops.filter(s => s.status === 'in_progress').length;
        const blockedStops = trainStops.filter(s => s.status === 'blocked').length;
        const currentStop = trainStops.find(s => s.status === 'in_progress');
        const isComplete = trainStops.length > 0 && completedStops === trainStops.length;

        return {
          id: train.id,
          app_id: train.app_id,
          app_name: (train.apps as any).name,
          platform: train.platform,
          version: train.version,
          is_active: train.is_active,
          created_at: train.created_at,
          updated_at: train.updated_at,
          deadline: train.deadline,
          total_stops: trainStops.length,
          completed_stops: completedStops,
          in_progress_stops: inProgressStops,
          blocked_stops: blockedStops,
          current_stop_title: currentStop?.title || null,
          is_complete: isComplete,
        };
      });

      setReleases(releasesWithDetails);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateVersion = async (releaseId: string, newVersion: string) => {
    if (!isAdmin) throw new Error('Only admins can update version');

    const { error } = await supabase
      .from('release_trains')
      .update({ version: newVersion })
      .eq('id', releaseId);

    if (error) throw error;
    await fetchAllReleases();
  };

  const updateDeadline = async (releaseId: string, deadline: string | null) => {
    if (!isAdmin) throw new Error('Only admins can update deadline');

    const { error } = await supabase
      .from('release_trains')
      .update({ deadline })
      .eq('id', releaseId);

    if (error) throw error;
    await fetchAllReleases();
  };

  useEffect(() => {
    fetchAllReleases();
  }, [fetchAllReleases]);

  return {
    releases,
    loading,
    error,
    refetch: fetchAllReleases,
    updateVersion,
    updateDeadline,
  };
}

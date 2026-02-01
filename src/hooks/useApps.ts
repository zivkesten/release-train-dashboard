import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface App {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useApps() {
  const { user } = useAuth();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    if (!user) {
      setApps([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('name');

      if (error) throw error;
      setApps(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const createApp = async (name: string, description?: string) => {
    const { data, error } = await supabase
      .from('apps')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    setApps(prev => [...prev, data]);
    return data;
  };

  const updateApp = async (id: string, updates: { name?: string; description?: string }) => {
    const { data, error } = await supabase
      .from('apps')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setApps(prev => prev.map(app => app.id === id ? data : app));
    return data;
  };

  const deleteApp = async (id: string) => {
    const { error } = await supabase
      .from('apps')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setApps(prev => prev.filter(app => app.id !== id));
  };

  return { apps, loading, error, fetchApps, createApp, updateApp, deleteApp };
}

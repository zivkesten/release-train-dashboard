import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'dev' | 'qa';

export interface UserWithRoles {
  id: string;
  email: string;
  display_name: string | null;
  roles: AppRole[];
  created_at: string;
}

export function useUserManagement() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole),
        created_at: profile.created_at,
      }));

      setUsers(usersWithRoles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const addRole = async (userId: string, role: AppRole) => {
    if (!isAdmin) throw new Error('Admin access required');

    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role });

    if (error) {
      if (error.code === '23505') {
        throw new Error('User already has this role');
      }
      throw error;
    }

    // Update local state
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, roles: [...u.roles, role] }
        : u
    ));
  };

  const removeRole = async (userId: string, role: AppRole) => {
    if (!isAdmin) throw new Error('Admin access required');

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) throw error;

    // Update local state
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, roles: u.roles.filter(r => r !== role) }
        : u
    ));
  };

  return { users, loading, error, fetchUsers, addRole, removeRole };
}

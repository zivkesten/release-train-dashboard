import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'dev' | 'qa' | 'product_manager';

export interface UserWithDetails {
  id: string;
  email: string;
  display_name: string | null;
  position: string | null;
  roles: AppRole[];
  created_at: string;
}

export function useAdminUsers() {
  const { isAdmin, user, session } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user || !isAdmin) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all profiles (admin can see all)
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
      const usersWithDetails: UserWithDetails[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        position: profile.position,
        roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole),
        created_at: profile.created_at,
      }));

      setUsers(usersWithDetails);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (
    email: string, 
    password: string, 
    displayName: string, 
    position: string, 
    role: AppRole
  ) => {
    if (!isAdmin || !session) throw new Error('Admin access required');

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'create',
        email,
        password,
        displayName,
        position,
        role,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    // Refresh the user list
    await fetchUsers();
    return data.user;
  };

  const deleteUser = async (userId: string) => {
    if (!isAdmin || !session) throw new Error('Admin access required');

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'delete',
        userId,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    // Update local state
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const updateUser = async (userId: string, updates: { displayName?: string; position?: string }) => {
    if (!isAdmin || !session) throw new Error('Admin access required');

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'update',
        userId,
        ...updates,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    // Refresh the user list
    await fetchUsers();
  };

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

    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, roles: u.roles.filter(r => r !== role) }
        : u
    ));
  };

  return { 
    users, 
    loading, 
    error, 
    fetchUsers, 
    createUser, 
    deleteUser, 
    updateUser,
    addRole, 
    removeRole 
  };
}

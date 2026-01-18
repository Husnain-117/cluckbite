import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const checkingRole = useRef(false);

  const checkAdminRole = useCallback(async (userId: string): Promise<boolean> => {
    // Prevent concurrent role checks
    if (checkingRole.current) {
      return false;
    }
    
    checkingRole.current = true;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      return !!data;
    } catch (err) {
      console.error('Error in checkAdminRole:', err);
      return false;
    } finally {
      checkingRole.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const initializeAuth = async () => {
      try {
        // Safety timeout - ensure loading never gets stuck
        timeoutId = setTimeout(() => {
          if (isMounted && loading) {
            console.warn('Admin auth timeout - forcing loading state to false');
            setLoading(false);
            setInitialized(true);
          }
        }, 5000);

        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          setUser(session.user);
          const hasAdminRole = await checkAdminRole(session.user.id);
          if (isMounted) {
            setIsAdmin(hasAdminRole);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        if (isMounted) {
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted || !initialized) return;
        
        // Only process meaningful auth events
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
          
          if (session?.user) {
            const hasAdminRole = await checkAdminRole(session.user.id);
            if (isMounted) {
              setIsAdmin(hasAdminRole);
            }
          } else {
            setIsAdmin(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [checkAdminRole, initialized, loading]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    navigate('/admin/login');
  };

  return { user, isAdmin, loading, signOut };
};

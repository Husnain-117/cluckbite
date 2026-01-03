import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useManagerAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isManager, setIsManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkManagerRole = async () => {
      if (authLoading) return;
      
      if (!user) {
        setIsLoading(false);
        setIsManager(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['manager', 'admin'])
          .maybeSingle();

        if (error) {
          console.error('Error checking role:', error);
          setIsManager(false);
        } else {
          setIsManager(!!data);
        }
      } catch (err) {
        console.error('Error:', err);
        setIsManager(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkManagerRole();
  }, [user, authLoading]);

  return { isManager, isLoading: isLoading || authLoading, user };
};

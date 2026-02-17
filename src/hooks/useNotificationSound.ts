import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type RecipientRole = 'manager' | 'admin';

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play two ascending tones for an alert effect
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration);
      oscillator.start(audioCtx.currentTime + startTime);
      oscillator.stop(audioCtx.currentTime + startTime + duration);
    };

    playTone(587, 0, 0.15);    // D5
    playTone(784, 0.15, 0.15); // G5
    playTone(988, 0.3, 0.3);   // B5
  } catch (e) {
    console.warn('Could not play notification sound:', e);
  }
};

export const useNotificationSound = (role: RecipientRole) => {
  const queryClient = useQueryClient();
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    const channel = supabase
      .channel(`${role}-notification-sound`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_role=eq.${role}`,
        },
        () => {
          playNotificationSound();
          queryClient.invalidateQueries({ queryKey: [`${role}-notifications`] });
          queryClient.invalidateQueries({ queryKey: [role === 'manager' ? 'unread-notifications' : 'admin-unread-notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, role]);
};

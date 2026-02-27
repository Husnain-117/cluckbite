import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type RecipientRole = 'manager' | 'admin';

let activeAlarm: { stop: () => void } | null = null;

const playAlarmSound = (): { stop: () => void } => {
  // Stop any existing alarm first
  if (activeAlarm) {
    activeAlarm.stop();
    activeAlarm = null;
  }

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    let stopped = false;
    let intervalId: ReturnType<typeof setInterval>;
    const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];

    const playRing = () => {
      if (stopped) return;

      // Two-tone alert like a phone ring / FoodPanda ding
      const frequencies = [880, 1100, 880, 1100, 880, 1100];
      const noteDuration = 0.12;
      const gap = 0.06;

      frequencies.forEach((freq, i) => {
        if (stopped) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square'; // Harsh & loud, cuts through noise
        osc.frequency.value = freq;

        const startTime = ctx.currentTime + i * (noteDuration + gap);
        gain.gain.setValueAtTime(0.5, startTime); // LOUD
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);

        osc.start(startTime);
        osc.stop(startTime + noteDuration + 0.01);
        nodes.push({ osc, gain });
      });
    };

    // Play immediately
    playRing();
    // Repeat every 2 seconds for up to 30 seconds
    intervalId = setInterval(playRing, 2000);

    const autoStopTimeout = setTimeout(() => {
      handle.stop();
    }, 30000);

    const handle = {
      stop: () => {
        if (stopped) return;
        stopped = true;
        clearInterval(intervalId);
        clearTimeout(autoStopTimeout);
        nodes.forEach(({ osc, gain }) => {
          try {
            gain.gain.cancelScheduledValues(0);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            osc.stop();
          } catch (_) { /* already stopped */ }
        });
        ctx.close().catch(() => {});
        activeAlarm = null;
      }
    };

    activeAlarm = handle;
    return handle;
  } catch (e) {
    console.warn('Could not play notification sound:', e);
    return { stop: () => {} };
  }
};

// Export for manual trigger (e.g. a test button)
export { playAlarmSound };

export const useNotificationSound = (role: RecipientRole) => {
  const queryClient = useQueryClient();
  const alarmRef = useRef<{ stop: () => void } | null>(null);

  // Stop alarm on user interaction anywhere on the page
  const stopAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.stop();
      alarmRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Let user click anywhere to dismiss the alarm
    const handleClick = () => stopAlarm();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [stopAlarm]);

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
          console.log(`[${role}] New notification received — playing alarm`);
          // Stop previous alarm if still playing
          stopAlarm();
          // Start new alarm
          alarmRef.current = playAlarmSound();
          
          queryClient.invalidateQueries({ queryKey: [`${role}-notifications`] });
          queryClient.invalidateQueries({ 
            queryKey: [role === 'manager' ? 'unread-notifications' : 'admin-unread-notifications'] 
          });
        }
      )
      .subscribe((status) => {
        console.log(`[${role}] Realtime subscription status:`, status);
      });

    return () => {
      stopAlarm();
      supabase.removeChannel(channel);
    };
  }, [queryClient, role, stopAlarm]);
};

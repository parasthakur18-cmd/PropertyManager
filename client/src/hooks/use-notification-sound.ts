import { useEffect, useRef, useState } from 'react';

type AlarmTone = 'bell' | 'urgent' | 'chime' | 'classic';

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [alarmTone, setAlarmTone] = useState<AlarmTone>('bell');
  const [repeatCount, setRepeatCount] = useState(5); // How many times to repeat (5 rings)
  const [volume, setVolume] = useState(0.8); // Volume level (0-1) - 80% loud

  useEffect(() => {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playTone = (toneType: AlarmTone, delay: number = 0) => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    
    // Resume audio context if it's suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const startTime = ctx.currentTime + delay;

    switch (toneType) {
      case 'urgent': {
        // Loud, attention-grabbing alarm (like a fire alarm)
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, startTime + (i * 0.15));
          
          gain.gain.setValueAtTime(0, startTime + (i * 0.15));
          gain.gain.linearRampToValueAtTime(volume * 0.8, startTime + (i * 0.15) + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + (i * 0.15) + 0.12);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(startTime + (i * 0.15));
          osc.stop(startTime + (i * 0.15) + 0.12);
        }
        break;
      }

      case 'bell': {
        // Pleasant two-tone bell
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(800, startTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + 0.6);
        osc2.stop(startTime + 0.6);
        break;
      }

      case 'chime': {
        // Soft three-note chime
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        frequencies.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime + (i * 0.2));
          
          gain.gain.setValueAtTime(0, startTime + (i * 0.2));
          gain.gain.linearRampToValueAtTime(volume * 0.4, startTime + (i * 0.2) + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + (i * 0.2) + 0.5);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(startTime + (i * 0.2));
          osc.stop(startTime + (i * 0.2) + 0.5);
        });
        break;
      }

      case 'classic': {
        // Classic beep-beep alarm
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, startTime + (i * 0.3));
          
          gain.gain.setValueAtTime(volume * 0.6, startTime + (i * 0.3));
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + (i * 0.3) + 0.2);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(startTime + (i * 0.3));
          osc.stop(startTime + (i * 0.3) + 0.2);
        }
        break;
      }
    }
  };

  const playNotification = () => {
    if (!isEnabled || !audioContextRef.current) return;

    // Play the alarm multiple times with 2 second intervals
    for (let i = 0; i < repeatCount; i++) {
      playTone(alarmTone, i * 2);
    }

    // Also request browser notification permission and show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 New Food Order!', {
        body: 'A new order has been received in the kitchen',
        icon: '/favicon.ico',
        tag: 'food-order',
        requireInteraction: true, // Keeps notification visible
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('🔔 New Food Order!', {
            body: 'A new order has been received in the kitchen',
            icon: '/favicon.ico',
            tag: 'food-order',
            requireInteraction: true,
          });
        }
      });
    }
  };

  return {
    playNotification,
    isEnabled,
    setIsEnabled,
    alarmTone,
    setAlarmTone,
    repeatCount,
    setRepeatCount,
    volume,
    setVolume,
  };
}

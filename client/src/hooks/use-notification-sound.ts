import { useEffect, useRef, useState } from 'react';

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

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

  const playNotification = () => {
    if (!isEnabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    
    // Resume audio context if it's suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create a pleasant notification sound using Web Audio API
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Two-tone pleasant bell sound
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(800, ctx.currentTime); // First tone
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(1000, ctx.currentTime); // Second tone (higher)

    // Configure volume envelope (fade in and out)
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    // Connect nodes
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Play the sound
    oscillator1.start(ctx.currentTime);
    oscillator2.start(ctx.currentTime);
    oscillator1.stop(ctx.currentTime + 0.6);
    oscillator2.stop(ctx.currentTime + 0.6);
  };

  return {
    playNotification,
    isEnabled,
    setIsEnabled,
  };
}

import { Vibration, Platform } from 'react-native';
import { StorageService } from './storage';

export const SoundService = {
  /**
   * Play an audible order notification bell & trigger haptic feedback
   */
  async playNewOrderAlert() {
    try {
      const enabled = await StorageService.getSoundAlert();
      if (!enabled) return;

      // 1. Dual-pulse tactile vibration (0ms delay, 250ms buzz, 100ms pause, 300ms buzz)
      Vibration.vibrate([0, 250, 100, 300]);

      // 2. Audible tone synthesis on platforms with Web Audio / AudioContext
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6

          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        }
      }
    } catch (err) {
      console.warn('SoundService error:', err);
    }
  },
};

import type {
  AchievementSoundPlayer,
  PreparedAchievementSound,
} from './notification-queue';

type BrowserWindow = Window & typeof globalThis;

interface ScheduledNode {
  dispose: () => void;
  start: () => void;
}

function scheduleTone(
  context: AudioContext,
  destination: AudioNode,
  frequency: number,
  startOffset: number,
  duration: number,
  peakGain: number,
): ScheduledNode {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startTime = context.currentTime + startOffset;
  const endTime = startTime + duration;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.025, endTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  oscillator.connect(gain);
  gain.connect(destination);

  return {
    dispose: () => {
      oscillator.disconnect();
      gain.disconnect();
    },
    start: () => {
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.02);
    },
  };
}

export function createAchievementSoundPlayer(windowRef: BrowserWindow): AchievementSoundPlayer {
  let context: AudioContext | undefined;
  let destroyed = false;
  let closePromise: Promise<void> | undefined;

  const getContext = () => {
    if (!windowRef.AudioContext) {
      throw new Error('Web Audio is not supported by this browser.');
    }

    context ??= new windowRef.AudioContext();
    return context;
  };

  return {
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;

      if (context && context.state !== 'closed') {
        closePromise ??= context.close().catch(() => {});
      }
    },
    prepare: async ({ userActivation = false } = {}): Promise<PreparedAchievementSound> => {
      if (destroyed) {
        throw new Error('The achievement sound player has been destroyed.');
      }

      const audioContext = getContext();

      if (audioContext.state === 'suspended') {
        if (!userActivation) {
          throw new Error('Achievement audio requires a browser activation.');
        }

        await audioContext.resume();
      }

      if (audioContext.state !== 'running') {
        throw new Error('The browser has not allowed achievement audio to play.');
      }

      const masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(0.72, audioContext.currentTime);
      masterGain.connect(audioContext.destination);

      // An original ascending two-note chime; no Steam audio asset is used.
      const nodes = [
        scheduleTone(audioContext, masterGain, 659.25, 0, 0.24, 0.17),
        scheduleTone(audioContext, masterGain, 987.77, 0.09, 0.34, 0.14),
      ];
      let disposed = false;

      return {
        dispose: () => {
          if (disposed) {
            return;
          }

          disposed = true;
          nodes.forEach((node) => node.dispose());
          masterGain.disconnect();
        },
        start: () => {
          if (destroyed || disposed || audioContext.state !== 'running') {
            throw new Error('The prepared achievement sound cannot start.');
          }

          nodes.forEach((node) => node.start());
        },
      };
    },
  };
}

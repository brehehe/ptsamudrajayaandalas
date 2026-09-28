/**
 * AudioNotification.ts — PT Samudra Jaya Andalas
 * Synthetic Maritime Notification Chime using HTML5 Web Audio API.
 * Produces an elegant two-tone maritime bell sound (520Hz & 660Hz) with smooth decay.
 * Zero external audio dependencies, instant playback, mobile & desktop compatible.
 */

class MaritimeAudioService {
    private audioCtx: AudioContext | null = null;
    private soundEnabled: boolean = true;

    private getContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    /**
     * Play synthetic maritime chime (e.g. for new ship request or status update)
     */
    public playChime(type: 'success' | 'alert' | 'info' = 'info'): void {
        if (!this.soundEnabled) return;
        try {
            const ctx = this.getContext();
            if (!ctx) return;

            const now = ctx.currentTime;

            // Tone 1: Fundamental frequency
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';

            // Tone 2: Harmonious chime overtone
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';

            let f1 = 523.25; // C5
            let f2 = 659.25; // E5
            let f3 = 783.99; // G5

            if (type === 'success') {
                f1 = 587.33; // D5
                f2 = 739.99; // F#5
                f3 = 880.00; // A5
            } else if (type === 'alert') {
                f1 = 698.46; // F5
                f2 = 554.37; // C#5
                f3 = 830.61; // G#5
            }

            // Envelope 1
            osc1.frequency.setValueAtTime(f1, now);
            osc1.frequency.exponentialRampToValueAtTime(f2, now + 0.12);
            gain1.gain.setValueAtTime(0.25, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.7);

            // Envelope 2
            const osc3 = ctx.createOscillator();
            const gain3 = ctx.createGain();
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(f3, now + 0.08);
            gain3.gain.setValueAtTime(0.001, now);
            gain3.gain.setValueAtTime(0.2, now + 0.08);
            gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

            osc3.connect(gain3);
            gain3.connect(ctx.destination);
            osc3.start(now + 0.08);
            osc3.stop(now + 0.9);
        } catch {
            // Audio context might be restricted before user gesture
        }
    }

    public toggleSound(): boolean {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }

    public isEnabled(): boolean {
        return this.soundEnabled;
    }
}

export const maritimeAudio = new MaritimeAudioService();

export const playSjaChime = (type: 'success' | 'alert' | 'info' | 'chime' = 'info'): void => {
    maritimeAudio.playChime(type === 'chime' ? 'info' : type);
};

if (typeof window !== 'undefined') {
    (window as any).playSjaChime = playSjaChime;
}

export default maritimeAudio;

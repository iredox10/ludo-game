/**
 * Sound engine for Ludo using Web Audio API
 * All sounds are synthesized — no external files needed
 */

let audioCtx = null;
let masterGain = null;
let isMuted = false;
let volume = 0.5;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(audioCtx.destination);
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function getMasterGain() {
    getAudioContext();
    return masterGain;
}

// === Public API ===

export function setMuted(muted) {
    isMuted = muted;
    if (masterGain) {
        masterGain.gain.value = muted ? 0 : volume;
    }
}

export function toggleMute() {
    setMuted(!isMuted);
    return isMuted;
}

export function isSoundMuted() {
    return isMuted;
}

export function setVolume(vol) {
    volume = Math.max(0, Math.min(1, vol));
    if (masterGain && !isMuted) {
        masterGain.gain.value = volume;
    }
}

// === Sound Effects ===

/**
 * Dice rolling — rapid clicks simulating dice shaking
 */
export function playDiceRoll() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 8; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = 200 + Math.random() * 400;

        gain.gain.setValueAtTime(0.08, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.05);

        osc.connect(gain);
        gain.connect(getMasterGain());

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.06);
    }
}

/**
 * Dice landed — satisfying thud
 */
export function playDiceLand(value) {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.start(now);
    osc.stop(now + 0.25);

    // Click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'triangle';
    click.frequency.value = 800 + value * 100;
    clickGain.gain.setValueAtTime(0.15, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    click.connect(clickGain);
    clickGain.connect(getMasterGain());
    click.start(now);
    click.stop(now + 0.1);
}

/**
 * Token move — soft pop/click
 */
export function playTokenMove() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.start(now);
    osc.stop(now + 0.12);
}

/**
 * Token leaves base — whoosh sound
 */
export function playTokenOut() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Rising sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.start(now);
    osc.stop(now + 0.3);

    // Noise whoosh
    const bufferSize = ctx.sampleRate * 0.2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(noiseGain);
    noiseGain.connect(getMasterGain());
    noise.start(now);
    noise.stop(now + 0.25);
}

/**
 * Capture — dramatic hit with descending tone
 */
export function playCapture() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Impact
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(getMasterGain());
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Crack
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.value = 200;
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc2.connect(gain2);
    gain2.connect(getMasterGain());
    osc2.start(now);
    osc2.stop(now + 0.1);

    // Low boom
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(100, now + 0.05);
    osc3.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    gain3.gain.setValueAtTime(0.25, now + 0.05);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc3.connect(gain3);
    gain3.connect(getMasterGain());
    osc3.start(now + 0.05);
    osc3.stop(now + 0.4);
}

/**
 * Token reaches home — celebratory chime
 */
export function playTokenHome() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(getMasterGain());
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.35);
    });
}

/**
 * Win — triumphant fanfare
 */
export function playWin() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Fanfare notes: C E G C E G C (ascending)
    const notes = [262, 330, 392, 523, 659, 784, 1047];
    const durations = [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.4];

    let time = now;
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i < 4 ? 'triangle' : 'sine';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.18, time);
        gain.gain.setValueAtTime(0.18, time + durations[i] * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);

        osc.connect(gain);
        gain.connect(getMasterGain());
        osc.start(time);
        osc.stop(time + durations[i] + 0.05);

        time += durations[i];
    });

    // Final chord
    const chordNotes = [523, 659, 784];
    chordNotes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
        osc.connect(gain);
        gain.connect(getMasterGain());
        osc.start(time);
        osc.stop(time + 0.85);
    });
}

/**
 * No moves — sad descending tone
 */
export function playNoMoves() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.start(now);
    osc.stop(now + 0.4);
}

/**
 * Turn change — subtle notification blip
 */
export function playTurnChange() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.start(now);
    osc.stop(now + 0.1);
}

/**
 * Button click — UI feedback
 */
export function playClick() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.start(now);
    osc.stop(now + 0.05);
}

/**
 * Rolled a six — exciting ascending tone
 */
export function playSix() {
    if (isMuted) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [440, 554, 659]; // A4, C#5, E5 (A major chord arpeggio)
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(getMasterGain());
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
    });
}

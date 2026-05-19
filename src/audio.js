export class AudioController {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicGain = null;
    this.ambienceGain = null;
    this.noiseSource = null;
    this.started = false;
    this.nextMusicAt = 0;
    this.musicNotes = [110, 146.83, 164.81, 196, 174.61];
  }

  start() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.context.createGain();
      this.master.gain.value = 0.28;
      this.master.connect(this.context.destination);

      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.master);

      this.ambienceGain = this.context.createGain();
      this.ambienceGain.gain.value = 0.1;
      this.ambienceGain.connect(this.master);

      this.createAmbience();
    }

    this.context.resume();
    this.started = true;
    this.nextMusicAt = Math.max(this.context.currentTime + 0.1, this.nextMusicAt);
  }

  createAmbience() {
    const bufferSize = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }

    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const lowpass = this.context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 480;

    const highpass = this.context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 80;

    noise.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(this.ambienceGain);
    noise.start();
    this.noiseSource = noise;
  }

  update() {
    if (!this.started || !this.context) return;

    while (this.nextMusicAt < this.context.currentTime + 1.2) {
      const note = this.musicNotes[Math.floor(Math.random() * this.musicNotes.length)];
      this.playPad(note, this.nextMusicAt, 1.8);
      this.playPad(note * 1.5, this.nextMusicAt + 0.25, 1.2, 0.05);
      this.nextMusicAt += 1.4;
    }
  }

  playPad(frequency, start, duration, volume = 0.08) {
    const osc = this.context.createOscillator();
    const osc2 = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = frequency;
    osc2.type = "sine";
    osc2.frequency.value = frequency * 0.5;
    filter.type = "lowpass";
    filter.frequency.value = 760;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.35);
    gain.gain.linearRampToValueAtTime(0, start + duration);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(start);
    osc2.start(start);
    osc.stop(start + duration + 0.1);
    osc2.stop(start + duration + 0.1);
  }

  playHit() {
    this.playTransient({
      type: "square",
      frequency: 210,
      endFrequency: 120,
      volume: 0.13,
      duration: 0.09,
    });
  }

  playSwing() {
    this.playTransient({
      type: "triangle",
      frequency: 320,
      endFrequency: 220,
      volume: 0.06,
      duration: 0.07,
    });
  }

  playLoot() {
    this.playTransient({
      type: "triangle",
      frequency: 740,
      endFrequency: 980,
      volume: 0.11,
      duration: 0.18,
    });
  }

  playPlayerHurt() {
    this.playTransient({
      type: "sawtooth",
      frequency: 180,
      endFrequency: 110,
      volume: 0.12,
      duration: 0.16,
    });
  }

  playTransient({ type, frequency, endFrequency, volume, duration }) {
    if (!this.context || !this.started) return;

    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration);
  }
}

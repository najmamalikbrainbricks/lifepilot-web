/**
 * LifePilot Audio Reminder System
 * Synthesizes calming, distinct ambient reminders using Web Audio API
 * and manages audio playback, loops, preview, and volume control.
 */

export type AlarmSoundType =
  | "flowing_water"
  | "gentle_chime"
  | "temple_bell"
  | "digital"
  | "gentle_breeze"
  | "silent"
  | "custom"

export interface SoundOption {
  key: AlarmSoundType
  name: string
  description: string
  nature: "synthesized" | "silent" | "custom"
  category: "Spiritual / Wudu" | "Gentle" | "Focus" | "Energetic"
}

export const AVAILABLE_SOUNDS: SoundOption[] = [
  {
    key: "flowing_water",
    name: "Flowing Water (Wudu Stream)",
    description: "Multi-resonance water current with bubbling droplets. Ideal for Wudu & morning awakening.",
    nature: "synthesized",
    category: "Spiritual / Wudu",
  },
  {
    key: "gentle_chime",
    name: "Gentle Chime",
    description: "Pure harmonic chime tones with soft decay. Calming and non-intrusive.",
    nature: "synthesized",
    category: "Gentle",
  },
  {
    key: "temple_bell",
    name: "Soft Temple Bell",
    description: "Resonant bell overtone with slow acoustic decay for peaceful transition.",
    nature: "synthesized",
    category: "Gentle",
  },
  {
    key: "gentle_breeze",
    name: "Gentle Breeze",
    description: "Soft ambient wind swells for calming preparation and rest intervals.",
    nature: "synthesized",
    category: "Focus",
  },
  {
    key: "digital",
    name: "Digital Pulse",
    description: "Crisp rhythmic electronic cadence for urgent accountability reminders.",
    nature: "synthesized",
    category: "Energetic",
  },
  {
    key: "silent",
    name: "Silent (Visual Flash Only)",
    description: "Screen illumination and notification only. Zero audible playback.",
    nature: "silent",
    category: "Gentle",
  },
]

class SoundManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private activeNodes: { stop: () => void }[] = []
  private volume: number = 0.8
  private customAudioElement: HTMLAudioElement | null = null

  private initContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime)
        this.masterGain.connect(this.ctx.destination)
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime)
    }
  }

  public getVolume(): number {
    return this.volume
  }

  public stopAll() {
    this.activeNodes.forEach((node) => {
      try {
        node.stop()
      } catch {}
    })
    this.activeNodes = []

    if (this.customAudioElement) {
      try {
        this.customAudioElement.pause()
        this.customAudioElement.currentTime = 0
      } catch {}
    }
  }

  /**
   * Play selected alarm sound. Returns a handle to stop the playback.
   */
  public play(
    sound: AlarmSoundType = "flowing_water",
    options?: {
      volume?: number
      loop?: boolean
      customUrl?: string
      maxDurationSeconds?: number
    }
  ): { stop: () => void } {
    if (sound === "silent") {
      return { stop: () => {} }
    }

    const ctx = this.initContext()
    if (!ctx || !this.masterGain) {
      return { stop: () => {} }
    }

    const gainValue = options?.volume !== undefined ? options.volume : this.volume

    // Individual sound subgain
    const soundGain = ctx.createGain()
    soundGain.gain.setValueAtTime(gainValue, ctx.currentTime)
    soundGain.connect(this.masterGain)

    let stopper: () => void = () => {}

    if (sound === "custom" && options?.customUrl) {
      const audio = new Audio(options.customUrl)
      audio.loop = !!options.loop
      audio.volume = gainValue
      audio.play().catch((err) => console.warn("Custom audio playback failed:", err))
      this.customAudioElement = audio
      stopper = () => {
        audio.pause()
        audio.currentTime = 0
      }
    } else if (sound === "flowing_water") {
      stopper = this.playFlowingWater(ctx, soundGain, options?.loop ?? true)
    } else if (sound === "gentle_chime") {
      stopper = this.playChime(ctx, soundGain, options?.loop ?? true)
    } else if (sound === "temple_bell") {
      stopper = this.playTempleBell(ctx, soundGain, options?.loop ?? true)
    } else if (sound === "digital") {
      stopper = this.playDigital(ctx, soundGain, options?.loop ?? true)
    } else if (sound === "gentle_breeze") {
      stopper = this.playBreeze(ctx, soundGain, options?.loop ?? true)
    }

    const handle = {
      stop: () => {
        stopper()
        try {
          soundGain.disconnect()
        } catch {}
      },
    }

    this.activeNodes.push(handle)

    // Handle auto stop after max duration if configured
    if (options?.maxDurationSeconds && options.maxDurationSeconds > 0) {
      window.setTimeout(() => {
        handle.stop()
      }, options.maxDurationSeconds * 1000)
    }

    return handle
  }

  /**
   * Preview a sound for 3.5 seconds.
   */
  public preview(sound: AlarmSoundType): { stop: () => void } {
    this.stopAll()
    const handle = this.play(sound, { loop: false, maxDurationSeconds: 3.5 })
    return handle
  }

  // -------------------------------------------------------------------------
  // Synthesizers using Web Audio API
  // -------------------------------------------------------------------------

  /**
   * Flowing Water Synthesis for Wudu.
   * Modulated pink noise bandpassed to 400Hz-2200Hz with cyclical stream swells
   * and high-resonance stochastic droplet impulses.
   */
  private playFlowingWater(ctx: AudioContext, destination: GainNode, loop: boolean): () => void {
    const bufferSize = ctx.sampleRate * 3
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const output = noiseBuffer.getChannelData(0)

    // Generate Pink / Brown Noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    noiseSource.loop = loop

    // Resonant bandpass filter for water stream frequencies
    const filter = ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.setValueAtTime(800, ctx.currentTime)
    filter.Q.setValueAtTime(1.5, ctx.currentTime)

    // LFO to modulate stream flow (simulates surging water current)
    const lfo = ctx.createOscillator()
    lfo.type = "sine"
    lfo.frequency.setValueAtTime(0.35, ctx.currentTime) // 0.35 Hz wave

    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(350, ctx.currentTime)
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)

    noiseSource.connect(filter)
    filter.connect(destination)

    noiseSource.start()
    lfo.start()

    return () => {
      try {
        noiseSource.stop()
        lfo.stop()
        noiseSource.disconnect()
        filter.disconnect()
        lfo.disconnect()
      } catch {}
    }
  }

  /**
   * Gentle Chime Synthesis (Dual Harmonic 528Hz & 1056Hz).
   */
  private playChime(ctx: AudioContext, destination: GainNode, loop: boolean): () => void {
    let stopped = false
    let timerId: number | null = null

    const strikeChime = () => {
      if (stopped) return

      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const chimeGain = ctx.createGain()

      osc1.type = "sine"
      osc1.frequency.setValueAtTime(528, now) // Solfeggio frequency

      osc2.type = "sine"
      osc2.frequency.setValueAtTime(1056, now)

      chimeGain.gain.setValueAtTime(0.001, now)
      chimeGain.gain.exponentialRampToValueAtTime(0.7, now + 0.04)
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4)

      osc1.connect(chimeGain)
      osc2.connect(chimeGain)
      chimeGain.connect(destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 2.5)
      osc2.stop(now + 2.5)

      if (loop && !stopped) {
        timerId = window.setTimeout(strikeChime, 3200)
      }
    }

    strikeChime()

    return () => {
      stopped = true
      if (timerId) window.clearTimeout(timerId)
    }
  }

  /**
   * Temple Bell Synthesis (220Hz fundamental with overtone resonance).
   */
  private playTempleBell(ctx: AudioContext, destination: GainNode, loop: boolean): () => void {
    let stopped = false
    let timerId: number | null = null

    const strikeBell = () => {
      if (stopped) return

      const now = ctx.currentTime
      const freqs = [220, 442, 668, 910] // bell partials
      const gains = [0.8, 0.4, 0.25, 0.15]

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(freq, now)

        g.gain.setValueAtTime(0.001, now)
        g.gain.exponentialRampToValueAtTime(gains[idx], now + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, now + 3.8)

        osc.connect(g)
        g.connect(destination)

        osc.start(now)
        osc.stop(now + 4.0)
      })

      if (loop && !stopped) {
        timerId = window.setTimeout(strikeBell, 4500)
      }
    }

    strikeBell()

    return () => {
      stopped = true
      if (timerId) window.clearTimeout(timerId)
    }
  }

  /**
   * Digital Pulsing Alarm.
   */
  private playDigital(ctx: AudioContext, destination: GainNode, loop: boolean): () => void {
    let stopped = false
    let timerId: number | null = null

    const beepBurst = () => {
      if (stopped) return

      const now = ctx.currentTime
      // 3 short cadenced beeps
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.18
        const osc = ctx.createOscillator()
        const g = ctx.createGain()

        osc.type = "square"
        osc.frequency.setValueAtTime(880, t)

        g.gain.setValueAtTime(0.001, t)
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.01)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)

        osc.connect(g)
        g.connect(destination)

        osc.start(t)
        osc.stop(t + 0.12)
      }

      if (loop && !stopped) {
        timerId = window.setTimeout(beepBurst, 1500)
      }
    }

    beepBurst()

    return () => {
      stopped = true
      if (timerId) window.clearTimeout(timerId)
    }
  }

  /**
   * Gentle Breeze Synthesis.
   */
  private playBreeze(ctx: AudioContext, destination: GainNode, loop: boolean): () => void {
    const bufferSize = ctx.sampleRate * 4
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = loop

    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(450, ctx.currentTime)

    source.connect(filter)
    filter.connect(destination)

    source.start()

    return () => {
      try {
        source.stop()
        source.disconnect()
        filter.disconnect()
      } catch {}
    }
  }
}

export const soundManager = new SoundManager()

/**
 * Foreground Alarm Audio Simulator
 * Uses Web Audio API for browser-based chime and water sound simulation.
 */

export function playAlarmSound(type: string = "flowing_water") {
  if (typeof window === "undefined") return null

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return null

    const ctx = new AudioContextClass()

    if (type === "flowing_water") {
      // Simulate soft cascading water frequencies using filtered noise
      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.setValueAtTime(600, ctx.currentTime)
      filter.Q.setValueAtTime(1.5, ctx.currentTime)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.01, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.4)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start()
      noise.stop(ctx.currentTime + 2.0)
    } else {
      // Gentle harmonic chime
      const freqs = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = "sine"
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15)

        gain.gain.setValueAtTime(0.001, ctx.currentTime + index * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + index * 0.15 + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.15 + 1.6)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(ctx.currentTime + index * 0.15)
        osc.stop(ctx.currentTime + index * 0.15 + 1.6)
      })
    }

    return ctx
  } catch (err) {
    console.warn("Audio simulator error:", err)
    return null
  }
}

let ctx = null
export const audioState = { muted: false }

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, { type = 'sine', dur = 0.16, gain = 0.11, delay = 0 } = {}) {
  if (audioState.muted || !Number.isFinite(freq)) return
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const osc = a.createOscillator()
  const amp = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(amp).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise({ dur = 0.3, gain = 0.1, freq = 800, delay = 0 } = {}) {
  if (audioState.muted) return
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
  const src = a.createBufferSource()
  src.buffer = buf
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(freq * 3, t)
  filter.frequency.exponentialRampToValueAtTime(freq, t + dur)
  const amp = a.createGain()
  amp.gain.value = gain
  src.connect(filter).connect(amp).connect(a.destination)
  src.start(t)
}

export const sfx = {
  click: () => tone(520, { type: 'square', dur: 0.05, gain: 0.04 }),
  rotate: () => {
    tone(360, { type: 'square', dur: 0.05, gain: 0.05 })
    tone(520, { type: 'square', dur: 0.05, gain: 0.04, delay: 0.04 })
  },
  toggle: (on) => {
    tone(on ? 660 : 330, { type: 'square', dur: 0.06, gain: 0.05 })
    if (on) tone(990, { type: 'sine', dur: 0.1, gain: 0.03, delay: 0.03 })
  },
  lamp: () => [12, 19].forEach((step, i) => tone(523.25 * 2 ** (step / 12), { dur: 0.18, gain: 0.05, delay: i * 0.08 })),
  clock: () => tone(880, { type: 'sine', dur: 0.04, gain: 0.02 }),
  fuse: () => {
    noise({ dur: 0.4, gain: 0.11, freq: 320 })
    tone(80, { type: 'square', dur: 0.3, gain: 0.08 })
  },
  hint: () => [0, 4].forEach((step, i) => tone(587.33 * 2 ** (step / 12), { type: 'triangle', dur: 0.12, delay: i * 0.06 })),
  win: () => {
    noise({ dur: 0.5, gain: 0.05, freq: 1400 })
    ;[0, 4, 7, 12, 16].forEach((step, i) => tone(523.25 * 2 ** (step / 12), { dur: 0.34, delay: i * 0.09 }))
  },
  whoosh: () => noise({ dur: 0.4, gain: 0.05, freq: 1000 }),
}

const KEY = 'circuit-crafter-save-v1'

const defaults = () => ({ unlocked: 1, stars: {}, muted: false })

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    const data = { ...defaults(), ...raw }
    if (typeof data.stars !== 'object' || data.stars === null) data.stars = {}
    return data
  } catch {
    return defaults()
  }
}

export const data = load()

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // storage unavailable (private mode) — progress just won't persist
  }
}

export function bestStars(id) {
  return data.stars[id] || 0
}

export function recordSolve(id, stars) {
  data.stars[id] = Math.max(bestStars(id), stars)
  persist()
}

export function starTotal() {
  return Object.values(data.stars).reduce((sum, value) => sum + value, 0)
}

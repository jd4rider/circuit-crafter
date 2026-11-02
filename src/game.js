// Circuit engine. A grid of components; power spreads from batteries (and
// pulsing timers) through anything that conducts, respecting switch states and
// gate rules. Lamps must end up lit, beacons must blink, fuses must stay dark.

export const BITS = { N: 1, E: 2, S: 4, W: 8 }
export const DIRS = ['N', 'E', 'S', 'W']

const DELTA = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] }

const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' }
const FULL = 15

export const WIRE_MASKS = {
  '-': BITS.E | BITS.W,
  '|': BITS.N | BITS.S,
  1: BITS.N | BITS.E,
  2: BITS.E | BITS.S,
  3: BITS.S | BITS.W,
  4: BITS.W | BITS.N,
  '+': FULL,
}

export function rotateMask(mask, steps = 1) {
  let out = mask
  for (let i = 0; i < ((steps % 4) + 4) % 4; i += 1) {
    let next = 0
    if (out & BITS.N) next |= BITS.E
    if (out & BITS.E) next |= BITS.S
    if (out & BITS.S) next |= BITS.W
    if (out & BITS.W) next |= BITS.N
    out = next
  }
  return out
}

export const maskTaps = (from, to) => {
  for (let steps = 0; steps < 4; steps += 1) {
    if (rotateMask(from, steps) === to) return steps
  }
  return 0
}

const SWITCHES = {
  w: { mask: BITS.E | BITS.W, on: true },
  W: { mask: BITS.E | BITS.W, on: false },
  v: { mask: BITS.N | BITS.S, on: true },
  V: { mask: BITS.N | BITS.S, on: false },
}

const key = (r, c) => `${r}:${c}`

export function parseLevel(level) {
  const rows = level.art.length
  const cols = level.art[0].length
  const tiles = []

  for (let r = 0; r < rows; r += 1) {
    const line = level.art[r]
    if (line.length !== cols) throw new Error(`level ${level.id} row ${r} is the wrong width`)
    const row = []
    for (let c = 0; c < cols; c += 1) {
      const ch = line[c]
      const base = { r, c, ch, mask: 0 }

      if (ch === '.') row.push({ ...base, kind: 'empty' })
      else if (ch === '#') row.push({ ...base, kind: 'wall' })
      else if (ch === 'b') row.push({ ...base, kind: 'battery', mask: FULL })
      else if (ch === 't') row.push({ ...base, kind: 'timer', mask: FULL })
      else if (ch === 'a') row.push({ ...base, kind: 'and', mask: FULL })
      else if (ch === 'o') row.push({ ...base, kind: 'or', mask: FULL })
      else if (ch === 'g') row.push({ ...base, kind: 'sensor', mask: FULL })
      else if (ch === 'L') row.push({ ...base, kind: 'lamp', mask: FULL })
      else if (ch === 'l') row.push({ ...base, kind: 'beacon', mask: FULL })
      else if (ch === 'f') row.push({ ...base, kind: 'fuse', mask: FULL })
      else if (SWITCHES[ch]) {
        row.push({
          ...base,
          kind: 'switch',
          mask: SWITCHES[ch].mask,
          on: SWITCHES[ch].on,
          solution: { on: SWITCHES[ch].on },
        })
      } else if (WIRE_MASKS[ch]) {
        const mask = WIRE_MASKS[ch]
        row.push({ ...base, kind: 'wire', mask, solution: { mask } })
      } else {
        throw new Error(`level ${level.id} has an unknown symbol '${ch}'`)
      }
    }
    tiles.push(row)
  }

  return { ...level, rows, cols, tiles }
}

export function tapsFor(tile) {
  if (tile.kind === 'wire') return maskTaps(tile.mask, tile.solution.mask)
  if (tile.kind === 'switch') return tile.on === tile.solution.on ? 0 : 1
  return 0
}

export function createBoard(level) {
  const board = parseLevel(level)
  // Quarter turns alternate 1/3 so two-way wire always actually changes shape.
  const turn = level.id % 2 === 0 ? 3 : 1

  for (const row of board.tiles) {
    for (const tile of row) {
      if (tile.kind === 'wire') {
        tile.mask = rotateMask(tile.solution.mask, turn)
        tile.start = { mask: tile.mask }
      } else if (tile.kind === 'switch') {
        tile.on = !tile.solution.on
        tile.start = { on: tile.on }
      }
    }
  }

  board.par = board.tiles.flat().reduce((sum, tile) => sum + tapsFor(tile), 0)
  board.lamps = board.tiles.flat().filter((tile) => tile.kind === 'lamp' || tile.kind === 'beacon')
  board.fuses = board.tiles.flat().filter((tile) => tile.kind === 'fuse')
  return board
}

export function resetBoard(board) {
  for (const tile of board.tiles.flat()) {
    if (tile.start?.mask != null) tile.mask = tile.start.mask
    if (tile.start?.on != null) tile.on = tile.start.on
    if ('moved' in tile) delete tile.moved
  }
}

export function rotateTile(board, r, c) {
  const tile = board.tiles[r]?.[c]
  if (!tile || tile.kind !== 'wire') return false
  tile.mask = rotateMask(tile.mask, 1)
  return true
}

export function toggleSwitch(board, r, c) {
  const tile = board.tiles[r]?.[c]
  if (!tile || tile.kind !== 'switch') return false
  tile.on = !tile.on
  return true
}

function neighbours(board, tile, powered) {
  let count = 0
  for (const dir of DIRS) {
    if (!(tile.mask & BITS[dir])) continue
    const [dr, dc] = DELTA[dir]
    const other = board.tiles[tile.r + dr]?.[tile.c + dc]
    if (!other) continue
    if (!(other.mask & BITS[OPPOSITE[dir]])) continue
    if (powered.has(key(other.r, other.c))) count += 1
  }
  return count
}

const SINKS = new Set(['lamp', 'beacon'])

function conducts(tile, board, powered, litCount, timerOn) {
  if (tile.kind === 'battery') return true
  if (tile.kind === 'timer') return timerOn
  if (tile.kind === 'switch') return tile.on
  if (tile.kind === 'and') return neighbours(board, tile, powered) >= 2
  if (tile.kind === 'or') return neighbours(board, tile, powered) >= 1
  if (tile.kind === 'sensor') return litCount > 0 && neighbours(board, tile, powered) >= 1
  if (SINKS.has(tile.kind)) return false
  if (tile.kind === 'wall' || tile.kind === 'empty') return false
  return true // wire, fuse
}

export function simulate(board, { timerOn = false } = {}) {
  const powered = new Set()
  const lit = new Set()

  for (const row of board.tiles) {
    for (const tile of row) {
      if (tile.kind === 'battery') powered.add(key(tile.r, tile.c))
      if (tile.kind === 'timer' && timerOn) powered.add(key(tile.r, tile.c))
    }
  }

  for (let round = 0; round < 120; round += 1) {
    let changed = false

    for (const row of board.tiles) {
      for (const tile of row) {
        const id = key(tile.r, tile.c)
        if (powered.has(id)) continue
        if (SINKS.has(tile.kind)) {
          if (!lit.has(id) && neighbours(board, tile, powered) >= 1) {
            lit.add(id)
            changed = true
          }
          continue
        }
        if (!conducts(tile, board, powered, lit.size, timerOn)) continue
        if (neighbours(board, tile, powered) >= 1) {
          powered.add(id)
          changed = true
        }
      }
    }

    if (!changed) break
  }

  const fusesPowered = board.fuses.filter((fuse) => powered.has(key(fuse.r, fuse.c))).length
  return { powered, lit, fusesPowered }
}

export function lampOn(result, lamp) {
  return result.lit.has(key(lamp.r, lamp.c))
}

export function isSolved(board, { off, on } = {}) {
  if (!board.lamps.length) return false
  const rest = off ?? simulate(board, { timerOn: false })
  const pulse = on ?? simulate(board, { timerOn: true })

  for (const lamp of board.lamps) {
    const steady = lampOn(rest, lamp)
    const blinking = lampOn(pulse, lamp)
    if (lamp.kind === 'lamp' && !(steady && blinking)) return false
    if (lamp.kind === 'beacon' && !(blinking && !steady)) return false
  }

  if (board.fuses.some((fuse) => rest.powered.has(key(fuse.r, fuse.c)))) return false
  if (board.fuses.some((fuse) => pulse.powered.has(key(fuse.r, fuse.c)))) return false
  return true
}

export function progressOf(board, result) {
  const litCount = board.lamps.filter((lamp) => lampOn(result, lamp)).length
  return { lit: litCount, total: board.lamps.length, fuses: result.fusesPowered }
}

export function starsFor({ actions = 0, hints = 0, par = 1 } = {}) {
  if (hints > 0) return 1
  if (actions <= par) return 3
  if (actions <= Math.ceil(par * 1.8)) return 2
  return 1
}

export function nextFix(board) {
  for (const tile of board.tiles.flat()) {
    if (tapsFor(tile) > 0) return tile
  }
  return null
}

export function applyHint(board, tile) {
  if (!tile) return false
  if (tile.kind === 'wire') tile.mask = tile.solution.mask
  else if (tile.kind === 'switch') tile.on = tile.solution.on
  else return false
  return true
}

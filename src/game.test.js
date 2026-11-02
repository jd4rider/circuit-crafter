import test from 'node:test'
import assert from 'node:assert/strict'
import { CHAPTERS, LEVELS } from './levels.js'
import {
  BITS,
  applyHint,
  createBoard,
  isSolved,
  lampOn,
  maskTaps,
  nextFix,
  parseLevel,
  progressOf,
  resetBoard,
  rotateMask,
  rotateTile,
  simulate,
  starsFor,
  tapsFor,
  toggleSwitch,
} from './game.js'

const boardOf = (art) => {
  const board = parseLevel({ id: 0, name: 'test', art })
  board.lamps = board.tiles.flat().filter((tile) => tile.kind === 'lamp' || tile.kind === 'beacon')
  board.fuses = board.tiles.flat().filter((tile) => tile.kind === 'fuse')
  return board
}

test('the campaign is complete and its ids are unique', () => {
  assert.equal(LEVELS.length, 24)
  assert.equal(new Set(LEVELS.map((level) => level.id)).size, 24)
  assert.equal(new Set(LEVELS.map((level) => level.name)).size, 24)
  for (const chapter of CHAPTERS) {
    assert.equal(LEVELS.filter((level) => level.chapter === chapter.id).length, 6, chapter.id)
  }
  let last = 0
  for (const level of LEVELS) {
    assert.ok(level.art[0].length >= 7, `level ${level.id} board too small`)
    assert.ok(level.id > last, 'levels must be ordered')
    last = level.id
  }
})

test('every level art is a genuine solution', () => {
  for (const level of LEVELS) {
    const board = parseLevel(level)
    board.lamps = board.tiles.flat().filter((tile) => tile.kind === 'lamp' || tile.kind === 'beacon')
    board.fuses = board.tiles.flat().filter((tile) => tile.kind === 'fuse')
    assert.ok(board.lamps.length > 0, `level ${level.id} has no lamp`)
    assert.ok(isSolved(board), `level ${level.id} art does not solve`)
  }
})

test('every scramble starts unsolved and par taps solve it', () => {
  for (const level of LEVELS) {
    const board = createBoard(level)
    assert.ok(board.par > 0, `level ${level.id} has no taps to make`)
    assert.equal(isSolved(board), false, `level ${level.id} starts solved`)

    let taps = 0
    for (const tile of board.tiles.flat()) {
      if (tile.kind === 'wire') {
        let guard = 0
        while (tile.mask !== tile.solution.mask && guard++ < 5) {
          rotateTile(board, tile.r, tile.c)
          taps += 1
        }
      } else if (tile.kind === 'switch') {
        if (tile.on !== tile.solution.on) {
          toggleSwitch(board, tile.r, tile.c)
          taps += 1
        }
      }
      assert.ok(taps < 200, 'tap guard')
    }
    assert.equal(taps, board.par, `level ${level.id} par mismatch`)
    assert.ok(isSolved(board), `level ${level.id} unsolvable by its own settings`)
    assert.equal(progressOf(board, simulate(board)).fuses, 0, `level ${level.id} blows a fuse`)
  }
})

test('wire rotation math cycles the right way', () => {
  assert.equal(rotateMask(BITS.N, 1), BITS.E)
  assert.equal(rotateMask(BITS.N, 4), BITS.N)
  assert.equal(rotateMask(BITS.E | BITS.W, 1), BITS.N | BITS.S)
  assert.equal(rotateMask(BITS.E | BITS.W, 2), BITS.E | BITS.W)
  assert.equal(maskTaps(BITS.E | BITS.W, BITS.N | BITS.S), 1)
  assert.equal(maskTaps(BITS.N, BITS.N), 0)
  assert.equal(maskTaps(BITS.N, BITS.W), 3)
})

test('a switch in the off position breaks the circuit', () => {
  const on = boardOf(['.bw-L..'])
  assert.ok(isSolved(on))

  const off = boardOf(['.bW-L..'])
  const result = simulate(off)
  assert.equal(lampOn(result, off.lamps[0]), false)
  assert.equal(isSolved(off), false)
})

test('lamps are endpoints and do not pass power along', () => {
  const board = boardOf(['.b-L-L.'])
  const result = simulate(board)
  assert.equal(lampOn(result, board.lamps[0]), true, 'first lamp is lit')
  assert.equal(lampOn(result, board.lamps[1]), false, 'second lamp is cut off by the first')
  assert.equal(isSolved(board), false)
})

test('AND needs two powered inputs, OR needs one', () => {
  const andOne = boardOf(['.b-a-L.'])
  assert.equal(isSolved(andOne), false, 'AND with one input stays dark')

  const andTwo = boardOf(['.b-a-L.', '...|...', '...b...'])
  assert.ok(isSolved(andTwo), 'AND opens with a second source')

  const orOne = boardOf(['.b-o-L.'])
  assert.ok(isSolved(orOne), 'OR opens with a single input')
})

test('timers blink beacons and cannot drive a steady lamp', () => {
  const beacon = boardOf(['.t-l...'])
  assert.equal(isSolved(beacon), true)
  const rest = simulate(beacon, { timerOn: false })
  const pulse = simulate(beacon, { timerOn: true })
  assert.equal(lampOn(rest, beacon.lamps[0]), false, 'beacon is dark between pulses')
  assert.equal(lampOn(pulse, beacon.lamps[0]), true, 'beacon flashes on the pulse')

  const steadyOnTimer = boardOf(['.t-L...'])
  assert.equal(isSolved(steadyOnTimer), false, 'a steady lamp may not be clocked')

  const steadyOnBattery = boardOf(['.b-L...'])
  assert.equal(isSolved(steadyOnBattery), true)
})

test('a beacon wired straight to a battery does not blink', () => {
  const board = boardOf(['.b-l...'])
  assert.equal(isSolved(board), false, 'lit in both phases, so not blinking')
})

test('a fuse must stay dark', () => {
  const safe = boardOf(['.b-L..', '..f...'])
  assert.ok(isSolved(safe), 'an unpowered fuse is fine')

  const bad = boardOf(['.b-L..', '.f....'])
  assert.equal(isSolved(bad), false)
})

test('the light sensor opens only once a lamp is glowing', () => {
  const board = boardOf(['.b-L....', '........', '.g-L....', '.b......'])
  const before = simulate(board)
  assert.equal(lampOn(before, board.lamps[0]), true)
  assert.equal(lampOn(before, board.lamps[1]), true, 'the sensor sees the first lamp and closes the second circuit')
  assert.ok(isSolved(board))

  const noLight = boardOf(['.g-L....', '.b......'])
  const dark = simulate(noLight)
  assert.equal(lampOn(dark, noLight.lamps[0]), false, 'with no lamp lit the sensor stays open')
  assert.equal(isSolved(noLight), false)
})

test('reset and hints restore the intended settings', () => {
  const level = LEVELS.find((entry) => entry.id === 7)
  const board = createBoard(level)
  const start = board.tiles.flat().map((tile) => `${tile.mask}:${tile.on}`)

  const fix = nextFix(board)
  assert.ok(fix)
  assert.ok(applyHint(board, fix))
  assert.equal(tapsFor(fix), 0)

  resetBoard(board)
  assert.deepEqual(
    board.tiles.flat().map((tile) => `${tile.mask}:${tile.on}`),
    start,
  )
  assert.equal(isSolved(board), false)
})

test('stars reward fewer actions', () => {
  assert.equal(starsFor({ actions: 4, par: 4 }), 3)
  assert.equal(starsFor({ actions: 6, par: 4 }), 2)
  assert.equal(starsFor({ actions: 20, par: 4 }), 1)
  assert.equal(starsFor({ actions: 4, par: 4, hints: 1 }), 1)
})

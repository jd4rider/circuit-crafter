import Phaser from 'phaser'
import { openTipJar } from './support.js'
import { W, H, background, button, text, fade } from './common.js'
import { confetti, flashAt, popText, ring, sparkle } from './fx.js'
import { audioState, sfx } from '../sound.js'
import { data, persist, recordSolve } from './save.js'
import {
  BITS,
  applyHint,
  createBoard,
  isSolved,
  lampOn,
  nextFix,
  progressOf,
  resetBoard,
  rotateTile,
  simulate,
  starsFor,
  toggleSwitch,
} from '../game.js'
import { CHAPTERS, CHAPTER_OF, LEVELS } from '../levels.js'

const BOARD_TOP = 148
const BOARD_SPACE = 548
const PAD = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }

const TRACE = 0x0f5c66
const LIVE = 0x22d3ee

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game')
  }

  init(payload = {}) {
    this.level = LEVELS.find((entry) => entry.id === payload.level) ?? LEVELS[0]
    this.board = createBoard(this.level)
    this.chapter = CHAPTER_OF(this.level.chapter)
    this.timerOn = false
    this.actions = 0
    this.hintsUsed = 0
    this.over = false
    this.sim = simulate(this.board, { timerOn: false })
    this.warnedFuse = false
  }

  create() {
    background(this, this.chapter.bg, this.chapter.accent)
    this.cameras.main.fadeIn(220, 3, 8, 13)

    this.add.rectangle(W / 2, 62, W, 124, 0x04121b, 0.94).setDepth(30)
    this.add.rectangle(W / 2, 124, W, 2, this.chapter.accent, 0.7).setDepth(31)

    text(this, 20, 14, this.level.name, 25, '#e2f7ff', { fontStyle: 'bold' }).setDepth(32)
    text(this, 20, 48, `${this.chapter.name} · board ${LEVELS.indexOf(this.level) + 1}`, 13, '#7dd3fc').setDepth(32)
    this.actionsText = text(this, 20, 76, '', 14, '#93c5fd').setDepth(32)
    this.lampText = text(this, W - 20, 76, '', 14, '#fde68a').setOrigin(1, 0).setDepth(32)
    this.fuseText = text(this, W - 20, 48, '', 14, '#fca5a5').setOrigin(1, 0).setDepth(32).setAlpha(0)

    button(this, W - 58, 20, 'Bench', () => this.leave(), { w: 92, h: 32, size: 13, color: 0x11374a }).setDepth(32)

    this.layout()
    this.views = []
    this.buildFooter()
    this.input.on('pointerup', (pointer) => {
      const cell = this.cellAt(pointer)
      if (cell) this.tapCell(cell.r, cell.c)
    })
    this.input.keyboard?.on('keydown-R', () => this.resetBoard())

    this.timer = this.time.addEvent({
      delay: 1350,
      loop: true,
      callback: () => {
        if (this.over) return
        this.timerOn = !this.timerOn
        this.refresh({ tick: true })
      },
    })

    this.refresh({ silent: true })
  }

  layout() {
    const { rows, cols } = this.board
    const cell = Math.min(Math.floor((W - 72) / cols), Math.floor(BOARD_SPACE / rows), 60)
    this.cell = cell
    this.ox = (W - cell * cols) / 2
    this.oy = BOARD_TOP + (BOARD_SPACE - cell * rows) / 2

    const board = this.add.graphics().setDepth(2)
    const m = 14
    board.fillStyle(0x071f25, 0.9)
    board.fillRoundedRect(this.ox - m, this.oy - m, cell * cols + m * 2, cell * rows + m * 2, 20)
    board.lineStyle(2, this.chapter.accent, 0.3)
    board.strokeRoundedRect(this.ox - m, this.oy - m, cell * cols + m * 2, cell * rows + m * 2, 20)

    const grid = this.add.graphics().setDepth(3)
    for (let c = 0; c <= cols; c += 1) {
      grid.lineStyle(1, 0x7dd3fc, 0.05)
      grid.lineBetween(this.ox + c * cell, this.oy, this.ox + c * cell, this.oy + rows * cell)
    }
    for (let r = 0; r <= rows; r += 1) {
      grid.lineStyle(1, 0x7dd3fc, 0.05)
      grid.lineBetween(this.ox, this.oy + r * cell, this.ox + cols * cell, this.oy + r * cell)
    }
  }

  buildFooter() {
    const y = 786
    button(this, 78, y, '💡 Hint', () => this.useHint(), { w: 118, h: 44, size: 15, color: 0xb45309 }).setDepth(31)
    button(this, 210, y, '↺ Reset', () => this.resetBoard(), { w: 118, h: 44, size: 15, color: 0x0369a1 }).setDepth(31)
    this.soundButton = button(this, 342, y, audioState.muted ? 'Sound off' : 'Sound on', () => this.toggleSound(), {
      w: 118,
      h: 44,
      size: 15,
      color: 0x11374a,
    }).setDepth(31)
    button(this, 484, y, 'All boards', () => this.leave(), { w: 132, h: 44, size: 15, color: 0x11374a }).setDepth(31)
  }

  centre(r, c) {
    return {
      x: this.ox + c * this.cell + this.cell / 2,
      y: this.oy + r * this.cell + this.cell / 2,
    }
  }

  cellAt(pointer) {
    const c = Math.floor((pointer.x - this.ox) / this.cell)
    const r = Math.floor((pointer.y - this.oy) / this.cell)
    if (r < 0 || c < 0 || r >= this.board.rows || c >= this.board.cols) return null
    return { r, c }
  }

  // ---------- drawing ----------

  padLines(graphics, mask, cell, width, color, alpha = 1) {
    graphics.lineStyle(width, color, alpha)
    for (const dir of ['N', 'E', 'S', 'W']) {
      if (!(mask & BITS[dir])) continue
      const [dx, dy] = PAD[dir]
      graphics.lineBetween(0, 0, (dx * cell) / 2, (dy * cell) / 2)
    }
  }

  render() {
    for (const view of this.views) {
      view.each((child) => this.tweens.killTweensOf(child))
      view.destroy()
    }
    this.views = []
    for (let r = 0; r < this.board.rows; r += 1) {
      for (let c = 0; c < this.board.cols; c += 1) this.views.push(this.drawTile(r, c))
    }
  }

  drawTile(r, c) {
    const tile = this.board.tiles[r][c]
    const { x, y } = this.centre(r, c)
    const size = this.cell
    const box = this.add.container(x, y).setDepth(8)
    const powered = this.sim.powered.has(`${r}:${c}`)

    if (tile.kind === 'wire') {
      const g = this.add.graphics()
      this.padLines(g, tile.mask, size, Math.max(5, size * 0.16), powered ? LIVE : TRACE, powered ? 1 : 0.85)
      g.fillStyle(powered ? 0xe0fbff : TRACE, 1)
      g.fillCircle(0, 0, Math.max(3, size * 0.07))
      box.add(g)
      if (powered) {
        const glow = this.add.image(0, 0, 'glow').setTint(LIVE).setBlendMode('ADD').setScale(size / 130).setAlpha(0.5)
        box.add(glow)
      }
    }

    if (tile.kind === 'switch') {
      const g = this.add.graphics()
      this.padLines(g, tile.mask, size, Math.max(5, size * 0.16), tile.on ? LIVE : TRACE, tile.on ? 1 : 0.8)
      g.fillStyle(0x0b1220, 1)
      g.fillCircle(0, 0, size * 0.27)
      g.lineStyle(3, tile.on ? 0x34d399 : 0x64748b, 1)
      g.strokeCircle(0, 0, size * 0.27)
      const angle = tile.on ? -0.5 : 0.6
      g.lineStyle(4, tile.on ? 0xfde68a : 0x94a3b8, 1)
      g.lineBetween(0, 0, Math.cos(angle) * size * 0.22, -Math.sin(angle) * size * 0.22)
      box.add(g)
      if (tile.on && powered) box.add(this.add.image(0, 0, 'glow').setTint(LIVE).setBlendMode('ADD').setScale(size / 150).setAlpha(0.4))
    }

    if (tile.kind === 'battery') {
      const g = this.add.graphics()
      this.padLines(g, tile.mask, size, Math.max(5, size * 0.16), powered ? LIVE : TRACE, 1)
      g.fillStyle(0xfbbf24, 1)
      g.fillRoundedRect(-size * 0.3, -size * 0.2, size * 0.6, size * 0.4, 6)
      g.fillStyle(0x24140a, 1)
      g.fillRect(-size * 0.2, -size * 0.04, size * 0.4, size * 0.08)
      g.fillRect(-size * 0.06, -size * 0.16, size * 0.12, size * 0.32)
      box.add(g)
      box.add(this.add.image(0, 0, 'glow').setTint(0xfbbf24).setBlendMode('ADD').setScale(size / 120).setAlpha(0.3))
    }

    if (tile.kind === 'and' || tile.kind === 'or') {
      const g = this.add.graphics()
      this.padLines(g, tile.mask, size, Math.max(5, size * 0.16), powered ? LIVE : TRACE, 1)
      g.fillStyle(powered ? 0x4c1d95 : 0x2a2145, 1)
      g.fillRoundedRect(-size * 0.3, -size * 0.26, size * 0.6, size * 0.52, 8)
      g.lineStyle(2, powered ? 0xc4b5fd : 0x6d5aa8, 1)
      g.strokeRoundedRect(-size * 0.3, -size * 0.26, size * 0.6, size * 0.52, 8)
      box.add(g)
      box.add(
        this.add
          .text(0, 0, tile.kind === 'and' ? '&' : '≥1', Math.round(size * 0.28), powered ? '#f5f3ff' : '#b7a6e8', {
            fontStyle: 'bold',
          })
          .setOrigin(0.5),
      )
      if (powered) box.add(this.add.image(0, 0, 'glow').setTint(0xa78bfa).setBlendMode('ADD').setScale(size / 120).setAlpha(0.35))
    }

    if (tile.kind === 'timer') {
      const on = this.timerOn
      const g = this.add.graphics()
      this.padLines(g, tile.mask, size, Math.max(5, size * 0.16), on ? LIVE : TRACE, 1)
      g.fillStyle(0x062a22, 1)
      g.fillCircle(0, 0, size * 0.27)
      g.lineStyle(3, on ? 0x34d399 : 0x2f6b5c, 1)
      g.strokeCircle(0, 0, size * 0.27)
      g.lineStyle(2, on ? 0xd1fae5 : 0x4d8b7c, 1)
      g.lineBetween(0, 0, 0, -size * 0.17)
      g.lineBetween(0, 0, size * 0.13, size * 0.05)
      box.add(g)
      if (on) box.add(this.add.image(0, 0, 'glow').setTint(0x34d399).setBlendMode('ADD').setScale(size / 130).setAlpha(0.4))
    }

    if (tile.kind === 'sensor') {
      const active = this.sim.lit.size > 0 && powered
      const g = this.add.graphics()
      this.padLines(g, tile.mask, size, Math.max(5, size * 0.16), active ? LIVE : TRACE, 1)
      g.fillStyle(active ? 0x0e4d5e : 0x0a2830, 1)
      g.fillCircle(0, 0, size * 0.26)
      g.lineStyle(3, active ? 0x7dd3fc : 0x3d6b78, 1)
      g.strokeCircle(0, 0, size * 0.26)
      g.fillStyle(active ? 0xe0f2fe : 0x53849a, 1)
      g.fillCircle(0, 0, size * 0.1)
      box.add(g)
      if (active) box.add(this.add.image(0, 0, 'glow').setTint(0x7dd3fc).setBlendMode('ADD').setScale(size / 140).setAlpha(0.35))
    }

    if (tile.kind === 'lamp' || tile.kind === 'beacon') {
      const lit = lampOn(this.sim, tile)
      const g = this.add.graphics()
      this.padLines(g, { N: 0 }, size, 0, 0x000000, 0)
      g.fillStyle(lit ? 0xfde047 : 0x1c2c33, 1)
      g.fillCircle(0, 0, size * 0.27)
      g.lineStyle(3, lit ? 0xfff7cc : 0x38525c, 1)
      g.strokeCircle(0, 0, size * 0.27)
      g.fillStyle(lit ? 0xffffff : 0x2a4149, 1)
      g.fillCircle(-size * 0.07, -size * 0.07, size * 0.07)
      box.add(g)
      if (tile.kind === 'beacon') {
        const arcs = this.add.graphics()
        arcs.lineStyle(2, lit ? 0x67e8f9 : 0x2f5561, 0.9)
        arcs.beginPath()
        arcs.arc(0, 0, size * 0.36, -0.9, 0.9)
        arcs.strokePath()
        arcs.beginPath()
        arcs.arc(0, 0, size * 0.36, Math.PI - 0.9, Math.PI + 0.9)
        arcs.strokePath()
        box.add(arcs)
      }
      if (lit) {
        box.add(this.add.image(0, 0, 'glow').setTint(0xfde047).setBlendMode('ADD').setScale(size / 110).setAlpha(0.55))
      }
    }

    if (tile.kind === 'fuse') {
      const hot = powered
      const g = this.add.graphics()
      this.padLines(g, tile.mask, size, Math.max(5, size * 0.16), hot ? 0xf87171 : TRACE, 1)
      g.fillStyle(hot ? 0x7f1d1d : 0x122c33, 1)
      g.fillRoundedRect(-size * 0.28, -size * 0.16, size * 0.56, size * 0.32, 6)
      g.lineStyle(2, hot ? 0xfca5a5 : 0x47626a, 1)
      g.strokeRoundedRect(-size * 0.28, -size * 0.16, size * 0.56, size * 0.32, 6)
      g.lineStyle(2, hot ? 0xfecaca : 0x6b8791, 1)
      g.lineBetween(-size * 0.16, 0, -size * 0.06, -size * 0.07)
      g.lineBetween(-size * 0.06, -size * 0.07, size * 0.04, size * 0.07)
      g.lineBetween(size * 0.04, size * 0.07, size * 0.14, 0)
      box.add(g)
      if (hot) box.add(this.add.image(0, 0, 'glow').setTint(0xef4444).setBlendMode('ADD').setScale(size / 110).setAlpha(0.5))
    }

    if (tile.kind === 'wall') {
      const g = this.add.graphics()
      g.fillStyle(0x0c1f26, 1).fillRoundedRect(-size * 0.38, -size * 0.38, size * 0.76, size * 0.76, 6)
      g.lineStyle(2, 0x1b3a44, 1).strokeRoundedRect(-size * 0.38, -size * 0.38, size * 0.76, size * 0.76, 6)
      box.add(g)
    }

    return box
  }

  // ---------- actions ----------

  tapCell(r, c) {
    if (this.over) return
    const tile = this.board.tiles[r]?.[c]
    if (!tile) return
    if (tile.kind === 'wire') {
      rotateTile(this.board, r, c)
      this.actions += 1
      sfx.rotate()
    } else if (tile.kind === 'switch') {
      toggleSwitch(this.board, r, c)
      this.actions += 1
      sfx.toggle(tile.on)
    } else {
      sfx.click()
      return
    }
    this.refresh({ acted: true })
  }

  refresh({ acted = false, tick = false, silent = false } = {}) {
    const before = this.sim
    this.sim = simulate(this.board, { timerOn: this.timerOn })

    const newlyLit = this.board.lamps.filter((lamp) => lampOn(this.sim, lamp) && !lampOn(before, lamp))
    this.render()
    this.refreshHud()

    if (!silent && !tick) {
      for (const lamp of newlyLit) {
        const { x, y } = this.centre(lamp.r, lamp.c)
        sparkle(this, x, y, 0xfde047, 7)
        ring(this, x, y, 0xfde047, this.cell * 0.8)
      }
      if (newlyLit.length) sfx.lamp()
    }

    const fuses = progressOf(this.board, this.sim).fuses
    if (fuses > 0 && !this.warnedFuse) {
      sfx.fuse()
      this.cameras.main.shake(140, 0.004)
      this.warnedFuse = true
      for (const fuse of this.board.fuses) {
        if (!this.sim.powered.has(`${fuse.r}:${fuse.c}`)) continue
        const { x, y } = this.centre(fuse.r, fuse.c)
        flashAt(this, x, y, this.cell, 0xef4444)
      }
    }
    if (fuses === 0) this.warnedFuse = false

    if (acted) popText(this, W / 2, 128, '+1', '#7dd3fc', 14)
    if (isSolved(this.board)) this.finish()
  }

  refreshHud() {
    const progress = progressOf(this.board, this.sim)
    this.actionsText.setText(`Actions ${this.actions} · par ${this.board.par}`)
    this.lampText.setText(`Lamps ${progress.lit}/${progress.total}`)
    if (progress.fuses) this.fuseText.setText(`⚠ fuse live ×${progress.fuses}`).setAlpha(1)
    else this.fuseText.setAlpha(0)
  }

  useHint() {
    if (this.over) return
    const tile = nextFix(this.board)
    if (!tile) return
    applyHint(this.board, tile)
    this.hintsUsed += 1
    const { x, y } = this.centre(tile.r, tile.c)
    flashAt(this, x, y, this.cell, 0xfde047)
    popText(this, x, y, 'fixed', '#fde047', 15)
    sfx.hint()
    this.refresh()
  }

  resetBoard() {
    if (this.over) return
    resetBoard(this.board)
    this.actions = 0
    this.hintsUsed = 0
    this.warnedFuse = false
    sfx.whoosh()
    this.refresh()
  }

  toggleSound() {
    audioState.muted = !audioState.muted
    data.muted = audioState.muted
    persist()
    this.soundButton.setLabel(audioState.muted ? 'Sound off' : 'Sound on')
    if (!audioState.muted) sfx.click()
  }

  leave() {
    const index = CHAPTERS.findIndex((chapter) => chapter.id === this.level.chapter)
    fade(this, 'levels', { chapter: Math.max(0, index) })
  }

  finish() {
    if (this.over) return
    this.over = true
    this.timer?.remove()
    const stars = starsFor({ actions: this.actions, hints: this.hintsUsed, par: this.board.par })
    recordSolve(this.level.id, stars)

    const index = LEVELS.indexOf(this.level) + 1
    if (index === data.unlocked && index < LEVELS.length) {
      data.unlocked = index + 1
      persist()
    }

    sfx.win()
    for (let i = 0; i < 5; i += 1) {
      this.time.delayedCall(i * 110, () =>
        confetti(this, Phaser.Math.Between(80, W - 80), Phaser.Math.Between(200, 460), this.chapter.accent, 9, 280),
      )
    }
    this.time.delayedCall(420, () => this.overlay(stars))
  }

  overlay(stars) {
    const layer = this.add.container(0, 0).setDepth(70)
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x03080d, 0.9)
    const card = this.add.rectangle(W / 2, H / 2, 400, 520, 0x08222b, 1).setStrokeStyle(2, this.chapter.accent, 0.5)
    layer.add([dim, card])
    layer.add(text(this, W / 2, H / 2 - 186, 'Circuit complete', 15, '#7dd3fc', { fontStyle: 'bold' }).setOrigin(0.5))
    layer.add(text(this, W / 2, H / 2 - 146, this.level.name, 29, '#e2f7ff', { fontStyle: 'bold' }).setOrigin(0.5))

    for (let i = 0; i < 3; i += 1) {
      const star = text(this, W / 2 + (i - 1) * 54, H / 2 - 62, '★', 42, i < stars ? '#fde047' : '#153a44', {
        fontStyle: 'bold',
      })
        .setOrigin(0.5)
        .setScale(0)
      layer.add(star)
      this.tweens.add({ targets: star, scale: i < stars ? 1 : 0.8, duration: 240, delay: 220 + i * 120, ease: 'Back.Out' })
    }

    const detail =
      this.hintsUsed > 0
        ? `${this.actions} actions · ${this.hintsUsed} hint${this.hintsUsed === 1 ? '' : 's'}`
        : `${this.actions} actions · par ${this.board.par}`
    layer.add(text(this, W / 2, H / 2 + 10, detail, 15, '#93c5fd').setOrigin(0.5))

    const next = LEVELS[LEVELS.indexOf(this.level) + 1]
    if (next) {
      button(this, W / 2, H / 2 + 82, `Next: ${next.name}`, () => this.scene.restart({ level: next.id }), {
        w: 308,
        h: 50,
        size: 17,
        color: 0x0891b2,
      }).setDepth(80)
    }
    button(this, W / 2, H / 2 + (next ? 138 : 82), 'Replay', () => this.scene.restart({ level: this.level.id }), {
      w: 308,
      h: 44,
      size: 15,
      color: 0x11374a,
    }).setDepth(80)
    button(this, W / 2, H / 2 + (next ? 186 : 130), 'All benches', () => this.leave(), {
      w: 308,
      h: 44,
      size: 15,
      color: 0x11374a,
    }).setDepth(80)
    // Quiet support link: results panel only, under the actions inside the card.
    button(this, W / 2, H / 2 + 232, '☕ Buy me a coffee', () => openTipJar(), {
      w: 308,
      h: 30,
      size: 14,
      color: 0x0b2e3a,
      textColor: '#7dd3fc',
    }).setDepth(80)
  }
}

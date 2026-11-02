import Phaser from 'phaser'
import { W, background, button, text, fade, hint } from './common.js'
import { bestStars, data } from './save.js'
import { CHAPTERS, LEVELS } from '../levels.js'

const PREVIEW = {
  b: 0xfbbf24,
  t: 0x34d399,
  L: 0xfde047,
  l: 0x67e8f9,
  f: 0xf87171,
  a: 0xa78bfa,
  o: 0xa78bfa,
  g: 0x7dd3fc,
  w: 0x22d3ee,
  W: 0x22d3ee,
  v: 0x22d3ee,
  V: 0x22d3ee,
  '-': 0x0e7490,
  '|': 0x0e7490,
  1: 0x0e7490,
  2: 0x0e7490,
  3: 0x0e7490,
  4: 0x0e7490,
  '+': 0x0e7490,
}

export default class LevelsScene extends Phaser.Scene {
  constructor() {
    super('levels')
  }

  init(payload = {}) {
    const next = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, data.unlocked - 1))]
    const fallback = CHAPTERS.findIndex((chapter) => chapter.id === next.chapter)
    this.chapterIndex = Phaser.Math.Clamp(payload.chapter ?? Math.max(0, fallback), 0, CHAPTERS.length - 1)
  }

  create() {
    const chapter = CHAPTERS[this.chapterIndex]
    background(this, chapter.bg, chapter.accent)
    this.cameras.main.fadeIn(220, 3, 8, 13)

    text(this, W / 2, 58, chapter.name, 34, '#e2f7ff', { fontStyle: 'bold' }).setOrigin(0.5)
    text(this, W / 2, 96, chapter.blurb, 15, '#93c5fd').setOrigin(0.5)
    button(this, 62, 34, '◀ Bench', () => fade(this, 'chapters'), { w: 104, h: 38, size: 14, color: 0x11374a })

    const levels = LEVELS.filter((level) => level.chapter === chapter.id)
    const cols = 2
    const cardW = 256
    const cardH = 152
    const gapX = 20
    const gapY = 18
    const left = (W - (cols * cardW + gapX)) / 2
    const top = 142

    levels.forEach((level, i) => {
      const index = LEVELS.indexOf(level) + 1
      const open = index <= data.unlocked
      const x = left + (i % cols) * (cardW + gapX) + cardW / 2
      const y = top + Math.floor(i / cols) * (cardH + gapY) + cardH / 2
      this.card(level, index, open, x, y, cardW, cardH, chapter)
    })

    const go = (delta) => this.scene.restart({ chapter: this.chapterIndex + delta })
    if (this.chapterIndex > 0) button(this, 90, 800, '◀ Prev', () => go(-1), { w: 136, h: 44, size: 15, color: 0x11374a })
    if (this.chapterIndex < CHAPTERS.length - 1) {
      button(this, W - 90, 800, 'Next ▶', () => go(1), { w: 136, h: 44, size: 15, color: 0x11374a })
    }
    const nextLevel = LEVELS[data.unlocked - 1]
    hint(this, W / 2, 800, nextLevel ? `Next board: ${nextLevel.name}` : 'Every board is wired — nicely done!', 14, '#7dd3fc')
  }

  card(level, index, open, x, y, w, h, chapter) {
    const card = this.add.container(x, y)
    const bg = this.add.graphics()
    bg.fillStyle(open ? 0x0d2634 : 0x081b24, 0.96).fillRoundedRect(-w / 2, -h / 2, w, h, 18)
    bg.lineStyle(2, open ? chapter.accent : 0x1a3a48, open ? 0.45 : 0.6).strokeRoundedRect(-w / 2, -h / 2, w, h, 18)
    card.add(bg)

    card.add(text(this, -w / 2 + 16, -h / 2 + 14, level.name, 18, open ? '#e2f7ff' : '#47687a', { fontStyle: 'bold' }))
    card.add(text(this, -w / 2 + 16, -h / 2 + 42, `Board ${index}`, 13, open ? '#7dd3fc' : '#3c5f70'))

    if (!open) {
      card.add(text(this, w / 2 - 26, -h / 2 + 26, '🔒', 20).setOrigin(0.5))
      card.add(text(this, -w / 2 + 16, h / 2 - 32, 'Solve the board before it', 12, '#3c5f70'))
      return
    }

    const stars = bestStars(level.id)
    for (let s = 0; s < 3; s += 1) {
      card.add(text(this, -w / 2 + 20 + s * 26, h / 2 - 38, '★', 23, s < stars ? '#fde047' : '#00000055'))
    }

    const preview = this.add.graphics()
    const tile = 9
    const cols = level.art[0].length
    const offX = w / 2 - (cols * tile) / 2 - 12
    const offY = -6
    level.art.forEach((line, r) => {
      ;[...line].forEach((ch, c) => {
        const color = PREVIEW[ch]
        if (!color) return
        preview.fillStyle(color, 0.65).fillRect(offX + c * tile, offY + r * tile, tile - 2, tile - 2)
      })
    })
    card.add(preview)

    card.setSize(w, h).setInteractive({ useHandCursor: true })
    card.on('pointerdown', () => {
      this.tweens.add({ targets: card, scale: 0.96, duration: 70, yoyo: true })
      fade(this, 'game', { level: level.id })
    })
    if (index === data.unlocked) {
      this.tweens.add({ targets: card, scale: 1.02, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    }
  }
}

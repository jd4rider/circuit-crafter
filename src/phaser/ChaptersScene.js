import Phaser from 'phaser'
import { W, background, button, text, fade, hint } from './common.js'
import { bestStars, starTotal } from './save.js'
import { CHAPTERS, LEVELS } from '../levels.js'

export default class ChaptersScene extends Phaser.Scene {
  constructor() {
    super('chapters')
  }

  create() {
    background(this, ['#14263a', '#070f18'])
    this.cameras.main.fadeIn(220, 3, 8, 13)

    text(this, W / 2, 66, 'Pick a workbench', 34, '#e2f7ff', { fontStyle: 'bold' }).setOrigin(0.5)
    text(this, W / 2, 106, `${starTotal()} ★ scored so far`, 15, '#7dd3fc').setOrigin(0.5)
    button(this, 62, 34, '◀ Menu', () => fade(this, 'menu'), { w: 104, h: 38, size: 14, color: 0x11374a })

    CHAPTERS.forEach((chapter, i) => {
      const levels = LEVELS.filter((level) => level.chapter === chapter.id)
      const done = levels.filter((level) => bestStars(level.id) > 0).length
      const stars = levels.reduce((sum, level) => sum + bestStars(level.id), 0)
      const y = 186 + i * 134
      const card = this.add.container(W / 2, y)

      const bg = this.add.graphics()
      bg.fillStyle(0x0d2634, 0.96).fillRoundedRect(-256, -52, 512, 108, 18)
      bg.lineStyle(2, chapter.accent, 0.45).strokeRoundedRect(-256, -52, 512, 108, 18)
      bg.fillStyle(chapter.accent, 0.18).fillRoundedRect(-256, -52, 6, 108, 3)
      card.add(bg)

      card.add(text(this, -232, -34, chapter.name, 23, '#e2f7ff', { fontStyle: 'bold' }))
      card.add(text(this, -232, -6, chapter.blurb, 14, '#93c5fd'))
      card.add(text(this, -232, 20, `${done}/${levels.length} solved · ${stars}/${levels.length * 3} ★`, 13, '#7dd3fc'))

      const bar = this.add.graphics()
      bar.fillStyle(0x041c26, 1).fillRoundedRect(24, 24, 190, 8, 4)
      bar.fillStyle(chapter.accent, 1).fillRoundedRect(24, 24, (190 * done) / levels.length, 8, 4)
      card.add(bar)

      card.add(this.add.text(214, 0, '→', 30, '#e2f7ff').setOrigin(0.5).setAlpha(0.6))
      card.setSize(512, 108).setInteractive({ useHandCursor: true })
      card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.015, duration: 120 }))
      card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 120 }))
      card.on('pointerdown', () => {
        this.tweens.add({ targets: card, scale: 0.97, duration: 70, yoyo: true })
        fade(this, 'levels', { chapter: i })
      })
    })

    hint(this, W / 2, 790, 'Boards unlock in order — each clean build powers the next.', 14, '#7dd3fc')
  }
}

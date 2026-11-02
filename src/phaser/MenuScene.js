import Phaser from 'phaser'
import { W, H, background, button, text, fade, hint } from './common.js'
import { data, starTotal } from './save.js'
import { LEVELS } from '../levels.js'
import { sfx } from '../sound.js'

const RULES = [
  'A battery pushes power through wires in every direction it opens.',
  'Tap a wire piece to turn it a quarter turn.',
  'Tap a switch to open or close it.',
  'An AND gate needs two powered sides; an OR gate needs one.',
  'A timer pulses on and off — beacons must blink, lamps must not.',
  'Light sensors close once any lamp is glowing.',
  'Never let power reach a fuse.',
]

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu')
  }

  create() {
    background(this, ['#14263a', '#070f18'])
    this.cameras.main.fadeIn(260, 3, 8, 13)
    this.board()

    const title = text(this, W / 2, 232, 'Circuit Crafter', 52, '#e2f7ff', {
      fontStyle: 'bold',
      stroke: '#04161f',
      strokeThickness: 8,
    }).setOrigin(0.5)
    this.tweens.add({ targets: title, alpha: 0.9, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    text(this, W / 2, 280, 'Logic, wired up like a toy.', 19, '#7dd3fc').setOrigin(0.5)

    const done = Object.keys(data.stars).length
    text(this, W / 2, 320, `${done}/${LEVELS.length} boards solved · ${starTotal()} ★`, 16, '#93c5fd').setOrigin(0.5)

    button(this, W / 2, 396, '▶  Power up', () => fade(this, 'chapters'), { w: 380, h: 60, size: 25, color: 0x0891b2 })
    button(this, W / 2, 468, 'How to play', () => this.rules(), { w: 380, h: 46, size: 18, color: 0x11374a })

    hint(this, W / 2, H - 56, '24 boards · wires, switches, gates, timers and sensors', 14, '#7dd3fc')
    hint(this, W / 2, H - 32, 'A Freebuff game · browser and desktop', 13, '#4b7285')

    sfx.click()
  }

  board() {
    const g = this.add.graphics()
    const y = 130
    g.lineStyle(7, 0x1f6f5c, 1)
    g.beginPath()
    g.moveTo(120, y)
    g.lineTo(520, y)
    g.strokePath()

    g.fillStyle(0xfbbf24, 1).fillRoundedRect(96, y - 26, 48, 52, 8)
    g.fillStyle(0x0b1220, 1).fillRect(108, y - 12, 24, 6)

    const bulb = this.add.circle(W / 2 + 120, y, 17, 0xfde047).setDepth(4)
    const glow = this.add.image(W / 2 + 120, y, 'glow').setTint(0xfde047).setBlendMode('ADD').setScale(0.7).setDepth(3)
    this.tweens.add({ targets: [bulb, glow], alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    const pulse = this.add.circle(200, y, 6, 0x67e8f9).setDepth(5)
    this.tweens.add({
      targets: pulse,
      x: { from: 130, to: 500 },
      duration: 1800,
      repeat: -1,
      ease: 'Sine.InOut',
      onRepeat: () => sfx.clock(),
    })

    g.fillStyle(0x0ea5e9, 1).fillCircle(300, y, 12)
    g.fillStyle(0x0b1220, 1).fillCircle(300, y, 5)
  }

  rules() {
    if (this.rulesCard) {
      this.rulesCard.destroy()
      this.rulesCard = null
      return
    }
    const layer = this.add.container(0, 0).setDepth(60)
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x03080d, 0.92).setInteractive()
    dim.on('pointerdown', () => {
      layer.destroy()
      this.rulesCard = null
    })
    const card = this.add.rectangle(W / 2, H / 2, 556, 520, 0x0b1f2b, 1).setStrokeStyle(2, 0x38bdf8, 0.4)
    layer.add([dim, card])
    layer.add(text(this, W / 2, H / 2 - 216, 'How to play', 28, '#e2f7ff', { fontStyle: 'bold' }).setOrigin(0.5))
    RULES.forEach((line, i) => {
      layer.add(
        text(this, W / 2, H / 2 - 158 + i * 42, line, 15, i === RULES.length - 1 ? '#fca5a5' : '#bae6fd', {
          align: 'center',
          wordWrap: { width: 486 },
        }).setOrigin(0.5),
      )
    })
    layer.add(text(this, W / 2, H / 2 + 216, 'Tap anywhere to close', 14, '#7dd3fc').setOrigin(0.5))
    this.rulesCard = layer
    sfx.click()
  }
}

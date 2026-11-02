import Phaser from 'phaser'

export const W = 640
export const H = 860
export const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

function canvas(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return
  const t = scene.textures.createCanvas(key, w, h)
  draw(t.getContext(), w, h)
  t.refresh()
}

export function makeTextures(scene) {
  canvas(scene, 'spark', 16, 16, (ctx) => {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(8, 8, 8, 0, Math.PI * 2)
    ctx.fill()
  })
  canvas(scene, 'glow', 128, 128, (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
  })
}

export function background(scene, [top, bottom], accent = 0x38bdf8) {
  const key = `bg${top}${bottom}`
  canvas(scene, key, 64, H, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, top)
    grad.addColorStop(0.7, bottom)
    grad.addColorStop(1, '#03080d')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, H)
  })
  scene.add.image(W / 2, H / 2, key).setDisplaySize(W, H).setDepth(-100)

  const dust = scene.add.graphics().setDepth(-95)
  for (let i = 0; i < 70; i += 1) {
    dust.fillStyle(accent, Phaser.Math.FloatBetween(0.04, 0.16))
    dust.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), Phaser.Math.FloatBetween(0.8, 2.4))
  }
  scene.tweens.add({ targets: dust, alpha: 0.5, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
}

export function button(scene, x, y, label, fn, { w = 200, h = 54, size = 22, color = 0x0284c7, textColor = '#fff' } = {}) {
  const box = scene.add.container(x, y)
  const bg = scene.add.graphics()
  const draw = (fill, alpha) => {
    bg.clear()
    bg.fillStyle(fill, alpha).fillRoundedRect(-w / 2, -h / 2, w, h, 14)
    bg.lineStyle(2, 0xffffff, 0.24).strokeRoundedRect(-w / 2, -h / 2, w, h, 14)
  }
  draw(color, 0.94)
  const t = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color: textColor })
    .setOrigin(0.5)
  box.add([bg, t])
  box.setSize(w, h).setInteractive({ useHandCursor: true })
  box.on('pointerover', () => draw(color, 1))
  box.on('pointerout', () => draw(color, 0.94))
  box.on('pointerdown', () => {
    scene.tweens.add({ targets: box, scale: 0.94, duration: 70, yoyo: true })
    fn()
  })
  box.setLabel = (s) => t.setText(s)
  return box
}

export const text = (scene, x, y, str, size = 22, color = '#fff', extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra })

export function fade(scene, to, payload) {
  scene.input.enabled = false
  scene.cameras.main.fadeOut(200, 3, 8, 13)
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(to, payload))
}

export const hint = (scene, x, y, str, size = 15, color = '#7dd3fc') =>
  text(scene, x, y, str, size, color).setOrigin(0.5)

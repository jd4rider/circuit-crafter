export function confetti(scene, x, y, color, count = 10, spread = 300) {
  const e = scene.add
    .particles(x, y, 'spark', {
      speed: { min: spread * 0.3, max: spread },
      angle: { min: 0, max: 360 },
      gravityY: 420,
      scale: { start: 0.8, end: 0 },
      lifespan: { min: 500, max: 1000 },
      tint: color,
      emitting: false,
    })
    .setDepth(24)
  e.explode(count)
  scene.time.delayedCall(1100, () => e.destroy())
}

export function ring(scene, x, y, color, radius, duration = 420, width = 5) {
  const c = scene.add.circle(x, y, 10).setStrokeStyle(width, color).setDepth(22)
  scene.tweens.add({
    targets: c,
    scale: radius / 10,
    alpha: 0,
    duration,
    ease: 'Cubic.Out',
    onComplete: () => c.destroy(),
  })
}

export function flashAt(scene, x, y, size, color = 0xffffff) {
  const g = scene.add.image(x, y, 'glow').setTint(color).setBlendMode('ADD').setDepth(21).setScale(0.2)
  scene.tweens.add({
    targets: g,
    scale: size / 128,
    alpha: 0,
    duration: 420,
    ease: 'Quad.Out',
    onComplete: () => g.destroy(),
  })
}

export function popText(scene, x, y, str, color = '#fff', size = 20) {
  const t = scene.add
    .text(x, y, str, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: '#03080d',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(30)
    .setScale(0.5)
  scene.tweens.add({ targets: t, scale: 1, duration: 130, ease: 'Back.Out' })
  scene.tweens.add({ targets: t, y: y - 38, alpha: 0, delay: 320, duration: 500, onComplete: () => t.destroy() })
}

export function sparkle(scene, x, y, color = 0xffffff, count = 6) {
  const e = scene.add
    .particles(x, y, 'spark', {
      speed: { min: 20, max: 110 },
      scale: { start: 0.45, end: 0 },
      lifespan: 520,
      tint: color,
      blendMode: 'ADD',
      emitting: false,
    })
    .setDepth(23)
  e.explode(count)
  scene.time.delayedCall(700, () => e.destroy())
}

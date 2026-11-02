# Circuit Crafter

Wire batteries, switches, mirrors-free logic gates, timers and sensors into circuits that light the lamps — without ever blowing a fuse. Built with Phaser 4, Vite and Electron: playable in the browser and as a desktop app for macOS, Windows and Linux.

- Play in your browser: <https://jd4rider.github.io/circuit-crafter/play/>
- Downloads: <https://github.com/jd4rider/circuit-crafter/releases/latest>

## How to play

- **Battery** — pushes power out of every side it touches.
- **Wire** — tap to turn it a quarter turn. Power follows whatever sides connect.
- **Switch** — tap to open or close it.
- **AND gate** — opens only when at least two of its sides are powered. **OR gate** — opens when any side is.
- **Timer** — pulses on and off. **Beacons** (the cyan lamps) must blink, so they have to sit on a timer; **lamps** must stay steadily lit, so they must not.
- **Light sensor** — opens once any lamp is glowing, which lets you chain circuits together.
- **Fuse** — must never be powered. One live fuse and the board fails, even if every lamp is lit.

Solve at or under par for three stars; hints cost a star. Progress, stars and mute state are stored locally.

**24 boards across four benches:** Bench Test (7×7), Logic Lab (8×8), Timing (9×9) and Automation (10×10).

## Develop

```bash
npm install
npm run dev      # web dev server
npm test         # circuit simulation, level and scoring tests
npm start        # build and open in Electron
npm run dist:mac # package an installer (also dist:win, dist:linux)
```

Levels live in `src/levels.js` as the **solved** board. `createBoard` scrambles wire rotations and switch states deterministically, and `npm test` re-simulates every level's solved art (both timer phases) so a board that cannot actually be completed fails the build.

The simulator is `src/game.js`; scenes are in `src/phaser/`.

## Release

Pushing a `v*` tag runs `.github/workflows/release.yml`, which builds installers on macOS, Windows and Linux and attaches them to the GitHub release. Pushing to `main` redeploys the website (landing page at `/`, game at `/play/`) via `.github/workflows/pages.yml`.

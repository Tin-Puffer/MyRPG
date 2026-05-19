# Emberfall Depths

`Emberfall Depths` is a self-contained HTML5 2D dungeon crawler built with ES modules and the Canvas API. It includes:

- Real-time `WASD` movement
- Mouse or `Space` melee combat
- Procedural multi-room dungeon layout
- Enemy chase and attack AI
- Loot drops, chest rewards, and a simple inventory
- Damage popups, hit particles, slash trails, hit flash, screen shake
- Dark fantasy HUD, pause flow, and game over / restart
- Synthesized BGM, hit, loot, and ambience audio via Web Audio

## Run locally

Because the project uses ES modules, serve it over a tiny local HTTP server:

```bash
cd "/Users/nguyentin113/Local/Game DEmo"
python3 -m http.server 3001
```

Then open:

`http://127.0.0.1:3001`

## Controls

- `WASD`: Move
- `Mouse Left` or `Space`: Attack
- `I`: Toggle inventory panel
- `P`: Pause / resume

## Structure

```text
index.html
styles.css
README.md
assets/
  README.md
src/
  main.js
  game.js
  constants.js
  utils.js
  input.js
  assets.js
  audio.js
  dungeon.js
  player.js
  enemy.js
  combat.js
  ui.js
```
# MyRPG

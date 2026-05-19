# Assets

This game ships as a zero-dependency browser project, so the visual and audio assets are generated in code instead of downloaded from a CDN.

- Visual tiles, character sprites, enemy sprites, slash effects, shadows, chest art, and item icons are generated in [src/assets.js](/Users/nguyentin113/Local/Game%20DEmo/src/assets.js).
- BGM, hit, loot, and dungeon ambience are synthesized in [src/audio.js](/Users/nguyentin113/Local/Game%20DEmo/src/audio.js).

That keeps the project portable while still providing a stylized pixel-art presentation and soundscape.

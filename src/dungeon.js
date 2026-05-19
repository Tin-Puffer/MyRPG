import { TILE, TILE_SIZE, WORLD_COLS, WORLD_ROWS } from "./constants.js";
import { DUNGEON_THEMES } from "./content.js";
import { clamp, randInt, rectsOverlap, tileHash } from "./utils.js";

export class Dungeon {
  constructor(cols = WORLD_COLS, rows = WORLD_ROWS, tileSize = TILE_SIZE) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.tiles = [];
    this.rooms = [];
    this.startPosition = { x: tileSize * 4, y: tileSize * 4 };
    this.enemySpawns = [];
    this.chests = [];
    this.props = [];
    this.theme = null;
    this.mode = "dungeon";
    this.exitPosition = null;
  }

  generate(themeId = "crypt", depth = 1) {
    if (themeId === "hub") {
      this.generateHub();
      return;
    }

    this.mode = "dungeon";
    this.theme = DUNGEON_THEMES[themeId] ?? DUNGEON_THEMES.crypt;
    this.tiles = Array.from({ length: this.rows }, () => Array(this.cols).fill(TILE.WALL));
    this.rooms = [];
    this.enemySpawns = [];
    this.chests = [];
    this.props = [];

    for (let attempt = 0; attempt < 180; attempt += 1) {
      const room = {
        x: randInt(2, this.cols - 15),
        y: randInt(2, this.rows - 13),
        w: randInt(7, 13),
        h: randInt(6, 11),
      };
      room.cx = Math.floor(room.x + room.w / 2);
      room.cy = Math.floor(room.y + room.h / 2);
      if (this.rooms.some((other) => rectsOverlap(room, other, 2))) continue;
      this.rooms.push(room);
      this.carveRoom(room);
    }

    if (this.rooms.length === 0) {
      const fallback = { x: 8, y: 8, w: 10, h: 8, cx: 13, cy: 12 };
      this.rooms.push(fallback);
      this.carveRoom(fallback);
    }

    this.rooms.sort((a, b) => a.cx - b.cx);
    for (let index = 1; index < this.rooms.length; index += 1) {
      this.connectRooms(this.rooms[index - 1], this.rooms[index]);
    }

    const startRoom = this.rooms[0];
    const bossRoom = this.rooms[this.rooms.length - 1];
    const miniBossRoom = this.rooms[Math.max(1, Math.floor(this.rooms.length * 0.55))];
    this.startPosition = {
      x: (startRoom.cx + 0.5) * this.tileSize,
      y: (startRoom.cy + 0.5) * this.tileSize,
    };
    this.exitPosition = {
      x: (bossRoom.cx + 0.5) * this.tileSize,
      y: (bossRoom.cy + 0.5) * this.tileSize,
    };

    this.rooms.slice(1).forEach((room, roomIndex) => {
      const isBossRoom = room === bossRoom;
      const isMiniBossRoom = room === miniBossRoom;

      if (!isBossRoom) {
        const enemyCount = randInt(2, Math.min(4, Math.floor(room.w / 2)));
        for (let i = 0; i < enemyCount; i += 1) {
          const pool = this.theme.enemyPool;
          const enemyType = pool[(roomIndex + i + depth) % pool.length];
          this.enemySpawns.push({
            x: (randInt(room.x + 1, room.x + room.w - 2) + 0.5) * this.tileSize,
            y: (randInt(room.y + 1, room.y + room.h - 2) + 0.5) * this.tileSize,
            typeId: enemyType,
          });
        }
      }

      if (isMiniBossRoom) {
        this.enemySpawns.push({
          x: (room.cx + 0.5) * this.tileSize,
          y: (room.cy + 0.5) * this.tileSize,
          typeId: this.theme.miniBoss,
          bossTag: "mini",
        });
      }

      if (isBossRoom) {
        this.enemySpawns.push({
          x: (room.cx + 0.5) * this.tileSize,
          y: (room.cy + 0.5) * this.tileSize,
          typeId: this.theme.boss,
          bossTag: "boss",
        });
      }

      if (!isBossRoom && (roomIndex % 2 === 0 || Math.random() > 0.45)) {
        this.chests.push({
          x: (randInt(room.x + 1, room.x + room.w - 2) + 0.5) * this.tileSize,
          y: (randInt(room.y + 1, room.y + room.h - 2) + 0.5) * this.tileSize,
          opened: false,
        });
      }

      this.decorateRoom(room, roomIndex, isBossRoom);
    });
  }

  generateHub() {
    this.mode = "hub";
    this.theme = {
      id: "hub",
      name: "Sanctum Crossing",
      floorTint: "rgba(136, 108, 88, 0.08)",
      wallTint: "rgba(82, 63, 48, 0.14)",
      glow: "rgba(238, 198, 122, 0.08)",
    };
    this.tiles = Array.from({ length: this.rows }, () => Array(this.cols).fill(TILE.WALL));
    this.rooms = [];
    this.enemySpawns = [];
    this.chests = [];
    this.props = [];

    const plaza = { x: 8, y: 8, w: 56, h: 30, cx: 36, cy: 23 };
    this.rooms.push(plaza);
    this.carveRoom(plaza);

    for (let x = 16; x <= 56; x += 20) {
      this.carveVertical(10, 36, x);
    }
    for (let y = 12; y <= 32; y += 10) {
      this.carveHorizontal(12, 60, y);
    }

    this.startPosition = { x: 36.5 * this.tileSize, y: 31.5 * this.tileSize };
    this.exitPosition = null;
    this.props.push(
      { type: "brazier", x: 15.5 * this.tileSize, y: 12.5 * this.tileSize, phase: 0.2 },
      { type: "brazier", x: 56.5 * this.tileSize, y: 12.5 * this.tileSize, phase: 0.6 },
      { type: "column", x: 26.5 * this.tileSize, y: 22.5 * this.tileSize, phase: 0 },
      { type: "column", x: 46.5 * this.tileSize, y: 22.5 * this.tileSize, phase: 0 },
      { type: "rune", x: 24.5 * this.tileSize, y: 15.5 * this.tileSize, phase: 0.4 },
      { type: "rune", x: 36.5 * this.tileSize, y: 15.5 * this.tileSize, phase: 1.1 },
      { type: "rune", x: 48.5 * this.tileSize, y: 15.5 * this.tileSize, phase: 1.8 },
      { type: "shrine", x: 20.5 * this.tileSize, y: 28.4 * this.tileSize, phase: 0 },
      { type: "shrine", x: 31.5 * this.tileSize, y: 28.4 * this.tileSize, phase: 0 },
      { type: "shrine", x: 41.5 * this.tileSize, y: 28.4 * this.tileSize, phase: 0 },
      { type: "shrine", x: 51.5 * this.tileSize, y: 28.4 * this.tileSize, phase: 0 }
    );
  }

  decorateRoom(room, roomIndex, isBossRoom) {
    if (room.w >= 8 && room.h >= 8) {
      this.props.push({
        type: "rune",
        x: (room.cx + 0.5) * this.tileSize,
        y: (room.cy + 0.5) * this.tileSize,
        phase: Math.random() * Math.PI * 2,
      });
    }

    if (room.w >= 9 && room.h >= 7) {
      this.props.push({
        type: "brazier",
        x: (room.x + 1.5) * this.tileSize,
        y: (room.y + 1.5) * this.tileSize,
        phase: Math.random() * Math.PI * 2,
      });
      this.props.push({
        type: "brazier",
        x: (room.x + room.w - 1.5) * this.tileSize,
        y: (room.y + 1.5) * this.tileSize,
        phase: Math.random() * Math.PI * 2,
      });
    }

    if (room.w >= 10 && room.h >= 9 && (Math.random() > 0.45 || isBossRoom)) {
      this.props.push({
        type: "column",
        x: (room.x + 2.5) * this.tileSize,
        y: (room.y + room.h - 2.5) * this.tileSize,
        phase: 0,
      });
      this.props.push({
        type: "column",
        x: (room.x + room.w - 2.5) * this.tileSize,
        y: (room.y + room.h - 2.5) * this.tileSize,
        phase: 0,
      });
    }

    if (isBossRoom) {
      this.props.push({
        type: "rune",
        x: (room.cx + 0.5) * this.tileSize,
        y: (room.cy + room.h / 2 - 1) * this.tileSize,
        phase: roomIndex,
      });
    }

    if (this.theme?.id === "crypt" && room.w >= 8) {
      this.props.push({
        type: "tomb",
        x: (room.x + 1.6) * this.tileSize,
        y: (room.cy + 0.5) * this.tileSize,
        phase: 0,
      });
      if (room.w >= 11) {
        this.props.push({
          type: "tomb",
          x: (room.x + room.w - 1.6) * this.tileSize,
          y: (room.cy + 0.5) * this.tileSize,
          phase: 0,
        });
      }
    }

    if (this.theme?.id === "forge" && room.w >= 8) {
      this.props.push({
        type: "lavaVent",
        x: (room.cx + 0.5) * this.tileSize,
        y: (room.y + room.h - 1.5) * this.tileSize,
        phase: 0,
      });
    }

    if (this.theme?.id === "grotto" && room.w >= 8) {
      this.props.push({
        type: "mushrooms",
        x: (room.x + 1.7) * this.tileSize,
        y: (room.y + room.h - 1.5) * this.tileSize,
        phase: 0,
      });
      this.props.push({
        type: "mushrooms",
        x: (room.x + room.w - 1.7) * this.tileSize,
        y: (room.y + 1.6) * this.tileSize,
        phase: 0,
      });
    }
  }

  carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y += 1) {
      for (let x = room.x; x < room.x + room.w; x += 1) {
        this.tiles[y][x] = TILE.FLOOR;
      }
    }
  }

  carveHorizontal(x1, x2, y) {
    const start = Math.min(x1, x2);
    const end = Math.max(x1, x2);
    for (let x = start; x <= end; x += 1) {
      this.tiles[y][x] = TILE.FLOOR;
    }
  }

  carveVertical(y1, y2, x) {
    const start = Math.min(y1, y2);
    const end = Math.max(y1, y2);
    for (let y = start; y <= end; y += 1) {
      this.tiles[y][x] = TILE.FLOOR;
    }
  }

  connectRooms(a, b) {
    const horizontalFirst = Math.random() > 0.5;
    if (horizontalFirst) {
      this.carveHorizontal(a.cx, b.cx, a.cy);
      this.carveVertical(a.cy, b.cy, b.cx);
    } else {
      this.carveVertical(a.cy, b.cy, a.cx);
      this.carveHorizontal(a.cx, b.cx, b.cy);
    }

    const doorA = this.findDoor(a, b);
    const doorB = this.findDoor(b, a);
    this.tiles[doorA.y][doorA.x] = TILE.DOOR;
    this.tiles[doorB.y][doorB.x] = TILE.DOOR;
  }

  findDoor(room, target) {
    const dx = target.cx - room.cx;
    const dy = target.cy - room.cy;
    if (Math.abs(dx) > Math.abs(dy)) {
      return {
        x: dx > 0 ? room.x + room.w - 1 : room.x,
        y: clamp(room.cy, room.y + 1, room.y + room.h - 2),
      };
    }
    return {
      x: clamp(room.cx, room.x + 1, room.x + room.w - 2),
      y: dy > 0 ? room.y + room.h - 1 : room.y,
    };
  }

  worldToTile(value) {
    return Math.floor(value / this.tileSize);
  }

  getTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return TILE.WALL;
    return this.tiles[ty][tx];
  }

  isWalkable(tx, ty) {
    const tile = this.getTile(tx, ty);
    return tile === TILE.FLOOR || tile === TILE.DOOR;
  }

  collidesCircle(x, y, radius) {
    const left = this.worldToTile(x - radius);
    const right = this.worldToTile(x + radius);
    const top = this.worldToTile(y - radius);
    const bottom = this.worldToTile(y + radius);

    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (!this.isWalkable(tx, ty)) return true;
      }
    }
    return false;
  }

  render(ctx, camera, assets, viewportWidth, viewportHeight) {
    const tileSize = this.tileSize;
    const startX = Math.max(0, Math.floor((camera.x - viewportWidth / 2) / tileSize) - 2);
    const endX = Math.min(this.cols - 1, Math.ceil((camera.x + viewportWidth / 2) / tileSize) + 2);
    const startY = Math.max(0, Math.floor((camera.y - viewportHeight / 2) / tileSize) - 2);
    const endY = Math.min(this.rows - 1, Math.ceil((camera.y + viewportHeight / 2) / tileSize) + 2);

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const tile = this.tiles[y][x];
        const screenX = x * tileSize - camera.x + viewportWidth / 2;
        const screenY = y * tileSize - camera.y + viewportHeight / 2;

        if (tile !== TILE.WALL) {
          // Boss room (last room) gets decorative floor tiles
          const bossRoom = this.rooms.length > 0 ? this.rooms[this.rooms.length - 1] : null;
          const isBossTile = bossRoom && x >= bossRoom.x && x < bossRoom.x + bossRoom.w && y >= bossRoom.y && y < bossRoom.y + bossRoom.h;
          const floor = isBossTile && assets.tiles.floorDetail
            ? assets.tiles.floorDetail
            : tileHash(x, y) > 0.5 ? assets.tiles.floorAlt : assets.tiles.floor;
          ctx.drawImage(floor, screenX, screenY, tileSize, tileSize);
          if (this.theme?.floorTint) {
            ctx.fillStyle = this.theme.floorTint;
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
          }
          if (tile === TILE.DOOR) {
            ctx.drawImage(assets.tiles.door, screenX, screenY, tileSize, tileSize);
          }
          if (tileHash(x * 3, y * 5) > 0.82) {
            ctx.fillStyle = "rgba(255, 150, 80, 0.08)";
            ctx.fillRect(screenX + 8, screenY + 6, 6, 6);
          }
        } else {
          ctx.fillStyle = "#0d0c10";
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.drawImage(assets.tiles.wallTop, screenX, screenY, tileSize, tileSize);
          if (this.theme?.wallTint) {
            ctx.fillStyle = this.theme.wallTint;
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
          }
          if (this.isWalkable(x, y + 1)) {
            ctx.drawImage(assets.tiles.wallFace, screenX, screenY, tileSize, tileSize);
            if (this.theme?.wallTint) {
              ctx.fillStyle = this.theme.wallTint;
              ctx.fillRect(screenX, screenY, tileSize, tileSize);
            }
          }
        }
      }
    }
  }
}

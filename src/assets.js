import { DIRECTIONS } from "./constants.js";

const BASE_SIZE = 32;
const CHARACTER_SIZE = 48;
const PALETTE = {
  outline: "#110d14",
  deepShadow: "#070609",
  floorBase: "#221f28",
  floorMortar: "#17141c",
  floorStoneA: "#38333e",
  floorStoneB: "#312c38",
  floorStoneC: "#443d47",
  floorHighlight: "#5a525b",
  floorWear: "#6b615c",
  dirtDark: "#382e2a",
  dirtMid: "#54453d",
  mossDark: "#304033",
  mossMid: "#49604a",
  mossLight: "#728866",
  woodDark: "#4b3326",
  woodMid: "#694733",
  woodLight: "#977056",
  woodGlow: "#d2ac73",
  metalDark: "#332f38",
  metalMid: "#5a525b",
  metalLight: "#8d868f",
  stoneDark: "#2a2530",
  stoneMid: "#47414b",
  stoneLight: "#6b6369",
  clothDark: "#512435",
  clothMid: "#6a3042",
  clothTrim: "#b89b64",
  skin: "#d5b483",
  skinShadow: "#9d764d",
  hair: "#4f392d",
  leather: "#6a4a34",
  leafDark: "#314232",
  leafMid: "#50714a",
  leafLight: "#80a06a",
  steel: "#9daab5",
  steelDark: "#5d6a76",
  emberDark: "#b84b2e",
  emberMid: "#ea8d4b",
  emberLight: "#ffe8b2",
  runeA: "#67b9bb",
  runeB: "#a9e7df",
};

function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function p(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function lineH(ctx, x, y, length, color, thickness = 1) {
  p(ctx, x, y, length, thickness, color);
}

function lineV(ctx, x, y, length, color, thickness = 1) {
  p(ctx, x, y, thickness, length, color);
}

function pixels(ctx, entries, color) {
  entries.forEach(([x, y, w = 1, h = 1]) => p(ctx, x, y, w, h, color));
}

function framedRect(ctx, x, y, w, h, fill, outline = PALETTE.outline) {
  p(ctx, x, y, w, h, outline);
  p(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

function createOutlineCanvas(source, color = "#050409") {
  const { canvas, ctx } = makeCanvas(source.width, source.height);
  const offsets = [
    [-2, 0], [2, 0], [0, -2], [0, 2],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];
  offsets.forEach(([ox, oy]) => ctx.drawImage(source, ox, oy));
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

function ellipseShadow(width = 28, height = 12, alpha = 0.38) {
  const { canvas, ctx } = makeCanvas(width, height);
  const g = ctx.createRadialGradient(width / 2, height / 2, 1, width / 2, height / 2, width / 2);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

/* ── TILES (Map improvements) ───────────────── */
function createFloorTile(variant = 0) {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 0, 0, 32, 32, PALETTE.floorBase);

  const slabs = [
    [1, 1, 14, 14, PALETTE.floorStoneA],
    [17, 1, 14, 14, PALETTE.floorStoneB],
    [1, 17, 14, 14, PALETTE.floorStoneB],
    [17, 17, 14, 14, PALETTE.floorStoneC],
  ];

  slabs.forEach(([x, y, w, h, color], index) => {
    p(ctx, x, y, w, h, color);
    lineH(ctx, x + 1, y + 1, w - 2, PALETTE.floorHighlight);
    if (index % 2 === 0) {
      lineV(ctx, x + 1, y + 2, h - 4, PALETTE.floorHighlight);
    }
  });

  p(ctx, 15, 0, 2, 32, PALETTE.floorMortar);
  p(ctx, 0, 15, 32, 2, PALETTE.floorMortar);
  lineH(ctx, 0, 0, 32, PALETTE.floorMortar);
  lineH(ctx, 0, 31, 32, PALETTE.floorMortar);
  lineV(ctx, 0, 0, 32, PALETTE.floorMortar);
  lineV(ctx, 31, 0, 32, PALETTE.floorMortar);

  pixels(ctx, [
    [5, 5, 2, 1],
    [10, 10, 1, 2],
    [20, 8, 2, 1],
    [24, 23, 1, 2],
    [9, 24, 2, 1],
  ], PALETTE.floorWear);
  pixels(ctx, [
    [3, 11],
    [12, 21],
    [20, 13],
    [26, 6],
    [28, 26],
  ], PALETTE.deepShadow);

  if (variant === 1) {
    pixels(ctx, [
      [4, 9, 4, 1],
      [7, 10, 1, 2],
      [8, 12, 3, 1],
      [20, 20, 5, 1],
      [23, 18, 1, 3],
      [24, 17, 3, 1],
    ], PALETTE.deepShadow);
    pixels(ctx, [
      [5, 8, 3, 1],
      [21, 19, 3, 1],
    ], PALETTE.floorHighlight);
  } else if (variant === 2) {
    pixels(ctx, [
      [5, 21, 4, 3],
      [8, 23, 2, 2],
      [20, 5, 5, 3],
      [22, 8, 2, 2],
    ], PALETTE.dirtDark);
    pixels(ctx, [
      [6, 20, 2, 1],
      [21, 4, 2, 1],
    ], PALETTE.dirtMid);
  } else if (variant === 3) {
    pixels(ctx, [
      [4, 18, 4, 2],
      [6, 20, 3, 2],
      [22, 10, 5, 2],
      [24, 12, 2, 2],
      [15, 23, 3, 2],
    ], PALETTE.mossDark);
    pixels(ctx, [
      [5, 18, 2, 1],
      [23, 10, 3, 1],
      [15, 23, 2, 1],
    ], PALETTE.mossLight);
  } else if (variant === 4) {
    pixels(ctx, [
      [2, 2, 4, 1],
      [2, 3, 1, 3],
      [26, 26, 4, 1],
      [29, 23, 1, 4],
      [13, 15, 6, 2],
      [15, 13, 2, 6],
    ], PALETTE.floorWear);
    pixels(ctx, [
      [14, 14, 4, 4],
    ], PALETTE.floorStoneA);
  }

  return canvas;
}

function createFloorDetailTile() {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 0, 0, 32, 32, PALETTE.floorBase);
  p(ctx, 15, 0, 2, 32, PALETTE.floorMortar);
  p(ctx, 0, 15, 32, 2, PALETTE.floorMortar);
  p(ctx, 5, 5, 22, 22, PALETTE.floorStoneA);
  p(ctx, 8, 8, 16, 16, PALETTE.floorStoneC);
  pixels(ctx, [
    [13, 4, 6, 4],
    [13, 24, 6, 4],
    [4, 13, 4, 6],
    [24, 13, 4, 6],
  ], PALETTE.floorStoneB);
  pixels(ctx, [
    [12, 12, 8, 8],
    [14, 2, 4, 3],
    [14, 27, 4, 3],
    [2, 14, 3, 4],
    [27, 14, 3, 4],
  ], PALETTE.floorWear);
  pixels(ctx, [
    [14, 14, 4, 4],
    [15, 10, 2, 2],
    [15, 20, 2, 2],
    [10, 15, 2, 2],
    [20, 15, 2, 2],
  ], PALETTE.floorHighlight);
  return canvas;
}

function createWallTile() {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 0, 0, 32, 32, "#0d0b10");
  p(ctx, 0, 0, 32, 6, "#4b413d");
  lineH(ctx, 0, 1, 32, "#77695f", 2);
  lineH(ctx, 0, 4, 32, PALETTE.floorWear);
  p(ctx, 0, 6, 32, 26, PALETTE.stoneDark);

  for (let row = 0; row < 4; row++) {
    const y = 6 + row * 6;
    const ox = row % 2 === 0 ? 0 : 4;
    for (let col = 0; col < 4; col++) {
      const x = ox + col * 8;
      const fill = (row + col) % 2 === 0 ? PALETTE.stoneMid : "#3c3640";
      p(ctx, x, y, 7, 5, fill);
      lineH(ctx, x + 1, y + 1, 4, PALETTE.stoneLight);
    }
  }
  pixels(ctx, [
    [4, 18, 3, 2],
    [23, 23, 4, 2],
  ], PALETTE.mossDark);
  pixels(ctx, [
    [5, 18, 2, 1],
    [24, 23, 2, 1],
    [12, 11, 3, 1],
    [15, 12, 1, 3],
  ], PALETTE.deepShadow);
  return canvas;
}

function createWallFaceTile() {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 0, 0, 32, 32, "#16131a");
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const x = col * 8;
      const y = row * 6;
      p(ctx, x, y, 7, 5, (row + col) % 2 === 0 ? "#231f29" : "#1c1821");
      lineH(ctx, x + 1, y + 1, 4, "#322d38");
    }
  }
  pixels(ctx, [
    [3, 7, 3, 1],
    [5, 8, 1, 3],
    [18, 14, 4, 1],
    [20, 15, 1, 3],
    [25, 24, 3, 2],
  ], "#0d0a10");
  pixels(ctx, [
    [24, 24, 3, 2],
    [2, 26, 4, 2],
  ], PALETTE.mossDark);
  return canvas;
}

function createDoorTile() {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 0, 0, 32, 32, "#1a141c");
  framedRect(ctx, 2, 2, 28, 28, PALETTE.woodDark, PALETTE.outline);
  p(ctx, 3, 3, 26, 2, PALETTE.woodLight);
  for (let x = 4; x < 28; x += 5) {
    p(ctx, x, 4, 3, 24, PALETTE.woodMid);
    lineH(ctx, x, 4, 3, PALETTE.woodLight);
  }
  p(ctx, 4, 10, 24, 2, PALETTE.metalDark);
  p(ctx, 4, 20, 24, 2, PALETTE.metalDark);
  p(ctx, 9, 14, 14, 3, PALETTE.metalMid);
  p(ctx, 10, 14, 12, 1, PALETTE.metalLight);
  p(ctx, 14, 13, 4, 5, PALETTE.woodGlow);
  p(ctx, 15, 15, 2, 3, PALETTE.deepShadow);
  pixels(ctx, [
    [5, 7, 3, 1],
    [23, 23, 3, 1],
    [20, 6, 2, 2],
    [8, 25, 2, 2],
  ], PALETTE.deepShadow);
  return canvas;
}

/* ── Props ───────────────────────────────────── */
function createChestSprite(open = false) {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 6, 22, 20, 6, PALETTE.deepShadow);
  framedRect(ctx, 6, 14, 20, 10, PALETTE.woodMid, PALETTE.outline);
  p(ctx, 7, 15, 18, 2, PALETTE.woodLight);
  p(ctx, 7, 18, 18, 5, PALETTE.woodDark);
  lineV(ctx, 10, 14, 10, PALETTE.metalDark);
  lineV(ctx, 21, 14, 10, PALETTE.metalDark);
  p(ctx, 14, 16, 4, 4, PALETTE.woodGlow);
  p(ctx, 15, 17, 2, 2, "#8e6b30");

  if (open) {
    framedRect(ctx, 6, 6, 20, 8, PALETTE.woodMid, PALETTE.outline);
    p(ctx, 8, 7, 16, 2, PALETTE.woodLight);
    p(ctx, 8, 9, 16, 3, "#261811");
    pixels(ctx, [
      [12, 4, 8, 2],
      [14, 2, 4, 2],
    ], PALETTE.emberLight);
  } else {
    framedRect(ctx, 6, 8, 20, 7, PALETTE.woodMid, PALETTE.outline);
    p(ctx, 8, 9, 16, 2, PALETTE.woodLight);
    p(ctx, 12, 18, 2, 2, PALETTE.emberLight);
  }
  return canvas;
}

function createRuneDecal() {
  const { canvas, ctx } = makeCanvas(40, 40);
  pixels(ctx, [
    [14, 4, 12, 2],
    [10, 6, 4, 2],
    [26, 6, 4, 2],
    [8, 8, 2, 4],
    [30, 8, 2, 4],
    [6, 12, 2, 16],
    [32, 12, 2, 16],
    [8, 28, 2, 4],
    [30, 28, 2, 4],
    [10, 32, 4, 2],
    [26, 32, 4, 2],
    [14, 34, 12, 2],
    [14, 14, 12, 2],
    [14, 24, 12, 2],
    [14, 16, 2, 8],
    [24, 16, 2, 8],
    [18, 10, 4, 4],
    [18, 26, 4, 4],
  ], PALETTE.runeA);
  pixels(ctx, [
    [18, 18, 4, 4],
    [12, 18, 4, 4],
    [24, 18, 4, 4],
    [18, 12, 4, 4],
    [18, 24, 4, 4],
  ], PALETTE.runeB);
  return canvas;
}

function createBrazierSprite(frame = 0) {
  const { canvas, ctx } = makeCanvas(32, 40);
  p(ctx, 11, 27, 10, 7, PALETTE.stoneDark);
  p(ctx, 9, 24, 14, 3, PALETTE.stoneLight);
  p(ctx, 10, 25, 12, 1, "#857b82");
  p(ctx, 12, 16, 8, 8, "#241a16");

  if (frame === 0) {
    pixels(ctx, [
      [13, 10, 6, 7],
      [12, 13, 8, 4],
    ], PALETTE.emberDark);
    pixels(ctx, [
      [14, 8, 4, 7],
      [13, 11, 6, 3],
    ], PALETTE.emberMid);
    pixels(ctx, [
      [15, 6, 2, 5],
      [14, 8, 4, 2],
    ], PALETTE.emberLight);
  } else if (frame === 1) {
    pixels(ctx, [
      [12, 11, 8, 6],
      [14, 8, 4, 4],
    ], PALETTE.emberDark);
    pixels(ctx, [
      [13, 9, 6, 6],
      [14, 13, 4, 3],
    ], PALETTE.emberMid);
    pixels(ctx, [
      [15, 5, 2, 5],
      [14, 9, 4, 2],
    ], PALETTE.emberLight);
  } else {
    pixels(ctx, [
      [13, 11, 6, 6],
      [11, 13, 10, 3],
    ], PALETTE.emberDark);
    pixels(ctx, [
      [14, 8, 4, 7],
      [13, 11, 6, 3],
    ], PALETTE.emberMid);
    pixels(ctx, [
      [15, 4, 2, 6],
      [14, 8, 4, 2],
    ], PALETTE.emberLight);
  }

  return canvas;
}

function createColumnSprite() {
  const { canvas, ctx } = makeCanvas(32, 44);
  p(ctx, 6, 2, 20, 6, PALETTE.stoneLight);
  p(ctx, 7, 3, 18, 2, "#8d848a");
  p(ctx, 10, 8, 12, 26, PALETTE.stoneMid);
  p(ctx, 12, 8, 4, 26, "#7d747a");
  p(ctx, 19, 8, 2, 26, PALETTE.stoneDark);
  p(ctx, 6, 34, 20, 6, PALETTE.stoneDark);
  pixels(ctx, [
    [10, 16, 2, 3],
    [20, 24, 2, 3],
    [14, 28, 4, 1],
  ], PALETTE.deepShadow);
  return canvas;
}

function createLanternSprite(frame = 0) {
  const { canvas, ctx } = makeCanvas(32, 32);
  p(ctx, 14, 21, 4, 6, PALETTE.metalDark);
  p(ctx, 13, 9, 6, 12, PALETTE.metalDark);
  p(ctx, 14, 10, 4, 10, "#201717");
  p(ctx, 12, 8, 8, 2, PALETTE.metalMid);
  p(ctx, 12, 20, 8, 2, PALETTE.metalMid);
  p(ctx, 15, 5, 2, 3, PALETTE.metalLight);

  if (frame === 0) {
    pixels(ctx, [[15, 12, 2, 5], [14, 15, 4, 2]], PALETTE.emberMid);
    pixels(ctx, [[15, 10, 2, 4], [14, 12, 4, 2]], PALETTE.emberLight);
  } else if (frame === 1) {
    pixels(ctx, [[14, 12, 4, 4], [15, 10, 2, 5]], PALETTE.emberMid);
    pixels(ctx, [[15, 9, 2, 4], [14, 12, 4, 2]], PALETTE.emberLight);
  } else {
    pixels(ctx, [[15, 13, 2, 4], [14, 15, 4, 2]], PALETTE.emberMid);
    pixels(ctx, [[15, 11, 2, 4], [14, 13, 4, 2]], PALETTE.emberLight);
  }

  pixels(ctx, [
    [13, 10, 1, 9],
    [18, 10, 1, 9],
  ], PALETTE.metalLight);
  return canvas;
}

function createBarrelSprite(variant = 0) {
  const { canvas, ctx } = makeCanvas(32, 32);
  p(ctx, 8, 8, 16, 18, PALETTE.woodMid);
  p(ctx, 9, 9, 14, 2, PALETTE.woodLight);
  p(ctx, 9, 22, 14, 2, PALETTE.woodDark);
  p(ctx, 7, 12, 18, 3, PALETTE.metalDark);
  p(ctx, 7, 19, 18, 3, PALETTE.metalDark);
  lineV(ctx, 12, 10, 12, PALETTE.woodDark);
  lineV(ctx, 16, 10, 12, PALETTE.woodDark);
  lineV(ctx, 20, 10, 12, PALETTE.woodDark);
  if (variant === 1) {
    pixels(ctx, [[9, 16, 2, 2], [21, 14, 2, 2], [16, 24, 2, 1]], PALETTE.deepShadow);
  } else {
    pixels(ctx, [[10, 15, 2, 1], [19, 18, 2, 1], [14, 24, 3, 1]], PALETTE.floorWear);
  }
  return canvas;
}

function createCrateSprite(variant = 0) {
  const { canvas, ctx } = makeCanvas(32, 32);
  framedRect(ctx, 7, 9, 18, 16, PALETTE.woodMid, PALETTE.outline);
  p(ctx, 8, 10, 16, 2, PALETTE.woodLight);
  p(ctx, 8, 21, 16, 3, PALETTE.woodDark);
  pixels(ctx, [
    [9, 11, 3, 12],
    [20, 11, 3, 12],
    [12, 14, 8, 2],
    [12, 18, 8, 2],
  ], PALETTE.woodDark);
  if (variant === 1) {
    pixels(ctx, [[13, 12, 6, 1], [10, 20, 4, 1], [18, 17, 3, 1]], PALETTE.floorWear);
  } else {
    pixels(ctx, [[11, 13, 2, 2], [19, 19, 2, 2], [15, 16, 2, 1]], PALETTE.deepShadow);
  }
  return canvas;
}

function createBrokenStonesSprite(variant = 0) {
  const { canvas, ctx } = makeCanvas(32, 32);
  pixels(ctx, [
    [7, 20, 8, 5],
    [16, 18, 6, 6],
    [21, 22, 4, 3],
    [11, 24, 10, 3],
  ], PALETTE.stoneMid);
  pixels(ctx, [
    [8, 20, 5, 1],
    [17, 18, 3, 1],
    [12, 24, 5, 1],
  ], PALETTE.stoneLight);
  pixels(ctx, [
    [6, 24, 4, 2],
    [19, 23, 3, 2],
    [23, 19, 2, 2],
  ], PALETTE.stoneDark);
  if (variant === 1) {
    pixels(ctx, [[10, 17, 3, 2], [13, 19, 2, 2]], PALETTE.deepShadow);
  }
  return canvas;
}

function createWeedsSprite(variant = 0) {
  const { canvas, ctx } = makeCanvas(32, 32);
  const dark = variant === 1 ? PALETTE.mossDark : PALETTE.leafDark;
  const mid = variant === 1 ? PALETTE.mossMid : PALETTE.leafMid;
  const light = variant === 1 ? PALETTE.mossLight : PALETTE.leafLight;
  pixels(ctx, [
    [10, 18, 2, 8],
    [14, 15, 2, 11],
    [18, 17, 2, 9],
    [12, 20, 8, 2],
  ], dark);
  pixels(ctx, [
    [9, 14, 2, 7],
    [15, 11, 2, 8],
    [20, 14, 2, 7],
    [12, 17, 2, 7],
    [18, 13, 2, 7],
  ], mid);
  pixels(ctx, [
    [15, 10, 1, 3],
    [10, 14, 1, 3],
    [20, 14, 1, 3],
  ], light);
  return canvas;
}

function createDebrisSprite() {
  const { canvas, ctx } = makeCanvas(32, 32);
  pixels(ctx, [
    [9, 21, 3, 2],
    [13, 23, 2, 2],
    [17, 20, 2, 2],
    [21, 22, 3, 2],
    [15, 18, 1, 1],
    [11, 18, 1, 1],
    [23, 19, 1, 1],
  ], PALETTE.dirtMid);
  pixels(ctx, [
    [10, 21, 1, 1],
    [21, 22, 1, 1],
    [16, 20, 1, 1],
  ], PALETTE.floorWear);
  return canvas;
}

function createWallCrackSprite() {
  const { canvas, ctx } = makeCanvas(32, 32);
  pixels(ctx, [
    [14, 6, 2, 4],
    [13, 10, 1, 3],
    [15, 13, 2, 3],
    [17, 16, 1, 4],
    [11, 14, 3, 1],
    [18, 18, 3, 1],
    [9, 20, 4, 1],
  ], "#0f0b11");
  return canvas;
}

function createForgeSprite() {
  const { canvas, ctx } = makeCanvas(40, 48);
  p(ctx, 4, 32, 32, 10, "#3a2e2a");
  p(ctx, 6, 28, 28, 5, "#5a4a3a");
  p(ctx, 10, 18, 20, 12, "#201a18");
  p(ctx, 12, 20, 16, 8, "#382828");
  // Fire
  p(ctx, 14, 8, 12, 10, "#f08840");
  p(ctx, 11, 12, 18, 8, "#c04830");
  p(ctx, 16, 4, 8, 6, "#f0d080");
  // Sides
  p(ctx, 7, 14, 3, 18, "#4a3e38");
  p(ctx, 30, 14, 3, 18, "#4a3e38");
  return canvas;
}

function createShopSprite() {
  const { canvas, ctx } = makeCanvas(40, 48);
  p(ctx, 4, 30, 32, 10, "#4a3830");
  p(ctx, 6, 26, 28, 5, "#8a6848");
  p(ctx, 6, 18, 28, 8, "#282020");
  // Wares
  p(ctx, 8, 20, 8, 6, "#b84850");
  p(ctx, 18, 20, 6, 6, "#5890b0");
  p(ctx, 26, 20, 8, 6, "#589850");
  // Canopy
  p(ctx, 10, 8, 20, 10, "#5a4030");
  p(ctx, 12, 10, 16, 6, "#c8a860");
  return canvas;
}

function createArchivistSprite() {
  const { canvas, ctx } = makeCanvas(40, 48);
  p(ctx, 6, 28, 28, 12, "#3a2a28");
  p(ctx, 8, 14, 24, 14, "#32282a");
  // Books
  p(ctx, 10, 16, 6, 12, "#6a4e3a");
  p(ctx, 18, 16, 6, 12, "#7a6040");
  p(ctx, 26, 16, 6, 12, "#4a6a8a");
  // Head
  p(ctx, 11, 6, 18, 6, "#7a5a44");
  p(ctx, 14, 3, 12, 4, "#c0b088");
  return canvas;
}

function createStashSprite() {
  const { canvas, ctx } = makeCanvas(40, 48);
  p(ctx, 7, 24, 26, 16, "#6a4020");
  p(ctx, 7, 22, 26, 3, "#c09858");
  p(ctx, 9, 26, 22, 12, "#7a4a28");
  p(ctx, 18, 24, 4, 10, "#d0b878");
  p(ctx, 5, 24, 2, 16, "#1a100c");
  p(ctx, 33, 24, 2, 16, "#1a100c");
  p(ctx, 11, 14, 18, 6, "#7a4e28");
  p(ctx, 13, 12, 14, 3, "#d8b068");
  return canvas;
}

function createPortalArchSprite() {
  const { canvas, ctx } = makeCanvas(48, 64);
  // Pillars
  p(ctx, 8, 10, 8, 42, "#3a3038");
  p(ctx, 32, 10, 8, 42, "#3a3038");
  // Arch
  p(ctx, 12, 8, 24, 8, "#5a4e58");
  // Portal void
  p(ctx, 15, 16, 18, 28, "#101828");
  // Portal rings
  p(ctx, 17, 18, 14, 24, "#306878");
  p(ctx, 19, 20, 10, 20, "#60b8c8");
  p(ctx, 20, 24, 8, 12, "#a0e0f0");
  // Portal center
  p(ctx, 22, 28, 4, 6, "#e0f8ff");
  return canvas;
}

function createTombSprite() {
  const { canvas, ctx } = makeCanvas(32, 40);
  p(ctx, 6, 12, 20, 20, "#5a5a60");
  p(ctx, 8, 14, 16, 16, "#78787e");
  p(ctx, 12, 8, 8, 6, "#484850");
  // Cross engraving
  p(ctx, 14, 18, 4, 8, "#c0bca0");
  p(ctx, 12, 22, 8, 2, "#c0bca0");
  p(ctx, 15, 16, 2, 2, "#c0bca0");
  return canvas;
}

function createLavaVentSprite() {
  const { canvas, ctx } = makeCanvas(32, 32);
  p(ctx, 4, 10, 24, 12, "#281c18");
  p(ctx, 8, 12, 16, 8, "#602818");
  p(ctx, 10, 10, 12, 12, "#f08040");
  p(ctx, 12, 12, 8, 8, "#f0c080");
  p(ctx, 14, 14, 4, 4, "#fff0c0");
  return canvas;
}

function createMushroomPatchSprite() {
  const { canvas, ctx } = makeCanvas(32, 32);
  // Stems
  p(ctx, 6, 18, 5, 8, "#c0b8a0");
  p(ctx, 16, 16, 5, 8, "#c0b8a0");
  p(ctx, 11, 20, 5, 7, "#c0b8a0");
  // Caps
  p(ctx, 4, 14, 9, 5, "#68a860");
  p(ctx, 14, 12, 9, 5, "#80c078");
  p(ctx, 9, 16, 9, 5, "#588a50");
  // Highlight dots
  p(ctx, 6, 15, 2, 2, "#a0e898");
  p(ctx, 16, 13, 2, 2, "#a8e8a0");
  return canvas;
}

function createShrineSprite() {
  const { canvas, ctx } = makeCanvas(32, 40);
  p(ctx, 10, 20, 12, 14, "#4a4050");
  p(ctx, 12, 10, 8, 12, "#58809e");
  p(ctx, 13, 12, 6, 8, "#b0d0e8");
  // Shrine top
  p(ctx, 11, 8, 10, 3, "#6a90b0");
  p(ctx, 8, 34, 16, 4, "#2e2830");
  return canvas;
}

function createTelegraphRing(radius = 24, color = "rgba(255,120,82,0.65)") {
  const size = radius*2+8;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(size/2, size/2, radius, 0, Math.PI*2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,222,174,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size/2, size/2, radius-5, 0, Math.PI*2);
  ctx.stroke();
  return canvas;
}

/* ── Item Icons ──────────────────────────────── */
function createItemIcon(type) {
  const { canvas, ctx } = makeCanvas(24, 24);
  const r = (x, y, w, h, c) => { ctx.fillStyle=c; ctx.fillRect(x,y,w,h); };
  const bl = (x, y, c) => { ctx.fillStyle=c; ctx.fillRect(x,y,4,4); };

  if (type === "potion") {
    r(8,4,8,4,"#c0ac88"); r(8,8,8,4,"#702838"); r(4,12,16,8,"#b84058");
    r(8,20,8,4,"#684820"); r(8,12,8,4,"#e0a8b0");
  }
  if (type === "mana_potion") {
    r(8,4,8,4,"#c0ac88"); r(8,8,8,4,"#183868"); r(4,12,16,8,"#4078c0");
    r(8,20,8,4,"#684820"); r(8,12,8,4,"#a0d0e8");
  }
  if (type === "fury_tonic") {
    r(8,4,8,4,"#c0ac88"); r(8,8,8,4,"#582018"); r(4,12,16,8,"#c06030");
    r(8,20,8,4,"#684820"); r(8,12,8,4,"#e0c090");
  }
  if (type === "ward_tonic") {
    r(8,4,8,4,"#c0ac88"); r(8,8,8,4,"#184020"); r(4,12,16,8,"#509858");
    r(8,20,8,4,"#684820"); r(8,12,8,4,"#b8e0b0");
  }
  if (type === "fang") {
    r(8,0,8,20,"#d8c8a8"); r(4,12,16,8,"#b8a078"); r(6,20,12,4,"#584028");
  }
  if (type === "ember") {
    r(10,0,4,8,"#f0c890"); r(4,8,16,8,"#f08840"); r(2,16,20,8,"#b84028");
    r(6,12,12,8,"#f0d098");
  }
  if (type === "key") {
    r(4,12,12,4,"#b89038"); r(14,8,8,8,"#b89038"); r(0,8,8,8,"#d8b868");
    r(16,14,8,4,"#705820");
  }
  if (type === "gold_coin") {
    r(4,4,16,16,"#b07820"); r(6,6,12,12,"#d8b860"); r(8,8,8,8,"#f0d890");
    r(10,10,4,4,"#f8e8b0");
  }
  if (type === "relic") {
    r(8,0,8,8,"#b8d8c8"); r(4,8,16,12,"#509098"); r(8,10,8,8,"#c0e8e0");
    r(10,20,4,4,"#604830");
  }
  if (type === "starter_blade" || type === "grave_saber") {
    r(10,0,4,16,"#c0d0d8"); r(8,16,8,4,"#d8b068"); r(4,20,16,4,"#785030");
    r(6,24,12,4,"#444040");
    if (type === "grave_saber") r(8,4,8,4,"#70c8d0");
  }
  if (type === "scout_mail" || type === "ashen_mail") {
    r(8,4,8,8,"#a09070"); r(4,12,16,12,type==="ashen_mail"?"#584848":"#584e44");
    r(6,14,12,8,type==="ashen_mail"?"#a06058":"#887858");
    r(2,12,4,8,"#38282a"); r(18,12,4,8,"#38282a");
  }
  if (type === "warden_boots") {
    r(4,14,6,10,"#3a4e56"); r(14,14,6,10,"#3a4e56");
    r(4,20,8,4,"#68a8b0"); r(12,20,8,4,"#68a8b0");
  }
  if (type === "moon_charm") {
    r(8,0,8,8,"#b8d8c8"); r(6,8,12,12,"#48a8b0"); r(8,10,8,8,"#b8e8f0");
    r(10,20,4,4,"#685040");
  }
  return canvas;
}

/* ── SLASH (BIGGER, MORE IMPACTFUL) ─────────── */
function createSlashFrames() {
  return [0, 1, 2, 3].map((index) => {
    const { canvas, ctx } = makeCanvas(96, 96);
    ctx.translate(48, 48);
    const rot = -0.6 + index * 0.35;
    ctx.rotate(rot);

    // Big outer glow
    const grd = ctx.createRadialGradient(0, 0, 8, 0, 0, 44);
    grd.addColorStop(0, "rgba(255, 230, 180, 0.35)");
    grd.addColorStop(0.5, "rgba(255, 180, 80, 0.15)");
    grd.addColorStop(1, "rgba(255, 120, 40, 0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(-10, -38);
    ctx.quadraticCurveTo(32, -22, 38, 24);
    ctx.quadraticCurveTo(16, 18, -22, -18);
    ctx.closePath();
    ctx.fill();

    // Main blade (thick, bright)
    ctx.fillStyle = "#f8f0d8";
    ctx.strokeStyle = "#d07028";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-5, -34);
    ctx.quadraticCurveTo(28, -16, 34, 20);
    ctx.quadraticCurveTo(14, 12, -18, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner white line
    ctx.strokeStyle = "#fff8e8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.quadraticCurveTo(16, -10, 20, 8);
    ctx.stroke();

    // Spark dots along slash
    for (let i = 0; i < 5; i++) {
      const t = index / 3 + i * 0.2;
      const sx = -6 + t * 34;
      const sy = -20 + t * 36;
      const size = Math.max(0.1, 2 + (1 - t) * 3);
      ctx.fillStyle = `rgba(255, ${220 + i * 8}, ${160 + i * 20}, ${0.6 + 0.4 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  });
}

/* ── Direction helpers ────────────────────────── */
function bucketDirection(dir) {
  return [DIRECTIONS.DOWN, DIRECTIONS.LEFT, DIRECTIONS.RIGHT, DIRECTIONS.UP][dir] ?? 0;
}

/* ── 48x48 PLAYER (chunky knight inspired by reference) ── */
function drawPlayerSprite(ctx, dir, state, frame, flash, comboStep = 0) {
  const facing = bucketDirection(dir);
  const bob =
    state === "walk"
      ? [0, 1, 0, -1][frame % 4]
      : state === "attack"
        ? [0, -1, 1, 0][frame % 4]
        : [0, 0, 1, 0][frame % 4];
  const sway = state === "walk" ? [-1, 0, 1, 0][frame % 4] : state === "idle" ? [0, 1, 0, 1][frame % 4] : 0;
  const hem = state === "walk" ? [0, 1, 0, 2][frame % 4] : state === "idle" ? [0, 0, 1, 0][frame % 4] : 0;
  const swing = state === "attack" ? [-10, -4, 6, 12][frame % 4] : 0;

  const C = {
    outline: flash ? "#8a7466" : "#060508",
    steel: flash ? "#f3f8fb" : "#d8e0e4",
    steelMid: flash ? "#cfd9de" : "#98a8ae",
    steelDark: flash ? "#b4bec4" : "#5a6971",
    void: flash ? "#7a8790" : "#2a3137",
    plume: flash ? "#ff9b90" : "#8f1717",
    cape: flash ? "#d87066" : "#a31b1b",
    capeDark: flash ? "#b85d56" : "#641010",
    trim: flash ? "#eef1f2" : "#bfc8cc",
    boots: flash ? "#b7c0c5" : "#6c7a82",
    shield: flash ? "#f0f4f7" : "#c7d0d4",
    shieldDark: flash ? "#cfd8dc" : "#7d8b92",
    sword: flash ? "#f7fbfd" : "#e4ecef",
    swordDark: flash ? "#c3ccd1" : "#7f8b92",
    strap: flash ? "#e0b0a7" : "#bf3b33",
  };

  const bx = 9;
  const by = 7 + bob;

  p(ctx, 11, by + 31, 26, 7, "rgba(8,6,10,0.72)");

  if (state === "walk") {
    const step = frame % 2 === 0 ? 0 : 2;
    p(ctx, bx + 9 + step, by + 27, 5, 7, C.boots);
    p(ctx, bx + 19 - step, by + 27, 5, 7, C.boots);
  } else {
    p(ctx, bx + 10, by + 27, 5, 7, C.boots);
    p(ctx, bx + 18, by + 27, 5, 7, C.boots);
  }
  p(ctx, bx + 9, by + 33, 6, 3, C.void);
  p(ctx, bx + 18, by + 33, 6, 3, C.void);

  if (facing === DIRECTIONS.UP) {
    p(ctx, bx + 9, by + 2, 4, 4, C.plume);
    p(ctx, bx + 13, by + 4, 8, 3, C.plume);
    p(ctx, bx + 11, by + 7, 14, 11, C.steelDark);
    p(ctx, bx + 9, by + 17, 18, 11, C.cape);
    p(ctx, bx + 10, by + 18, 16, 3, C.capeDark);
    p(ctx, bx + 13, by + 20, 10, 4, C.steelMid);
    p(ctx, bx + 14, by + 25, 8, 3 + hem, C.capeDark);
    p(ctx, bx + 8, by + 18, 3, 9, C.steelDark);
    p(ctx, bx + 25, by + 18, 3, 9, C.steelDark);
  } else {
    p(ctx, bx + 11, by + 1, 4, 5, C.plume);
    p(ctx, bx + 14, by + 3, 5, 3, C.plume);
    p(ctx, bx + 10, by + 6, 16, 12, C.steel);
    p(ctx, bx + 11, by + 7, 14, 2, C.trim);
    p(ctx, bx + 13, by + 10, 10, 5, C.void);
    p(ctx, bx + 15, by + 11, 6, 2, C.trim);
    p(ctx, bx + 7, by + 18, 20, 10, C.steelMid);
    p(ctx, bx + 9, by + 19, 16, 2, C.trim);
    p(ctx, bx + 13, by + 21, 8, 4, C.steelDark);
    p(ctx, bx + 10, by + 24, 14, 2, C.strap);
    p(ctx, bx + 9, by + 16, 4, 11, C.cape);
    p(ctx, bx + 22, by + 16, 4, 11, C.cape);
    p(ctx, bx + 12, by + 26, 10, 3 + hem, C.capeDark);

    if (facing === DIRECTIONS.DOWN) {
      p(ctx, bx + 24, by + 14, 7, 13, C.shield);
      p(ctx, bx + 25, by + 15, 5, 10, C.shieldDark);
      p(ctx, bx + 26, by + 18, 3, 4, C.void);
    } else if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx + 8, by + 10, 4, 9, C.shieldDark);
      p(ctx, bx + 10, by + 11, 2, 6, C.void);
    } else {
      p(ctx, bx + 24, by + 10, 4, 9, C.shieldDark);
      p(ctx, bx + 24, by + 11, 2, 6, C.void);
    }
  }

  if (state === "attack") {
    if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx + 1 + swing, by + 15, 4, 5, C.steelDark);
      p(ctx, bx + 4 + swing, by + 10, 4, 18, C.swordDark);
      p(ctx, bx + 3 + swing, by + 8, 7, 2, C.sword);
      p(ctx, bx + 23, by + 16, 3, 9, C.steelDark);
      p(ctx, bx + 24, by + 11, 4, 9, C.shieldDark);
    } else if (facing === DIRECTIONS.RIGHT) {
      p(ctx, bx + 27 + swing, by + 15, 4, 5, C.steelDark);
      p(ctx, bx + 27 + swing, by + 10, 4, 18, C.swordDark);
      p(ctx, bx + 25 + swing, by + 8, 7, 2, C.sword);
      p(ctx, bx + 6, by + 16, 3, 9, C.steelDark);
      p(ctx, bx + 8, by + 11, 4, 9, C.shieldDark);
    } else if (facing === DIRECTIONS.UP) {
      p(ctx, bx + 12, by + 15, 4, 4, C.steelDark);
      p(ctx, bx + 23, by + 8 + swing, 4, 16, C.swordDark);
      p(ctx, bx + 22, by + 6 + swing, 7, 2, C.sword);
      p(ctx, bx + 8, by + 17, 3, 9, C.steelDark);
      p(ctx, bx + 25, by + 17, 3, 9, C.steelDark);
    } else {
      p(ctx, bx + 12, by + 16, 4, 4, C.steelDark);
      p(ctx, bx + 24 + Math.floor(swing / 2), by + 10, 4, 17, C.swordDark);
      p(ctx, bx + 23 + Math.floor(swing / 2), by + 8, 7, 2, C.sword);
      p(ctx, bx + 8, by + 17, 3, 9, C.steelDark);
      p(ctx, bx + 25, by + 17, 3, 9, C.steelDark);
    }
  } else {
    p(ctx, bx + 8, by + 16 + Math.max(0, sway), 3, 9, C.steelDark);
    p(ctx, bx + 23, by + 16 + Math.max(0, -sway), 3, 9, C.steelDark);

    if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx + 3, by + 13, 4, 14, C.swordDark);
      p(ctx, bx + 2, by + 11, 7, 2, C.sword);
      p(ctx, bx + 23, by + 11, 5, 10, C.shieldDark);
    } else if (facing === DIRECTIONS.RIGHT) {
      p(ctx, bx + 27, by + 13, 4, 14, C.swordDark);
      p(ctx, bx + 25, by + 11, 7, 2, C.sword);
      p(ctx, bx + 8, by + 11, 5, 10, C.shieldDark);
    } else {
      p(ctx, bx + 25, by + 15, 4, 12, C.swordDark);
      p(ctx, bx + 24, by + 13, 6, 2, C.sword);
    }
  }

  p(ctx, bx + 10, by + 6, 16, 1, C.outline);
  p(ctx, bx + 10, by + 17, 16, 1, C.outline);
  p(ctx, bx + 7, by + 18, 1, 10, C.outline);
  p(ctx, bx + 26, by + 18, 1, 10, C.outline);
}

function getEnemyStyle(detail, flash) {
  const styles = [
    { kind: "skeleton", body: "#d7d1c3", shade: "#8e877d", accent: "#7a4254", face: "#f3e8bf", weapon: "#9ca8b4" },
    { kind: "hound", body: "#4a4453", shade: "#2b2730", accent: "#887698", face: "#f2dc98", weapon: "#cbc5cf" },
    { kind: "archer", body: "#4a344d", shade: "#2c1f2d", accent: "#9582af", face: "#f2e6b7", weapon: "#b29671" },
    { kind: "imp", body: "#733b2c", shade: "#431f17", accent: "#ef9250", face: "#ffe4aa", weapon: "#f5d39a" },
    { kind: "knight", body: "#625b4f", shade: "#3d3831", accent: "#c3a86a", face: "#f4e4b5", weapon: "#96979e" },
    { kind: "shaman", body: "#553644", shade: "#2f1f27", accent: "#d59766", face: "#f4dfb3", weapon: "#b27c50" },
    { kind: "spore", body: "#536541", shade: "#334029", accent: "#97cf72", face: "#dff4b5", weapon: "#b4c98d" },
    { kind: "howler", body: "#49594b", shade: "#2a352c", accent: "#7db079", face: "#ebf3b8", weapon: "#c0d0b8" },
    { kind: "witch", body: "#533844", shade: "#2d1f28", accent: "#7db86f", face: "#d7f4b5", weapon: "#75995d" },
    { kind: "warden", body: "#7a727c", shade: "#4a4450", accent: "#cfb477", face: "#f4ecc9", weapon: "#bec6d2" },
    { kind: "tyrant", body: "#755137", shade: "#432d20", accent: "#eda05c", face: "#f7e2ae", weapon: "#d8b26c" },
    { kind: "keeper", body: "#566544", shade: "#2f3827", accent: "#9bc774", face: "#e1f4bb", weapon: "#9b7a4d" },
    { kind: "lord", body: "#6a6176", shade: "#413b4a", accent: "#bdc0df", face: "#f7f0cc", weapon: "#b0bbd0" },
    { kind: "furnace", body: "#824632", shade: "#4d281b", accent: "#f3a159", face: "#fff0bd", weapon: "#d19856" },
    { kind: "colossus", body: "#60714c", shade: "#36422f", accent: "#acd47d", face: "#e7f8c3", weapon: "#a6bb89" },
    { kind: "bat", body: "#5a4a62", shade: "#2e2532", accent: "#9e7aa9", face: "#f3dc9e", weapon: "#cab8cf" },
    { kind: "sentinel", body: "#787176", shade: "#48434b", accent: "#cfbd84", face: "#f1e9c8", weapon: "#bcc4ce" },
    { kind: "oracle", body: "#5a415f", shade: "#312335", accent: "#c38fd5", face: "#f6e7bf", weapon: "#d2b5e7" },
    { kind: "roller", body: "#6d462e", shade: "#3e281d", accent: "#f0a05d", face: "#f8e4b1", weapon: "#ce9556" },
    { kind: "bulwark", body: "#666157", shade: "#3a3731", accent: "#d0b16c", face: "#f4e1ad", weapon: "#a4adb4" },
    { kind: "wisp", body: "#7a5b44", shade: "#4d3529", accent: "#ffbf78", face: "#fff0bf", weapon: "#ffd48d" },
    { kind: "bloom", body: "#557246", shade: "#32422b", accent: "#89d775", face: "#e9f8bf", weapon: "#b8d79b" },
    { kind: "briar", body: "#5f6945", shade: "#334027", accent: "#a4cf73", face: "#ebf7c0", weapon: "#9a7d4f" },
    { kind: "sprinter", body: "#4f6248", shade: "#283229", accent: "#79c28c", face: "#e5f6bb", weapon: "#a6c79e" },
  ];
  const style = styles[detail % styles.length];
  if (!flash) return style;
  return {
    ...style,
    body: "#e8e0d2",
    shade: "#bdb4a3",
    accent: "#fbf2de",
    face: "#fff9ef",
    weapon: "#f8f1e5",
  };
}

function drawEnemyFace(ctx, facing, x, y, w, h, color) {
  p(ctx, x, y, w, h, color);
  if (facing === DIRECTIONS.LEFT) {
    p(ctx, x + 1, y + 2, 3, 2, PALETTE.outline);
  } else if (facing === DIRECTIONS.RIGHT) {
    p(ctx, x + w - 4, y + 2, 3, 2, PALETTE.outline);
  } else {
    p(ctx, x + 2, y + 2, 3, 2, PALETTE.outline);
    p(ctx, x + w - 5, y + 2, 3, 2, PALETTE.outline);
  }
}

function drawEnemySprite(ctx, dir, state, frame, flash, variant = 0, detail = 0) {
  const facing = bucketDirection(dir);
  const bob = state === "walk" ? [0, 1, 0, -1][frame % 4] : 0;
  const lift = state === "walk" ? [0, 1, 0, 1][frame % 4] : 0;
  const lunge = state === "attack" ? [-5, -1, 5, 9][frame % 4] : 0;
  const style = getEnemyStyle(detail, flash);
  const bx = 8;
  const by = 7 + bob;

  if (style.kind === "skeleton" || style.kind === "warden" || style.kind === "lord" || style.kind === "sentinel") {
    const heavy = style.kind === "warden" || style.kind === "sentinel";
    const regal = style.kind === "lord";
    p(ctx, bx + 10, by + 3, 12, 10, style.face);
    p(ctx, bx + 8, by + 13, 16, 10, regal ? style.accent : style.body);
    p(ctx, bx + 11, by + 23, 5, 9, style.body);
    p(ctx, bx + 18, by + 23, 5, 9, style.body);
    p(ctx, bx + 7, by + 15, 3, 10, style.body);
    p(ctx, bx + 22, by + 15, 3, 10, style.body);
    p(ctx, bx + 10, by + 31, 7, 3, PALETTE.deepShadow);
    p(ctx, bx + 17, by + 31, 7, 3, PALETTE.deepShadow);
    p(ctx, bx + 9, by + 11, 14, 3, style.shade);
    drawEnemyFace(ctx, facing, bx + 10, by + 3, 12, 10, style.face);
    if (heavy) {
      p(ctx, bx + 6, by + 12, 20, 4, style.shade);
      p(ctx, bx + 6, by + 9, 5, 4, style.accent);
      p(ctx, bx + 21, by + 9, 5, 4, style.accent);
    }
    if (regal) {
      p(ctx, bx + 7, by + 1, 18, 3, style.accent);
      p(ctx, bx + 10, by, 12, 1, style.weapon);
      p(ctx, bx + 7, by + 20, 18, 5, style.body);
    }
    if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx + 1 + lunge, by + 14, 4, 15, style.weapon);
      p(ctx, bx + 2 + lunge, by + 11, 6, 3, style.accent);
    } else if (facing === DIRECTIONS.RIGHT) {
      p(ctx, bx + 27 + lunge, by + 14, 4, 15, style.weapon);
      p(ctx, bx + 24 + lunge, by + 11, 6, 3, style.accent);
    } else {
      p(ctx, bx + 23, by + 12 + Math.min(0, lunge), 4, 14, style.weapon);
      p(ctx, bx + 22, by + 10 + Math.min(0, lunge), 6, 3, style.accent);
    }
  } else if (style.kind === "hound" || style.kind === "howler" || style.kind === "sprinter") {
    const feral = style.kind === "howler" || style.kind === "sprinter";
    if (facing === DIRECTIONS.LEFT || facing === DIRECTIONS.RIGHT) {
      const forward = facing === DIRECTIONS.LEFT ? -4 + lunge : lunge;
      const hx = facing === DIRECTIONS.LEFT ? bx + 5 + forward : bx + 19 + forward;
      p(ctx, bx + 11, by + 18, 16, 8, style.body);
      p(ctx, bx + 13, by + 16, 12, 3, style.accent);
      p(ctx, hx, by + 13, 10, 8, style.shade);
      p(ctx, bx + 12, by + 26, 4, 8 - lift, style.shade);
      p(ctx, bx + 18, by + 26, 4, 9, style.shade);
      p(ctx, bx + 24, by + 26, 4, 8 - lift, style.shade);
      p(ctx, bx + 29, by + 26, 3, 8, style.shade);
      p(ctx, facing === DIRECTIONS.LEFT ? bx + 26 : bx + 8, by + 16, 4, 3, style.accent);
      p(ctx, facing === DIRECTIONS.LEFT ? hx - 1 : hx + 8, by + 12, 3, 3, style.weapon);
      drawEnemyFace(ctx, facing, hx + 1, by + 13, 8, 6, style.face);
      if (state === "attack") {
        p(ctx, facing === DIRECTIONS.LEFT ? hx - 2 : hx + 8, by + 18, 4, 3, style.weapon);
      }
      if (feral) {
        p(ctx, bx + 14, by + 13, 3, 3, style.accent);
        p(ctx, bx + 21, by + 13, 3, 3, style.accent);
      }
    } else {
      p(ctx, bx + 11, by + 10, 16, 16, style.body);
      p(ctx, bx + 9, by + 6 + (facing === DIRECTIONS.UP ? lunge : 0), 20, 8, style.shade);
      p(ctx, bx + 13, by + 26, 4, 8, style.shade);
      p(ctx, bx + 21, by + 26, 4, 8, style.shade);
      p(ctx, bx + 9, by + 18, 3, 8, style.shade);
      p(ctx, bx + 28, by + 18, 3, 8, style.shade);
      p(ctx, bx + 13, by + 14, 12, 3, style.accent);
      drawEnemyFace(ctx, facing, bx + 12, by + 9, 14, 7, style.face);
      if (feral) {
        p(ctx, bx + 12, by + 5, 3, 3, style.accent);
        p(ctx, bx + 23, by + 5, 3, 3, style.accent);
      }
    }
  } else if (style.kind === "bat") {
    p(ctx, bx + 13, by + 10, 10, 8, style.body);
    p(ctx, bx + 7, by + 12, 7, 5, style.shade);
    p(ctx, bx + 22, by + 12, 7, 5, style.shade);
    p(ctx, bx + 10, by + 18, 4, 8, style.shade);
    p(ctx, bx + 22, by + 18, 4, 8, style.shade);
    p(ctx, bx + 12, by + 7, 4, 4, style.accent);
    p(ctx, bx + 20, by + 7, 4, 4, style.accent);
    drawEnemyFace(ctx, facing, bx + 14, by + 10, 8, 6, style.face);
    if (state === "attack") {
      p(ctx, facing === DIRECTIONS.LEFT ? bx + 6 : bx + 26, by + 14, 4, 3, style.weapon);
    }
  } else if (style.kind === "archer" || style.kind === "shaman" || style.kind === "witch" || style.kind === "oracle") {
    const caster = style.kind !== "archer";
    p(ctx, bx + 10, by + 4, 14, 11, style.face);
    p(ctx, bx + 8, by + 13, 18, 12, style.body);
    p(ctx, bx + 11, by + 17, 12, 3, style.accent);
    p(ctx, bx + 12, by + 25, 4, 8, style.shade);
    p(ctx, bx + 18, by + 25, 4, 8, style.shade);
    p(ctx, bx + 7, by + 15, 3, 10, style.body);
    p(ctx, bx + 24, by + 15, 3, 10, style.body);
    drawEnemyFace(ctx, facing, bx + 10, by + 4, 14, 11, style.face);
    if (style.kind === "witch" || style.kind === "oracle") {
      p(ctx, bx + 9, by + 2, 3, 4, style.accent);
      p(ctx, bx + 22, by + 2, 3, 4, style.accent);
    }
    if (style.kind === "shaman") {
      p(ctx, bx + 8, by + 4, 4, 2, style.weapon);
      p(ctx, bx + 22, by + 4, 4, 2, style.weapon);
    }
    if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx + (caster ? 3 : 2) + lunge, by + 13, 3, 16, caster ? style.weapon : style.accent);
      p(ctx, bx + (caster ? 1 : 0) + lunge, by + 16, caster ? 6 : 7, 3, style.weapon);
    } else if (facing === DIRECTIONS.RIGHT) {
      p(ctx, bx + 28 + lunge, by + 13, 3, 16, caster ? style.weapon : style.accent);
      p(ctx, bx + 25 + lunge, by + 16, caster ? 6 : 7, 3, style.weapon);
    } else {
      p(ctx, bx + 24, by + 13 + Math.min(0, lunge), 3, 15, caster ? style.weapon : style.accent);
      p(ctx, bx + 22, by + 13 + Math.min(0, lunge), 6, 3, style.weapon);
    }
  } else if (style.kind === "roller") {
    p(ctx, bx + 10, by + 12, 16, 16, style.body);
    p(ctx, bx + 12, by + 14, 12, 4, style.accent);
    p(ctx, bx + 11, by + 10, 4, 4, style.weapon);
    p(ctx, bx + 21, by + 10, 4, 4, style.weapon);
    p(ctx, bx + 8, by + 18, 3, 8, style.shade);
    p(ctx, bx + 25, by + 18, 3, 8, style.shade);
    drawEnemyFace(ctx, facing, bx + 13, by + 15, 10, 7, style.face);
  } else if (style.kind === "imp" || style.kind === "wisp") {
    p(ctx, bx + 12, by + 10, 12, 12, style.body);
    p(ctx, bx + 9, by + 7, 6, 5, style.accent);
    p(ctx, bx + 21, by + 7, 6, 5, style.accent);
    if (style.kind !== "wisp") {
      p(ctx, bx + 11, by + 22, 5, 8, style.shade);
      p(ctx, bx + 20, by + 22, 5, 8, style.shade);
      p(ctx, bx + 7, by + 15, 5, 8, style.body);
      p(ctx, bx + 24, by + 15, 5, 8, style.body);
    } else {
      p(ctx, bx + 9, by + 21, 18, 4, style.accent);
    }
    p(ctx, bx + 13, by + 15, 10, 3, style.accent);
    drawEnemyFace(ctx, facing, bx + 13, by + 11, 10, 7, style.face);
    if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx + 2 + lunge, by + 16, 6, 5, style.weapon);
    } else if (facing === DIRECTIONS.RIGHT) {
      p(ctx, bx + 27 + lunge, by + 16, 6, 5, style.weapon);
    } else {
      p(ctx, bx + 22, by + 10 + Math.min(0, lunge), 5, 8, style.weapon);
    }
  } else if (style.kind === "knight" || style.kind === "tyrant" || style.kind === "furnace" || style.kind === "bulwark") {
    const brute = style.kind === "tyrant" || style.kind === "bulwark";
    const molten = style.kind === "furnace";
    p(ctx, bx + 9, by + 4, 16, 11, molten ? style.accent : style.face);
    p(ctx, bx + 7, by + 14, 20, 13, style.body);
    p(ctx, bx + 10, by + 18, 14, 4, style.accent);
    p(ctx, bx + 10, by + 27, 5, 8, style.shade);
    p(ctx, bx + 19, by + 27, 5, 8, style.shade);
    p(ctx, bx + 6, by + 16, 3, 10, style.body);
    p(ctx, bx + 25, by + 16, 3, 10, style.body);
    drawEnemyFace(ctx, facing, bx + 9, by + 4, 16, 11, molten ? style.accent : style.face);
    if (molten) {
      p(ctx, bx + 12, by + 19, 10, 5, style.face);
      p(ctx, bx + 13, by + 20, 8, 2, style.accent);
    }
    if (brute) {
      p(ctx, bx + 7, by + 2, 6, 3, style.accent);
      p(ctx, bx + 21, by + 2, 6, 3, style.accent);
    }
    if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx + (brute ? 0 : 1) + lunge, by + 13, 6, 16, style.weapon);
      p(ctx, bx + 2 + lunge, by + 11, 8, 3, style.accent);
    } else if (facing === DIRECTIONS.RIGHT) {
      p(ctx, bx + 26 + lunge, by + 13, 6, 16, style.weapon);
      p(ctx, bx + 22 + lunge, by + 11, 8, 3, style.accent);
    } else {
      p(ctx, bx + 23, by + 13 + Math.min(0, lunge), 5, 15, style.weapon);
      p(ctx, bx + 21, by + 11 + Math.min(0, lunge), 8, 3, style.accent);
    }
  } else if (style.kind === "spore" || style.kind === "bloom") {
    p(ctx, bx + 8, by + 5, 20, 10, style.accent);
    p(ctx, bx + 11, by + 9, 14, 3, style.face);
    p(ctx, bx + 12, by + 16, 12, 10, style.body);
    p(ctx, bx + 11, by + 26, 5, 8, style.shade);
    p(ctx, bx + 20, by + 26, 5, 8, style.shade);
    p(ctx, bx + 8, by + 18, 3, 8, style.body);
    p(ctx, bx + 25, by + 18, 3, 8, style.body);
    drawEnemyFace(ctx, facing, bx + 13, by + 16, 10, 7, style.face);
    p(ctx, bx + 12, by + 11, 3, 3, style.body);
    p(ctx, bx + 21, by + 11, 3, 3, style.body);
  } else if (style.kind === "keeper" || style.kind === "colossus" || style.kind === "briar") {
    const boss = style.kind === "colossus";
    p(ctx, bx + 8, by + 6, 20, 18, style.body);
    p(ctx, bx + 10, by + 3, 16, 7, style.shade);
    p(ctx, bx + 11, by + 17, 14, 4, style.accent);
    p(ctx, bx + 10, by + 24, 5, 10, style.shade);
    p(ctx, bx + 21, by + 24, 5, 10, style.shade);
    p(ctx, bx + 6, by + 16, 4, 10, style.shade);
    p(ctx, bx + 26, by + 16, 4, 10, style.shade);
    drawEnemyFace(ctx, facing, bx + 11, by + 7, 14, 9, style.face);
    p(ctx, bx + 8, by + 3, 4, 4, style.weapon);
    p(ctx, bx + 24, by + 3, 4, 4, style.weapon);
    if (boss) {
      p(ctx, bx + 5, by + 1, 6, 3, style.accent);
      p(ctx, bx + 25, by + 1, 6, 3, style.accent);
      p(ctx, bx + 7, by + 22, 22, 5, style.shade);
    }
    if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx + 2 + lunge, by + 17, 6, 12, style.weapon);
    } else if (facing === DIRECTIONS.RIGHT) {
      p(ctx, bx + 27 + lunge, by + 17, 6, 12, style.weapon);
    } else {
      p(ctx, bx + 24, by + 14 + Math.min(0, lunge), 4, 13, style.weapon);
    }
  }

  if (state === "attack") {
    ctx.fillStyle = `${style.accent}33`;
    ctx.fillRect(bx + 2, by + 4, 26, 30);
  }
}

/* ── ITEM DEFINITIONS ────────────────────────── */
export const ITEM_DEFS = {
  potion: { id:"potion", name:"Crimson Draught", rarity:"Common", description:"A bitter restorative recovered from fallen delvers.", kind:"consumable", stackable:true, heal:42, quickbarGroup:"hp" },
  mana_potion: { id:"mana_potion", name:"Azure Draught", rarity:"Common", description:"A lucid tonic that restores mana.", kind:"consumable", stackable:true, manaRestore:34, quickbarGroup:"mana" },
  fury_tonic: { id:"fury_tonic", name:"Fury Tonic", rarity:"Uncommon", description:"Boosts weapon damage and attack speed.", kind:"consumable", stackable:true, buff:"fury", duration:12, quickbarGroup:"buff1" },
  ward_tonic: { id:"ward_tonic", name:"Ward Tonic", rarity:"Uncommon", description:"Hardens your guard.", kind:"consumable", stackable:true, buff:"ward", duration:14, quickbarGroup:"buff2" },
  fang: { id:"fang", name:"Ghoul Fang", rarity:"Common", description:"A jagged trophy.", kind:"material", stackable:true },
  ember: { id:"ember", name:"Ember Shard", rarity:"Rare", description:"A warm shard that hums.", kind:"material", stackable:true },
  key: { id:"key", name:"Rust Key", rarity:"Uncommon", description:"An iron key.", kind:"material", stackable:true },
  relic: { id:"relic", name:"Moon Relic", rarity:"Epic", description:"A polished charm.", kind:"material", stackable:false },
  starter_blade: { id:"starter_blade", name:"Wayfarer Blade", rarity:"Common", description:"A dependable sword.", kind:"equipment", stackable:false, slot:"weapon", bonuses:{damage:6,attackSpeed:0.05,reach:0.02} },
  scout_mail: { id:"scout_mail", name:"Scout Mail", rarity:"Common", description:"Layered leather and plate.", kind:"equipment", stackable:false, slot:"armor", bonuses:{armor:3,hp:14} },
  grave_saber: { id:"grave_saber", name:"Grave Saber", rarity:"Rare", description:"A cold-edged saber.", kind:"equipment", stackable:false, slot:"weapon", bonuses:{damage:12,attackSpeed:0.09,crit:0.05,reach:0.08} },
  ashen_mail: { id:"ashen_mail", name:"Ashen Mail", rarity:"Uncommon", description:"Smoked plates.", kind:"equipment", stackable:false, slot:"armor", bonuses:{armor:6,hp:26,vitality:1} },
  warden_boots: { id:"warden_boots", name:"Warden Boots", rarity:"Uncommon", description:"Dungeon-forged boots.", kind:"equipment", stackable:false, slot:"boots", bonuses:{speed:20,staminaRegen:3,dexterity:1} },
  moon_charm: { id:"moon_charm", name:"Moon Charm", rarity:"Epic", description:"A relic charm.", kind:"equipment", stackable:false, slot:"charm", bonuses:{spirit:1,stamina:20,crit:0.04,damage:4} },
};

export class AssetFactory {
  constructor() {
    const floorVariants = [0, 1, 2, 3, 4].map((variant) => createFloorTile(variant));
    this.characterSpriteSize = CHARACTER_SIZE;
    this.tiles = {
      floor: floorVariants[0],
      floorAlt: floorVariants[1],
      floors: floorVariants,
      floorDetail: createFloorDetailTile(),
      wallTop: createWallTile(),
      wallFace: createWallFaceTile(),
      door: createDoorTile(),
    };
    this.props = {
      chestClosed: createChestSprite(false),
      chestOpen: createChestSprite(true),
      shadow: ellipseShadow(),
      shadowSoft: ellipseShadow(38, 14, 0.22),
      shadowPool: ellipseShadow(56, 20, 0.15),
      lootShadow: ellipseShadow(20, 10, 0.28),
      rune: createRuneDecal(),
      brazier: [0, 1, 2].map((frame) => createBrazierSprite(frame)),
      lantern: [0, 1, 2].map((frame) => createLanternSprite(frame)),
      barrel: [0, 1].map((variant) => createBarrelSprite(variant)),
      crate: [0, 1].map((variant) => createCrateSprite(variant)),
      brokenStones: [0, 1].map((variant) => createBrokenStonesSprite(variant)),
      weeds: [0, 1].map((variant) => createWeedsSprite(variant)),
      debris: createDebrisSprite(),
      wallCrack: createWallCrackSprite(),
      column: createColumnSprite(),
      forge: createForgeSprite(),
      shop: createShopSprite(),
      archivist: createArchivistSprite(),
      stash: createStashSprite(),
      portalArch: createPortalArchSprite(),
      tomb: createTombSprite(),
      lavaVent: createLavaVentSprite(),
      mushrooms: createMushroomPatchSprite(),
      shrine: createShrineSprite(),
      telegraphRing: createTelegraphRing(),
      slash: createSlashFrames(),
    };
    this.spriteCache = new Map();
    this.spriteOutlineCache = new Map();
    this.itemIcons = Object.fromEntries(
      [...Object.keys(ITEM_DEFS), "gold_coin"].map((key) => {
        const canvas = createItemIcon(key);
        return [key, { canvas, url: canvas.toDataURL("image/png") }];
      })
    );
  }

  getCharacterSprite(kind, dir, state, frame, flash = false, variant = 0, detail = 0) {
    const key = `${kind}-${dir}-${state}-${frame}-${flash}-${variant}-${detail}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key);

    const { canvas, ctx } = makeCanvas(CHARACTER_SIZE, CHARACTER_SIZE);
    if (kind === "player") {
      drawPlayerSprite(ctx, dir, state, frame, flash, detail);
    } else {
      drawEnemySprite(ctx, dir, state, frame, flash, variant, detail);
    }
    this.spriteCache.set(key, canvas);
    return canvas;
  }

  getCharacterOutlineSprite(kind, dir, state, frame, flash = false, variant = 0, detail = 0) {
    const key = `${kind}-${dir}-${state}-${frame}-${flash}-${variant}-${detail}`;
    if (this.spriteOutlineCache.has(key)) return this.spriteOutlineCache.get(key);
    const sprite = this.getCharacterSprite(kind, dir, state, frame, flash, variant, detail);
    const outline = createOutlineCanvas(sprite);
    this.spriteOutlineCache.set(key, outline);
    return outline;
  }
}

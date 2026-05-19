import { DIRECTIONS } from "./constants.js";

const BASE_SIZE = 32;
const P = 4;

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

function ellipseShadow(width = 28, height = 12, alpha = 0.38) {
  const { canvas, ctx } = makeCanvas(width, height);
  const g = ctx.createRadialGradient(width/2, height/2, 1, width/2, height/2, width/2);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(width/2, height/2, width/2, height/2, 0, 0, Math.PI*2);
  ctx.fill();
  return canvas;
}

/* ── TILES (Map improvements) ───────────────── */
function createFloorTile(variant = 0) {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  // Base color
  p(ctx, 0, 0, 32, 32, variant ? "#2a2530" : "#222028");

  // Stone slabs (bigger blocks = 8x8)
  const slabOffsets = variant
    ? [[0,0],[16,0],[0,16],[16,16]]
    : [[0,0],[14,0],[0,14],[16,14],[0,28],[16,28]];

  const slabColors = ["#38333e", "#322d3a", "#3c3742"];
  slabOffsets.forEach(([ox, oy], i) => {
    const c = slabColors[i % slabColors.length];
    p(ctx, ox, oy, 12, 11, c);
    // Mortar line
    p(ctx, ox + 12, oy, 2, 11, "#1a1820");
    // Crack detail
    p(ctx, ox + 4, oy + 3, 2, 2, "#4a3f47");
    p(ctx, ox + 8, oy + 7, 3, 1, "#4a3f47");
  });

  // Subtle grid highlight
  p(ctx, 1, 1, 30, 1, "rgba(255, 214, 165, 0.04)");
  return canvas;
}

function createFloorDetailTile() {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 0, 0, 32, 32, "#1e1c24");
  // Decorative pattern - mosaic cross
  p(ctx, 12, 2, 8, 8, "#4a4050");
  p(ctx, 2, 12, 8, 8, "#4a4050");
  p(ctx, 22, 12, 8, 8, "#4a4050");
  p(ctx, 12, 22, 8, 8, "#4a4050");
  // Center
  p(ctx, 12, 12, 8, 8, "#6a5a6a");
  p(ctx, 14, 14, 4, 4, "#8a7a8a");
  return canvas;
}

function createWallTile() {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 0, 0, 32, 32, "#0e0d12");
  // Top cap
  p(ctx, 0, 0, 32, 6, "#4a403a");
  p(ctx, 0, 1, 32, 2, "#6a5a50");
  p(ctx, 0, 4, 32, 1, "#8a7a6a");
  // Stone wall body
  p(ctx, 0, 6, 32, 26, "#2a242e");
  // Brick pattern (8x6 blocks, staggered)
  for (let row = 0; row < 4; row++) {
    const y = 6 + row * 6;
    const ox = row % 2 === 0 ? 0 : 4;
    for (let col = 0; col < 4; col++) {
      const x = ox + col * 8;
      const light = (row + col) % 2 === 0;
      p(ctx, x, y, 7, 5, light ? "#3a3442" : "#322c38");
      p(ctx, x + 3, y + 2, 2, 1, "#4a4450");
    }
  }
  // Moss
  p(ctx, 2, 16, 4, 4, "#4a6a3a");
  p(ctx, 24, 24, 4, 4, "#4a6a3a");
  return canvas;
}

function createWallFaceTile() {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 0, 0, 32, 32, "#16131a");
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * 8;
      const y = row * 6;
      p(ctx, x, y, 7, 5, (row+col)%2===0 ? "#221e28" : "#1c1822");
      p(ctx, x + 3, y + 2, 2, 1, "#0c0a10");
    }
  }
  return canvas;
}

function createDoorTile() {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 0, 0, 32, 32, "#1c1620");
  // Door frame
  p(ctx, 2, 2, 28, 28, "#4a3a2a");
  // Vertical planks
  for (let x = 4; x < 28; x += 5) {
    p(ctx, x, 3, 3, 26, "#6a5040");
  }
  // Top/bottom reinforcement
  p(ctx, 2, 2, 28, 3, "#8a6a50");
  p(ctx, 2, 27, 28, 3, "#2a1c14");
  // Cross beam
  p(ctx, 4, 11, 24, 2, "#2a1c14");
  p(ctx, 4, 19, 24, 2, "#2a1c14");
  // Cross decoration
  p(ctx, 10, 14, 12, 2, "#c4a06a");
  // Keyhole
  p(ctx, 14, 13, 4, 4, "#8a7040");
  p(ctx, 15, 15, 2, 3, "#1a1008");
  return canvas;
}

/* ── Props ───────────────────────────────────── */
function createChestSprite(open = false) {
  const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
  p(ctx, 6, 22, 20, 6, "#1a1208"); // shadow
  p(ctx, 6, 14, 20, 10, "#6a4528"); // body
  p(ctx, 6, 13, 20, 2, "#c89850"); // lid edge
  // Sides
  p(ctx, 5, 14, 2, 10, "#1a1010");
  p(ctx, 25, 14, 2, 10, "#1a1010");
  // Lock
  p(ctx, 14, 16, 4, 4, "#d0b868");
  p(ctx, 15, 17, 2, 2, "#a08040");
  // Inner shadow
  p(ctx, 8, 16, 16, 6, "#3a2018");

  if (open) {
    p(ctx, 6, 6, 20, 8, "#6a4528"); // lid up
    p(ctx, 8, 6, 16, 2, "#d0b868");
    p(ctx, 8, 8, 16, 4, "#2a1810"); // dark inner
    p(ctx, 12, 4, 8, 3, "#f0d060"); // treasure glow
    // Glow lines
    p(ctx, 14, 2, 4, 2, "#f8e890");
  } else {
    p(ctx, 6, 8, 20, 7, "#7a4e28");
    p(ctx, 8, 7, 16, 2, "#e0b868");
    p(ctx, 12, 18, 2, 2, "#f0d060");
  }
  return canvas;
}

function createRuneDecal() {
  const { canvas, ctx } = makeCanvas(40, 40);
  ctx.translate(20, 20);
  ctx.strokeStyle = "rgba(80, 200, 220, 0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI*2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(120, 220, 240, 0.3)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI*2*i)/8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*10, Math.sin(a)*10);
    ctx.lineTo(Math.cos(a)*16, Math.sin(a)*16);
    ctx.stroke();
  }
  // Inner cross
  ctx.strokeStyle = "rgba(160, 240, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
  ctx.moveTo(0, -8); ctx.lineTo(0, 8);
  ctx.stroke();
  ctx.fillStyle = "rgba(160, 255, 255, 0.4)";
  ctx.fillRect(-3, -3, 6, 6);
  return canvas;
}

function createBrazierSprite() {
  const { canvas, ctx } = makeCanvas(32, 40);
  p(ctx, 10, 26, 12, 8, "#3a2a20"); // base
  p(ctx, 8, 24, 16, 3, "#6a5040"); // bowl rim
  p(ctx, 12, 16, 8, 8, "#201810"); // bowl
  // Fire
  p(ctx, 13, 8, 6, 8, "#f08840");
  p(ctx, 11, 10, 10, 6, "#d04830");
  p(ctx, 14, 4, 4, 6, "#f0d080");
  p(ctx, 15, 2, 2, 3, "#fff8e0");
  // Glow
  p(ctx, 14, 1, 4, 2, "#fff0c0");
  return canvas;
}

function createColumnSprite() {
  const { canvas, ctx } = makeCanvas(32, 44);
  p(ctx, 6, 2, 20, 6, "#5a4e48"); // capital
  p(ctx, 10, 8, 12, 26, "#3a3040"); // shaft
  p(ctx, 6, 34, 20, 6, "#30282e"); // base
  // Shaft highlight
  p(ctx, 12, 8, 4, 26, "#4a4050");
  p(ctx, 18, 8, 2, 26, "#2a2230");
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

/* ── 8-BIT PLAYER (More human-like) ──────────── */
function drawPlayerSprite(ctx, dir, state, frame, flash, comboStep = 0) {
  const bob = state === "walk" ? [0, 1, 0, -1][frame % 4] : state === "attack" ? [0, -2, 2, 0][frame % 4] : 0;
  const facing = bucketDirection(dir);
  const F = flash;

  // Palette
  const C = {
    O: F ? "#886860" : "#0a080c",
    SK: F ? "#f8e8d0" : "#d8b880",
    HA: F ? "#e0c898" : "#503828",
    CL: F ? "#f0d8b0" : "#6a2838",
    TR: F ? "#f0d898" : "#b89858",
    LE: F ? "#e0c8a0" : "#58402c",
    SW: F ? "#e8f0f8" : "#90a8b8",
    SA: F ? "#b0d8d8" : "#38686a",
    EY: F ? "#f8f0e0" : "#f0e8d0",
    SH: F ? "#c8a070" : "#18101a",
    BE: F ? "#d8b888" : "#8a6a42",
    PA: F ? "#e0d0b8" : "#685048",
  };

  const bx = 7, by = 7 + bob;

  // Shadow under feet
  p(ctx, 8, by + 18, 16, 6, "#0c080a");

  // ── OUTLINE ──
  p(ctx, bx, by, 18, 22, C.O);

  // ── LEGS ──
  if (state === "walk") {
    // Walking: alternating legs
    const legOff = frame % 2 === 0 ? 0 : 2;
    p(ctx, bx + 2 + legOff, by + 16, 5, 6, C.LE);
    p(ctx, bx + 11 - legOff, by + 16, 5, 6, C.LE);
  } else {
    p(ctx, bx + 3, by + 16, 5, 6, C.LE);
    p(ctx, bx + 10, by + 16, 5, 6, C.LE);
  }
  // Boots (darker)
  p(ctx, bx + 2, by + 20, 6, 4, C.SH);
  p(ctx, bx + 10, by + 20, 6, 4, C.SH);

  // ── TORSO (Cloak body) ──
  if (facing === DIRECTIONS.UP) {
    // Back view
    p(ctx, bx + 4, by + 4, 10, 12, C.CL);
    // Belt
    p(ctx, bx + 4, by + 13, 10, 3, C.SA);
    // Hood
    p(ctx, bx + 3, by + 1, 12, 7, C.CL);
    p(ctx, bx + 4, by, 10, 4, C.HA);
  } else {
    // Front view - skin face visible
    p(ctx, bx + 2, by + 2, 14, 14, C.CL); // cloak body
    // Face (skin)
    p(ctx, bx + 4, by + 2, 10, 7, C.SK);
    // Hair
    p(ctx, bx + 3, by, 12, 4, C.HA);
    // Eyes
    p(ctx, bx + 5, by + 4, 2, 2, C.EY);
    p(ctx, bx + 11, by + 4, 2, 2, C.EY);
    // Mouth
    p(ctx, bx + 7, by + 7, 4, 1, C.O);

    // Trim on cloak
    p(ctx, bx + 4, by + 9, 10, 2, C.TR);
    // Belt
    p(ctx, bx + 4, by + 12, 10, 3, C.SA);
    // Buckle
    p(ctx, bx + 7, by + 12, 4, 3, C.BE);
  }

  // ── ARMS ──
  if (state === "attack") {
    // Attack: extend arms with weapon
    const swing = [[-6,2,10,14][frame % 4]];
    const s = swing[0];
    if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx - 2 + s, by + 6, 4, 4, C.PA);
      p(ctx, bx - 4 + s, by + 4, 4, 14, C.SW); // blade
      p(ctx, bx - 5 + s, by + 2, 6, 3, "#d0a058"); // crossguard
      p(ctx, bx - 3 + s, by + 16, 4, 4, C.LE); // handle
      // Slash glow
      ctx.fillStyle = "rgba(255, 240, 200, 0.3)";
      ctx.fillRect(bx - 6 + s, by - 2, 10, 6);
    } else if (facing === DIRECTIONS.RIGHT) {
      p(ctx, bx + 14 + s, by + 6, 4, 4, C.PA);
      p(ctx, bx + 16 + s, by + 4, 4, 14, C.SW);
      p(ctx, bx + 15 + s, by + 2, 6, 3, "#d0a058");
      p(ctx, bx + 15 + s, by + 16, 4, 4, C.LE);
      ctx.fillStyle = "rgba(255, 240, 200, 0.3)";
      ctx.fillRect(bx + 12 + s, by - 2, 10, 6);
    } else {
      // DOWN/UP - show weapon diagonally
      p(ctx, bx + 4, by + 6, 4, 4, C.PA);
      p(ctx, bx + 12 + s, by + 2, 4, 12, C.SW);
      p(ctx, bx + 11 + s, by, 6, 3, "#d0a058");
    }
  } else {
    // Idle/walk arms
    p(ctx, bx - 1, by + 6, 3, 8, C.PA);
    p(ctx, bx + 16, by + 6, 3, 8, C.PA);
    // Weapon (held at side)
    if (facing === DIRECTIONS.LEFT) {
      p(ctx, bx - 2, by + 6, 4, 10, C.SW);
      p(ctx, bx - 4, by + 4, 6, 3, "#d0a058");
    } else if (facing === DIRECTIONS.RIGHT) {
      p(ctx, bx + 14, by + 6, 4, 10, C.SW);
      p(ctx, bx + 14, by + 4, 6, 3, "#d0a058");
    } else {
      p(ctx, bx + 13, by + 6, 4, 8, C.SW);
    }
  }
}

/* ── 8-BIT ENEMY ─────────────────────────────── */
function drawEnemySprite(ctx, dir, state, frame, flash, variant = 0, detail = 0) {
  const bob = state === "walk" ? [0, 1, 0, -1][frame % 4] : 0;
  const lunge = state === "attack" ? [-3, 1, 6, 8][frame % 4] : 0;
  const facing = bucketDirection(dir);

  const palettes = [
    { b: "#4a4e5c", t: "#7887a0", g: "#f0684a", e: "#ff5040", h: "#a0a8b8" },
    { b: "#443858", t: "#9078a8", g: "#f0684a", e: "#ff5040", h: "#b8a0c8" },
    { b: "#384e5e", t: "#88a8c0", g: "#f0c080", e: "#f0d090", h: "#b0c0d0" },
    { b: "#583428", t: "#c87848", g: "#f0c080", e: "#f0d090", h: "#d09868" },
    { b: "#48423a", t: "#988858", g: "#f0d8a0", e: "#f0e8b0", h: "#b0a070" },
    { b: "#402a38", t: "#d09868", g: "#f0d8a0", e: "#f0e8b0", h: "#c89878" },
    { b: "#38483a", t: "#70a868", g: "#b0e898", e: "#c0f0a0", h: "#88c078" },
    { b: "#384840", t: "#68a880", g: "#b0e898", e: "#c0f0a0", h: "#80b888" },
    { b: "#482e42", t: "#78b068", g: "#b0e898", e: "#c0f0a0", h: "#88b078" },
    { b: "#504e3a", t: "#b8a058", g: "#f0d8a0", e: "#f0e8b0", h: "#c8b070" },
    { b: "#483828", t: "#e8984a", g: "#f0c080", e: "#f0d090", h: "#d0a060" },
    { b: "#38483a", t: "#88b868", g: "#b0e898", e: "#c0f0a0", h: "#88b078" },
    { b: "#50485a", t: "#b0b8d0", g: "#e8e8c0", e: "#f0e8b0", h: "#c8c8d8" },
    { b: "#543028", t: "#e89848", g: "#f0c080", e: "#f0d090", h: "#d0a060" },
    { b: "#425038", t: "#b0d880", g: "#d0f0a0", e: "#d8f0b0", h: "#a0c880" },
  ];
  const pal = flash
    ? { ...palettes[detail % palettes.length], b: "#e8e0d0", t: "#f8f0e0", g: "#fff8f0", e: "#fff8f0" }
    : palettes[detail % palettes.length];

  const bx = 7, by = 7 + bob;

  // Outline
  p(ctx, bx, by, 18, 22, "#080608");

  // Body
  p(ctx, bx + 2, by + 2, 14, 14, pal.b);
  // Armor/trim
  p(ctx, bx + 4, by + 8, 10, 3, pal.t);

  // Eyes
  const eyeX = facing === DIRECTIONS.LEFT ? bx + 2 : facing === DIRECTIONS.RIGHT ? bx + 12 : bx + 4;
  p(ctx, eyeX, by + 3, 4, 3, pal.e);
  p(ctx, eyeX + 6, by + 3, 4, 3, pal.e);
  p(ctx, eyeX + 1, by + 4, 2, 1, "#000");
  p(ctx, eyeX + 7, by + 4, 2, 1, "#000");

  // Mouth (attack)
  if (state === "attack") {
    p(ctx, bx + 6, by + 9, 6, 2, pal.g);
  }

  // Horns
  if (detail === 2 || detail === 5 || detail === 8 || detail >= 10) {
    p(ctx, bx - 2, by - 1, 5, 4, pal.h);
    p(ctx, bx + 15, by - 1, 5, 4, pal.h);
    // Horn tips
    p(ctx, bx - 1, by - 2, 3, 2, pal.t);
    p(ctx, bx + 16, by - 2, 3, 2, pal.t);
  }

  // Legs
  p(ctx, bx + 2, by + 16, 6, 6, "#1a1418");
  p(ctx, bx + 10, by + 16, 6, 6, "#1a1418");

  // Arms
  p(ctx, bx - 1, by + 6, 3, 6, pal.b);
  p(ctx, bx + 16, by + 6, 3, 6, pal.b);

  // Claws/weapons
  const l = lunge;
  if (facing === DIRECTIONS.LEFT) {
    p(ctx, bx - 4 + l, by + 8, 4, 3, "#d8d0c0");
    p(ctx, bx - 6 + l, by + 12, 6, 2, "#d8d0c0");
  } else if (facing === DIRECTIONS.RIGHT) {
    p(ctx, bx + 18 + l, by + 8, 4, 3, "#d8d0c0");
    p(ctx, bx + 18 + l, by + 12, 6, 2, "#d8d0c0");
  }

  // Crown/helmet (boss)
  if (detail >= 9) {
    p(ctx, bx + 3, by - 2, 12, 4, pal.h);
    p(ctx, bx + 5, by - 4, 8, 3, pal.t);
  }

  // Attack aura
  if (state === "attack") {
    ctx.fillStyle = `${pal.g}33`;
    ctx.fillRect(bx - 2, by - 2, 22, 26);
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
    this.tiles = {
      floor: createFloorTile(0),
      floorAlt: createFloorTile(1),
      floorDetail: createFloorDetailTile(),
      wallTop: createWallTile(),
      wallFace: createWallFaceTile(),
      door: createDoorTile(),
    };
    this.props = {
      chestClosed: createChestSprite(false),
      chestOpen: createChestSprite(true),
      shadow: ellipseShadow(),
      lootShadow: ellipseShadow(20, 10, 0.28),
      rune: createRuneDecal(),
      brazier: createBrazierSprite(),
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

    const { canvas, ctx } = makeCanvas(BASE_SIZE, BASE_SIZE);
    if (kind === "player") {
      drawPlayerSprite(ctx, dir, state, frame, flash, detail);
    } else {
      drawEnemySprite(ctx, dir, state, frame, flash, variant, detail);
    }
    this.spriteCache.set(key, canvas);
    return canvas;
  }
}
import { AssetFactory, ITEM_DEFS } from "./assets.js";
import { AudioController } from "./audio.js";
import { CombatSystem } from "./combat.js";
import { DUNGEON_THEMES, HUB_VENDORS, SKILL_BOOKS } from "./content.js";
import {
  GAME_STATE,
  INVENTORY_SIZE,
  MAX_LOG_ENTRIES,
  STASH_SIZE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "./constants.js";
import { Dungeon } from "./dungeon.js";
import { Enemy } from "./enemy.js";
import { Input } from "./input.js";
import { Player } from "./player.js";
import { UI } from "./ui.js";
import { clamp, distance, lerp, pick } from "./utils.js";

// Render at full viewport size. CSS image-rendering: pixelated handles the crisp pixel look.
const RENDER_W = VIEW_WIDTH;
const RENDER_H = VIEW_HEIGHT;

const GEAR_POOL = ["grave_saber", "ashen_mail", "warden_boots", "moon_charm"];

export class Game {
  constructor(canvas, doc) {
    this.canvas = canvas;
    this.doc = doc;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    // ── Pixel-doubling offscreen canvas ──
    this.offscreen = doc.createElement("canvas");
    this.offscreen.width = RENDER_W;
    this.offscreen.height = RENDER_H;
    this.offscreenCtx = this.offscreen.getContext("2d");
    this.offscreenCtx.imageSmoothingEnabled = false;

    this.skillOrder = ["arcaneBurst", "dashSlash", "ironNova"];

    this.assets = new AssetFactory();
    this.audio = new AudioController();
    this.input = new Input(canvas, doc);
    this.ui = new UI(doc, this);
    this.combat = new CombatSystem(this);

    this.state = GAME_STATE.MENU;
    this.dungeon = null;
    this.player = null;
    this.enemies = [];
    this.chests = [];
    this.loot = [];
    this.projectiles = [];
    this.interactables = [];
    this.inventory = Array(INVENTORY_SIZE).fill(null);
    this.stash = Array(STASH_SIZE).fill(null);
    this.selectedInventoryIndex = null;
    this.quickSlots = [null, null, null, null];
    this.pendingQuickSlot = null;
    this.stashOpen = false;
    this.logEntries = [
      "The torches gutter. Steel up, wanderer.",
      "Press mouse or Space to cut through nearby threats.",
    ];
    this.particles = [];
    this.popups = [];
    this.slashes = [];
    this.decals = [];
    this.nextItemInstanceId = 1;
    this.camera = { x: 0, y: 0, shakeTime: 0, shakeIntensity: 0 };
    this.hitStop = 0;
    this.ambientTime = 0;
    this.runTime = 0;
    this.threatLevel = 1;
    this.totalBossKills = 0;
    this.currentThemeId = "hub";
    this.currentDepth = 0;
    this.areaLabel = "Hub";
    this.currentThemeDescription = "Prepare before descending.";
    this.dungeonDepths = Object.fromEntries(Object.keys(DUNGEON_THEMES).map((id) => [id, 1]));
    this.dungeonCleared = false;
    this.lastTime = 0;
    this.loopStarted = false;
  }

  boot() {
    this.ui.bind();
    this.ui.setMenuIntro();
    this.ui.refresh();
    this.render();
    if (!this.loopStarted) {
      this.loopStarted = true;
      requestAnimationFrame((time) => this.loop(time));
    }
  }

  startGame() {
    this.audio.start();
    this.state = GAME_STATE.RUNNING;
    this.newRun();
    this.addLog("You arrive at Sanctum Crossing, the last safe hall before the depths.");
  }

  restartGame() {
    this.audio.start();
    this.state = GAME_STATE.RUNNING;
    this.newRun();
    this.addLog("A fresh contract begins. The hub stirs around you once more.");
  }

  newRun() {
    this.player = new Player(0, 0);
    this.dungeon = new Dungeon();
    this.enemies = [];
    this.chests = [];
    this.loot = [];
    this.projectiles = [];
    this.inventory = Array(INVENTORY_SIZE).fill(null);
    this.stash = Array(STASH_SIZE).fill(null);
    this.selectedInventoryIndex = null;
    this.quickSlots = [null, null, null, null];
    this.pendingQuickSlot = null;
    this.stashOpen = false;
    this.nextItemInstanceId = 1;
    this.particles = [];
    this.popups = [];
    this.slashes = [];
    this.decals = [];
    this.hitStop = 0;
    this.ambientTime = 0;
    this.runTime = 0;
    this.threatLevel = 1;
    this.totalBossKills = 0;
    this.dungeonDepths = Object.fromEntries(Object.keys(DUNGEON_THEMES).map((id) => [id, 1]));
    this.logEntries = [
      "The outer sanctum hums with portals, steel, and whispered bargains.",
      "Each dungeon grows harsher the longer you survive.",
    ];
    this.seedStartingLoadout();
    this.enterHub();
    this.ui.setMenuIntro();
    this.ui.refresh();
  }

  loop(timestamp) {
    const dt = Math.min(0.033, (timestamp - this.lastTime) / 1000 || 0.016);
    this.lastTime = timestamp;

    if (this.input.consumePressed("KeyP")) {
      if (this.state === GAME_STATE.RUNNING) this.state = GAME_STATE.PAUSED;
      else if (this.state === GAME_STATE.PAUSED) this.state = GAME_STATE.RUNNING;
    }

    if (this.input.consumePressed("KeyB")) {
      this.ui.toggleInventory();
    }

    if (this.input.consumePressed("KeyC")) {
      this.ui.toggleCharacter();
    }

    if (this.input.consumePressed("Tab")) {
      this.ui.toggleWorld();
    }

    if (this.state === GAME_STATE.RUNNING) {
      if (this.player) {
        for (let index = 0; index < this.quickSlots.length; index += 1) {
          if (this.input.consumeQuickSlot(index)) {
            this.useQuickSlot(index);
          }
        }

        this.skillOrder.forEach((skillId) => {
          const skill = this.player.skills[skillId];
          if (skill && this.input.consumeSkill(skill.key)) {
            this.castSkill(skillId);
          }
        });
      }

      if (this.input.consumeInteract()) {
        const context = this.getInteractionContext();
        if (context?.actions?.length === 1) {
          this.handleInteractionAction(context.actions[0].id);
        } else if (context?.actions?.length > 1) {
          this.ui.toggleWorld();
        }
      }

      if (this.hitStop > 0) {
        this.hitStop = Math.max(0, this.hitStop - dt);
        this.updateEffects(dt * 0.35);
        this.updateCamera(dt * 0.25);
      } else {
        this.update(dt);
      }
    }

    this.audio.update();
    this.render();
    this.ui.refresh();
    this.input.endFrame();
    requestAnimationFrame((time) => this.loop(time));
  }

  update(dt) {
    this.ambientTime += dt;
    this.runTime += dt;
    this.threatLevel = 1 + this.runTime / 110 + this.totalBossKills * 0.45;

    this.player.update(dt, this);
    this.enemies.forEach((enemy) => enemy.update(dt, this));
    this.enemies = this.enemies.filter((enemy) => enemy.isAlive);

    this.updateLoot(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.updateCamera(dt);

    if (this.player.isDead) {
      this.state = GAME_STATE.GAME_OVER;
    }
  }

  enterHub() {
    this.currentThemeId = "hub";
    this.currentDepth = 0;
    this.dungeonCleared = false;
    this.dungeon.generate("hub");
    this.enemies = [];
    this.chests = [];
    this.loot = [];
    this.projectiles = [];
    this.interactables = this.buildHubInteractables();
    this.player.x = this.dungeon.startPosition.x;
    this.player.y = this.dungeon.startPosition.y;
    this.camera = { x: this.player.x, y: this.player.y, shakeTime: 0, shakeIntensity: 0 };
    this.areaLabel = "Sanctum Crossing";
    this.currentThemeDescription = "Hub district with portals, forge, quartermaster, archivist, and stash chest.";
    this.stashOpen = false;
  }

  enterDungeon(themeId) {
    const theme = DUNGEON_THEMES[themeId] ?? DUNGEON_THEMES.crypt;
    this.currentThemeId = themeId;
    this.currentDepth = this.dungeonDepths[themeId];
    this.dungeonCleared = false;
    this.stashOpen = false;
    this.dungeon.generate(themeId, this.currentDepth);
    this.player.x = this.dungeon.startPosition.x;
    this.player.y = this.dungeon.startPosition.y;
    this.camera = { x: this.player.x, y: this.player.y, shakeTime: 0, shakeIntensity: 0 };
    this.loot = [];
    this.projectiles = [];
    this.chests = this.dungeon.chests.map((chest) => ({ ...chest }));
    this.enemies = this.dungeon.enemySpawns.map((spawn) => {
      const scale = this.getEnemyScale(themeId, spawn.bossTag === "boss" ? 0.7 : spawn.bossTag === "mini" ? 0.35 : 0);
      return new Enemy(spawn.x, spawn.y, spawn.typeId, scale);
    });
    this.interactables = [
      {
        id: "evac_gate",
        type: "return",
        x: this.dungeon.startPosition.x,
        y: this.dungeon.startPosition.y - 64,
        name: "Evacuation Gate",
        description: "Return to the sanctum if you need to regroup.",
        actions: [{ id: "return_hub", label: "Return to Hub" }],
      },
    ];
    this.areaLabel = `${theme.name} • Depth ${this.currentDepth}`;
    this.currentThemeDescription = theme.description;
    this.addLog(`You enter ${theme.name}. The threat sharpens at depth ${this.currentDepth}.`);
  }

  getEnemyScale(themeId, bonus = 0) {
    const depth = this.dungeonDepths[themeId] ?? 1;
    return 0.92 + depth * 0.24 + this.threatLevel * 0.1 + bonus;
  }

  buildHubInteractables() {
    return [
      {
        id: "portal_crypt",
        type: "portal",
        x: 24.5 * 48,
        y: 15.5 * 48,
        name: DUNGEON_THEMES.crypt.name,
        description: `Descend to depth ${this.dungeonDepths.crypt}. ${DUNGEON_THEMES.crypt.description}`,
        actions: [{ id: "descend_crypt", label: `Enter ${DUNGEON_THEMES.crypt.name}` }],
      },
      {
        id: "portal_forge",
        type: "portal",
        x: 36.5 * 48,
        y: 15.5 * 48,
        name: DUNGEON_THEMES.forge.name,
        description: `Descend to depth ${this.dungeonDepths.forge}. ${DUNGEON_THEMES.forge.description}`,
        actions: [{ id: "descend_forge", label: `Enter ${DUNGEON_THEMES.forge.name}` }],
      },
      {
        id: "portal_grotto",
        type: "portal",
        x: 48.5 * 48,
        y: 15.5 * 48,
        name: DUNGEON_THEMES.grotto.name,
        description: `Descend to depth ${this.dungeonDepths.grotto}. ${DUNGEON_THEMES.grotto.description}`,
        actions: [{ id: "descend_grotto", label: `Enter ${DUNGEON_THEMES.grotto.name}` }],
      },
      {
        id: "shop",
        type: "vendor",
        x: 20.5 * 48,
        y: 27.5 * 48,
        name: HUB_VENDORS.shop.name,
        description: "Stocks potions, maps, and risky gear.",
        actions: HUB_VENDORS.shop.actions,
      },
      {
        id: "forge",
        type: "vendor",
        x: 31.5 * 48,
        y: 27.5 * 48,
        name: HUB_VENDORS.forge.name,
        description: "Upgrades your current weapon and armor using ember.",
        actions: HUB_VENDORS.forge.actions,
      },
      {
        id: "books",
        type: "vendor",
        x: 41.5 * 48,
        y: 27.5 * 48,
        name: HUB_VENDORS.books.name,
        description: "Sells manuals that permanently shape your build.",
        actions: HUB_VENDORS.books.actions,
      },
      {
        id: "stash",
        type: "stash",
        x: 51.5 * 48,
        y: 27.5 * 48,
        name: HUB_VENDORS.stash.name,
        description: "Store spare gear here to swap builds later.",
        actions: HUB_VENDORS.stash.actions,
      },
    ];
  }

  getInteractionContext() {
    if (!this.player) return null;
    let nearest = null;
    let best = Infinity;
    this.interactables.forEach((entry) => {
      const dist = distance(this.player.x, this.player.y, entry.x, entry.y);
      if (dist < 92 && dist < best) {
        nearest = entry;
        best = dist;
      }
    });
    return nearest;
  }

  handleInteractionAction(actionId) {
    if (actionId === "descend_crypt") return this.enterDungeon("crypt");
    if (actionId === "descend_forge") return this.enterDungeon("forge");
    if (actionId === "descend_grotto") return this.enterDungeon("grotto");
    if (actionId === "return_hub") return this.enterHub();
    if (actionId === "open_stash") {
      this.stashOpen = !this.stashOpen;
      this.addLog(this.stashOpen ? "The stash chest creaks open." : "The stash chest closes.");
      return;
    }

    if (actionId === "buy_potion") return this.buyItem("potion", 30);
    if (actionId === "buy_mana_potion") return this.buyItem("mana_potion", 34);
    if (actionId === "buy_fury_tonic") return this.buyItem("fury_tonic", 52);
    if (actionId === "buy_ward_tonic") return this.buyItem("ward_tonic", 52);
    if (actionId === "buy_blade") return this.buyItem("grave_saber", 140);
    if (actionId === "buy_mail") return this.buyItem("ashen_mail", 150);
    if (actionId === "buy_boots") return this.buyItem("warden_boots", 110);
    if (actionId === "buy_charm") return this.buyItem("moon_charm", 180);
    if (actionId === "buy_relic_map") return this.buyItem("key", 55);
    if (actionId === "buy_random_gear") return this.buyRandomGear();
    if (actionId === "upgrade_weapon") return this.upgradeEquipment("weapon", 70, 2);
    if (actionId === "upgrade_armor") return this.upgradeEquipment("armor", 65, 2);
    if (actionId === "buy_book_hunter") return this.buyBook("hunter", 95);
    if (actionId === "buy_book_iron") return this.buyBook("iron", 95);
    if (actionId === "buy_book_breath") return this.buyBook("breath", 95);
  }

  buyItem(itemId, costGold) {
    if (this.player.gold < costGold) {
      this.addLog("Not enough coin.");
      return false;
    }
    const item = this.createItemInstance(itemId);
    if (!this.addItemToInventory(item)) {
      this.addLog("Inventory is full.");
      return false;
    }
    this.player.gold -= costGold;
    this.audio.playLoot();
    this.addLog(`${item.name} purchased.`);
    return true;
  }

  buyRandomGear() {
    if (this.player.gold < 85) {
      this.addLog("Not enough coin.");
      return false;
    }
    const item = this.createItemInstance(pick(GEAR_POOL));
    if (!this.addItemToInventory(item)) {
      this.addLog("Inventory is full.");
      return false;
    }
    this.player.gold -= 85;
    this.audio.playLoot();
    this.addLog(`Quartermaster hands over ${item.name}.`);
    return true;
  }

  buyBook(bookId, costGold) {
    const book = SKILL_BOOKS[bookId];
    if (this.player.gold < costGold) {
      this.addLog("Not enough coin.");
      return false;
    }
    if (!this.player.addPassiveBook(bookId, book.apply)) {
      this.addLog("You already learned that book.");
      return false;
    }
    this.player.gold -= costGold;
    this.player.recalculateDerivedStats();
    this.addLog(`${book.name} studied. ${book.description}`);
    return true;
  }

  upgradeEquipment(slot, costGold, costEmber) {
    const equipped = this.player.equipment[slot];
    if (!equipped) {
      this.addLog(`No ${slot} equipped.`);
      return false;
    }
    if (this.player.gold < costGold) {
      this.addLog("Not enough coin.");
      return false;
    }
    if (this.countInventoryItem("ember") < costEmber) {
      this.addLog("You need more Ember Shards.");
      return false;
    }
    this.player.gold -= costGold;
    this.consumeStackItem("ember", costEmber);
    this.player.upgrades[slot] += 1;
    this.player.recalculateDerivedStats();
    this.addLog(`${equipped.name} upgraded at the forge.`);
    return true;
  }

  countInventoryItem(id) {
    return this.inventory
      .filter((item) => item && item.id === id)
      .reduce((sum, item) => sum + (item.count ?? 1), 0);
  }

  consumeStackItem(id, amount) {
    let remaining = amount;
    for (let index = 0; index < this.inventory.length && remaining > 0; index += 1) {
      const item = this.inventory[index];
      if (!item || item.id !== id) continue;
      const used = Math.min(item.count ?? 1, remaining);
      item.count -= used;
      remaining -= used;
      if (item.count <= 0) this.inventory[index] = null;
    }
  }

  updateLoot(dt) {
    this.loot.forEach((drop) => {
      drop.bob += dt * 2.4;
      drop.cooldown = Math.max(0, (drop.cooldown ?? 0) - dt);
      if ((drop.cooldown ?? 0) <= 0 && distance(drop.x, drop.y, this.player.x, this.player.y) < 28) {
        drop.collected = this.collectLoot(drop);
      }
    });
    this.loot = this.loot.filter((drop) => !drop.collected);
  }

  updateProjectiles(dt) {
    this.projectiles.forEach((projectile) => {
      projectile.life -= dt;
      projectile.x += Math.cos(projectile.angle) * projectile.speed * dt;
      projectile.y += Math.sin(projectile.angle) * projectile.speed * dt;

      if (this.dungeon.collidesCircle(projectile.x, projectile.y, projectile.size)) {
        projectile.life = 0;
      } else if (
        projectile.owner !== "player" &&
        distance(projectile.x, projectile.y, this.player.x, this.player.y) < this.player.radius + projectile.size
      ) {
        this.player.takeDamage(projectile.damage, this, projectile.angle);
        this.addParticles(projectile.x, projectile.y, projectile.color, 10, 70);
        projectile.life = 0;
      } else if (projectile.owner === "player") {
        const hitEnemy = this.enemies.find(
          (enemy) => enemy.isAlive && distance(projectile.x, projectile.y, enemy.x, enemy.y) < enemy.radius + projectile.size + 2
        );
        if (hitEnemy) {
          hitEnemy.takeDamage(projectile.damage, this, projectile.angle, 22, false);
          this.addParticles(projectile.x, projectile.y, projectile.color, 10, 70);
          projectile.life = 0;
        }
      }
    });
    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0);
  }

  updateEffects(dt) {
    this.particles.forEach((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 80 * dt;
    });
    this.particles = this.particles.filter((particle) => particle.life > 0);

    this.popups.forEach((popup) => {
      popup.life -= dt;
      popup.y -= 34 * dt;
    });
    this.popups = this.popups.filter((popup) => popup.life > 0);

    this.slashes.forEach((slash) => {
      slash.life -= dt;
    });
    this.slashes = this.slashes.filter((slash) => slash.life > 0);

    this.decals.forEach((decal) => {
      decal.life -= dt;
    });
    this.decals = this.decals.filter((decal) => decal.life > 0);

    this.camera.shakeTime = Math.max(0, this.camera.shakeTime - dt);
    this.camera.shakeIntensity = Math.max(0, this.camera.shakeIntensity - dt * 22);
  }

  updateCamera(dt) {
    this.camera.x = lerp(this.camera.x, this.player.x, 1 - Math.pow(0.001, dt));
    this.camera.y = lerp(this.camera.y, this.player.y, 1 - Math.pow(0.001, dt));
  }

  /* ── RENDER: Direct to canvas with pixelated rendering ── */
  render() {
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    if (!this.dungeon || !this.player) {
      this.renderMenuBackdrop();
      return;
    }

    // Shake
    const shakeX = this.camera.shakeTime > 0 ? (Math.random() - 0.5) * this.camera.shakeIntensity : 0;
    const shakeY = this.camera.shakeTime > 0 ? (Math.random() - 0.5) * this.camera.shakeIntensity : 0;
    const renderCamera = { x: this.camera.x - shakeX, y: this.camera.y - shakeY };

    // ── RENDER DUNGEON ──
    this.dungeon.render(ctx, renderCamera, this.assets, VIEW_WIDTH, VIEW_HEIGHT);

    // ── RENDER WORLD ──
    this.renderWorld(ctx, renderCamera);

    // ── RENDER LIGHTING ──
    this.renderLighting(ctx, renderCamera);
  }

  renderMenuBackdrop() {
    const ctx = this.ctx;
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = i % 2 ? "rgba(255, 153, 87, 0.06)" : "rgba(122, 90, 66, 0.07)";
      ctx.beginPath();
      ctx.arc(70 + i * 75, 90 + (i % 2) * 60, 50 + i * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255, 223, 178, 0.09)";
    ctx.fillRect(120, 60, 400, 240);
  }

  renderWorld(ctx, camera) {
    const drawables = [];

    this.dungeon.props.forEach((prop) => {
      drawables.push({
        y: prop.y,
        render: () => {
          const sx = prop.x - camera.x + RENDER_W / 2;
          const sy = prop.y - camera.y + RENDER_H / 2;
          if (prop.type === "rune") {
            const pulse = 1 + Math.sin(this.ambientTime * 2.1 + prop.phase) * 0.08;
            ctx.globalAlpha = 0.38 + Math.sin(this.ambientTime * 2.4 + prop.phase) * 0.14;
            ctx.drawImage(this.assets.props.rune, sx - 20 * pulse, sy - 20 * pulse, 40 * pulse, 40 * pulse);
            ctx.globalAlpha = 1;
          }
          if (prop.type === "brazier") {
            ctx.drawImage(this.assets.props.shadow, sx - 14, sy + 6, 28, 12);
            ctx.drawImage(this.assets.props.brazier, sx - 16, sy - 20, 32, 40);
          }
          if (prop.type === "column") {
            ctx.drawImage(this.assets.props.shadow, sx - 16, sy + 8, 32, 12);
            ctx.drawImage(this.assets.props.column, sx - 16, sy - 22, 32, 44);
          }
          if (prop.type === "tomb") {
            ctx.drawImage(this.assets.props.shadow, sx - 14, sy + 8, 28, 10);
            ctx.drawImage(this.assets.props.tomb, sx - 16, sy - 20, 32, 40);
          }
          if (prop.type === "lavaVent") {
            ctx.globalAlpha = 0.25 + Math.sin(this.ambientTime * 7 + sx * 0.01) * 0.08;
            ctx.drawImage(this.assets.props.lavaVent, sx - 16, sy - 16, 32, 32);
            ctx.globalAlpha = 1;
          }
          if (prop.type === "mushrooms") {
            ctx.drawImage(this.assets.props.shadow, sx - 13, sy + 8, 26, 10);
            ctx.drawImage(this.assets.props.mushrooms, sx - 16, sy - 16, 32, 32);
          }
          if (prop.type === "shrine") {
            ctx.drawImage(this.assets.props.shadow, sx - 16, sy + 8, 32, 12);
            ctx.drawImage(this.assets.props.shrine, sx - 16, sy - 20, 32, 40);
          }
        },
      });
    });

    this.interactables.forEach((entry) => {
      drawables.push({
        y: entry.y,
        render: () => this.renderInteractable(ctx, camera, entry),
      });
    });

    this.chests.forEach((chest) => {
      drawables.push({
        y: chest.y,
        render: () => {
          const sx = chest.x - camera.x + RENDER_W / 2;
          const sy = chest.y - camera.y + RENDER_H / 2;
          ctx.drawImage(this.assets.props.shadow, sx - 16, sy + 6, 32, 12);
          ctx.drawImage(
            chest.opened ? this.assets.props.chestOpen : this.assets.props.chestClosed,
            sx - 16,
            sy - 16,
            32,
            32
          );
        },
      });
    });

    this.loot.forEach((drop) => {
      drawables.push({
        y: drop.y,
        render: () => {
          const sx = drop.x - camera.x + RENDER_W / 2;
          const sy = drop.y - camera.y + RENDER_H / 2 + Math.sin(drop.bob) * 3;
          const icon = this.assets.itemIcons[drop.id];
          ctx.drawImage(this.assets.props.lootShadow, sx - 10, sy + 6, 20, 10);
          ctx.globalAlpha = 0.24;
          ctx.fillStyle =
            drop.id === "relic"
              ? "#8ce7eb"
              : drop.id === "ember"
                ? "#ff9f58"
                : drop.id === "gold_coin"
                  ? "#f2d18a"
                  : "#ffd29b";
          ctx.beginPath();
          ctx.arc(sx, sy - 6, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.85;
          if (icon) {
            ctx.drawImage(icon.canvas, sx - 12, sy - 16, 24, 24);
            ctx.globalAlpha = 1;
          }
        },
      });
    });

    this.decals.forEach((decal) => {
      drawables.push({
        y: decal.y - 1, // draw beneath player and props
        render: () => {
          const sx = decal.x - camera.x + RENDER_W / 2;
          const sy = decal.y - camera.y + RENDER_H / 2;
          ctx.globalAlpha = Math.min(1, decal.life); // fade out at the end
          ctx.fillStyle = "rgba(20, 15, 10, 0.6)";
          ctx.beginPath();
          ctx.ellipse(sx, sy, decal.radius, decal.radius * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = "rgba(255, 100, 30, 0.4)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx - decal.radius*0.5, sy);
          ctx.lineTo(sx + decal.radius*0.5, sy);
          ctx.moveTo(sx, sy - decal.radius*0.2);
          ctx.lineTo(sx, sy + decal.radius*0.2);
          ctx.stroke();
          
          ctx.globalAlpha = 1;
        }
      });
    });

    this.enemies.forEach((enemy) => {
      drawables.push({
        y: enemy.y,
        render: () => enemy.render(ctx, camera, this.assets, RENDER_W, RENDER_H),
      });
    });

    drawables.push({
      y: this.player.y,
      render: () => this.player.render(ctx, camera, this.assets, RENDER_W, RENDER_H),
    });

    drawables.sort((a, b) => a.y - b.y).forEach((entry) => entry.render());

    this.renderAttackTelegraph(ctx, camera);
    this.renderProjectiles(ctx, camera);
    this.renderSlashes(ctx, camera);
    this.renderParticles(ctx, camera);
    this.renderPopups(ctx, camera);
  }

  renderInteractable(ctx, camera, entry) {
    const sx = entry.x - camera.x + RENDER_W / 2;
    const sy = entry.y - camera.y + RENDER_H / 2;
    const isNear = this.getInteractionContext()?.id === entry.id;

    if (entry.type === "portal") {
      ctx.drawImage(this.assets.props.shadow, sx - 20, sy + 12, 40, 14);
      ctx.drawImage(this.assets.props.portalArch, sx - 24, sy - 32, 48, 64);
      ctx.globalAlpha = 0.42 + Math.sin(this.ambientTime * 3 + sx * 0.01) * 0.12;
      ctx.drawImage(this.assets.props.rune, sx - 20, sy - 20, 40, 40);
      ctx.globalAlpha = 1;
    } else if (entry.type === "stash") {
      ctx.drawImage(this.assets.props.shadow, sx - 17, sy + 6, 34, 14);
      ctx.drawImage(this.assets.props.stash, sx - 20, sy - 24, 40, 48);
    } else {
      ctx.drawImage(this.assets.props.shadow, sx - 18, sy + 8, 36, 14);
      if (entry.id === "shop") {
        ctx.drawImage(this.assets.props.shop, sx - 20, sy - 24, 40, 48);
      } else if (entry.id === "forge") {
        ctx.drawImage(this.assets.props.forge, sx - 20, sy - 24, 40, 48);
      } else if (entry.id === "books") {
        ctx.drawImage(this.assets.props.archivist, sx - 20, sy - 24, 40, 48);
      } else {
        ctx.drawImage(this.assets.props.shrine, sx - 16, sy - 20, 32, 40);
      }
    }

    if (isNear) {
      ctx.fillStyle = "rgba(255, 221, 160, 0.9)";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("E", sx, sy - 36);
      ctx.fillStyle = "rgba(245, 231, 207, 0.92)";
      ctx.fillText(entry.name, sx, sy - 46);
    }
  }

  renderAttackTelegraph(ctx, camera) {
    if (!this.player.attackProfile || this.player.attackPhase === "idle") return;
    const sx = this.player.x - camera.x + RENDER_W / 2;
    const sy = this.player.y - camera.y + RENDER_H / 2;
    const radius = this.player.attackProfile.range * 0.85;
    const arc = this.player.attackProfile.arc;
    const alpha = this.player.attackPhase === "windup" ? 0.12 : this.player.attackPhase === "active" ? 0.2 : 0.08;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.player.facingAngle);
    ctx.fillStyle = `rgba(255, 187, 108, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -arc / 2, arc / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderProjectiles(ctx, camera) {
    this.projectiles.forEach((projectile) => {
      const sx = projectile.x - camera.x + RENDER_W / 2;
      const sy = projectile.y - camera.y + RENDER_H / 2;
      ctx.globalAlpha = projectile.life / projectile.maxLife;
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.arc(sx, sy, projectile.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.25 * (projectile.life / projectile.maxLife);
      ctx.beginPath();
      ctx.arc(sx, sy, projectile.size * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  renderSlashes(ctx, camera) {
    this.slashes.forEach((slash) => {
      const frameIndex = clamp(Math.floor((1 - slash.life / slash.maxLife) * 4), 0, 3);
      const image = this.assets.props.slash[frameIndex];
      const sx = slash.x - camera.x + RENDER_W / 2;
      const sy = slash.y - camera.y + RENDER_H / 2;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(slash.angle + slash.comboStep * 0.08);
      ctx.globalAlpha = (slash.life / slash.maxLife) * 0.95;
      // Draw slash at native 80x80 (with scale)
      ctx.drawImage(image, -40 * slash.scale, -40 * slash.scale, 80 * slash.scale, 80 * slash.scale);
      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }

  renderParticles(ctx, camera) {
    this.particles.forEach((particle) => {
      const sx = particle.x - camera.x + RENDER_W / 2;
      const sy = particle.y - camera.y + RENDER_H / 2;
      ctx.globalAlpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.fillRect(sx, sy, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;
  }

  renderPopups(ctx, camera) {
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    this.popups.forEach((popup) => {
      const sx = popup.x - camera.x + RENDER_W / 2;
      const sy = popup.y - camera.y + RENDER_H / 2;
      ctx.globalAlpha = popup.life / popup.maxLife;
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillText(popup.text, sx + 1, sy + 1);
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, sx, sy);
    });
    ctx.globalAlpha = 1;
  }

  renderLighting(ctx, camera) {
    if (this.currentThemeId === "hub") {
      const ambient = ctx.createLinearGradient(0, 0, 0, RENDER_H);
      ambient.addColorStop(0, "rgba(255, 220, 170, 0.18)");
      ambient.addColorStop(0.55, "rgba(245, 206, 150, 0.08)");
      ambient.addColorStop(1, "rgba(18, 18, 22, 0.18)");
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    }

    const px = this.player.x - camera.x + RENDER_W / 2;
    const py = this.player.y - camera.y + RENDER_H / 2;

    this.dungeon.props.forEach((prop) => {
      if (prop.type !== "brazier" && prop.type !== "rune") return;
      const sx = prop.x - camera.x + RENDER_W / 2;
      const sy = prop.y - camera.y + RENDER_H / 2;
      const color =
        prop.type === "brazier"
          ? `rgba(255, 140, 78, ${0.16 + Math.sin(this.ambientTime * 8 + prop.phase) * 0.03})`
          : prop.type === "shrine"
            ? "rgba(255, 236, 170, 0.1)"
            : this.dungeon.theme?.glow ?? "rgba(102, 220, 226, 0.12)";
      const radius = prop.type === "brazier" ? 80 : prop.type === "shrine" ? 70 : 60;
      const glow = ctx.createRadialGradient(sx, sy - 10, 6, sx, sy - 10, radius);
      glow.addColorStop(0, color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    });

    this.interactables.forEach((entry) => {
      const sx = entry.x - camera.x + RENDER_W / 2;
      const sy = entry.y - camera.y + RENDER_H / 2;
      const glow = ctx.createRadialGradient(sx, sy, 6, sx, sy, 56);
      const color =
        entry.type === "portal"
          ? this.currentThemeId === "hub"
            ? "rgba(133, 221, 232, 0.14)"
            : "rgba(245, 201, 122, 0.08)"
          : entry.id === "shop"
            ? "rgba(214, 121, 121, 0.12)"
            : entry.id === "forge"
              ? "rgba(255, 144, 79, 0.12)"
              : entry.id === "books"
                ? "rgba(114, 168, 219, 0.12)"
                : "rgba(255, 182, 98, 0.08)";
      glow.addColorStop(0, color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 56, sy - 56, 112, 112);
    });

    this.loot.forEach((drop) => {
      const sx = drop.x - camera.x + RENDER_W / 2;
      const sy = drop.y - camera.y + RENDER_H / 2;
      const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 38);
      glow.addColorStop(0, drop.id === "relic" ? "rgba(123, 235, 242, 0.14)" : "rgba(255, 176, 93, 0.08)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 38, sy - 38, 76, 76);
    });

    if (this.currentThemeId !== "hub") {
      const light = ctx.createRadialGradient(px, py, 40, px, py, 260);
      light.addColorStop(0, "rgba(255, 210, 145, 0)");
      light.addColorStop(0.55, "rgba(12, 10, 16, 0.35)");
      light.addColorStop(1, "rgba(2, 2, 4, 0.88)");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    } else {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    }

    if (this.currentThemeId !== "hub") {
      const vignette = ctx.createRadialGradient(
        RENDER_W / 2,
        RENDER_H / 2,
        120,
        RENDER_W / 2,
        RENDER_H / 2,
        360
      );
      vignette.addColorStop(0.55, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.52)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    }
  }

  screenToWorld(screenX, screenY) {
    // Direct conversion since we render at full viewport size
    return {
      x: screenX + this.camera.x - RENDER_W / 2,
      y: screenY + this.camera.y - RENDER_H / 2,
    };
  }

  addScreenShake(intensity, duration) {
    this.camera.shakeIntensity = Math.max(this.camera.shakeIntensity, intensity);
    this.camera.shakeTime = Math.max(this.camera.shakeTime, duration);
  }

  addParticles(x, y, color, amount, speed) {
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 20,
        color,
        size: Math.random() > 0.5 ? 4 : 3,
        life: 0.32 + Math.random() * 0.18,
        maxLife: 0.48,
      });
    }
  }

  addPopup(x, y, text, color) {
    this.popups.push({ x, y, text, color, life: 0.65, maxLife: 0.65 });
  }

  addSlash(x, y, angle, scale = 1, comboStep = 0) {
    this.slashes.push({ x, y, angle, scale, comboStep, life: 0.22, maxLife: 0.22 });
  }

  addHitStop(duration) {
    this.hitStop = Math.max(this.hitStop, duration);
  }

  addDecal(x, y, radius, life = 5) {
    this.decals.push({ x, y, radius, life, maxLife: life });
  }

  addLog(text) {
    this.logEntries.unshift(text);
    this.logEntries = this.logEntries.slice(0, MAX_LOG_ENTRIES);
  }

  seedStartingLoadout() {
    this.player.equipment.weapon = this.createItemInstance("starter_blade");
    this.player.equipment.armor = this.createItemInstance("scout_mail");
    this.player.recalculateDerivedStats();
    this.player.hp = this.player.maxHp;
    this.player.mana = this.player.maxMana;
    this.player.stamina = this.player.maxStamina;
    this.addItemToInventory(this.createItemInstance("potion"));
    this.addItemToInventory(this.createItemInstance("potion"));
    this.addItemToInventory(this.createItemInstance("mana_potion"));
    this.addItemToInventory(this.createItemInstance("fury_tonic"));
    this.addItemToInventory(this.createItemInstance("ward_tonic"));
    this.addItemToInventory(this.createItemInstance("warden_boots"));
    this.quickSlots = ["potion", "mana_potion", "fury_tonic", "ward_tonic"];
  }

  openChest(chest) {
    if (chest.opened) return;
    chest.opened = true;
    this.spawnLoot(chest.x, chest.y - 12, true);
    if (Math.random() > 0.35) this.spawnLoot(chest.x + 8, chest.y + 4, false);
    if (Math.random() > 0.5) this.spawnLoot(chest.x - 10, chest.y + 2, true);
    this.player.gold += 16 + Math.floor(this.threatLevel * 4);
    this.audio.playLoot();
    this.addParticles(chest.x, chest.y - 10, "#ffcb7f", 16, 80);
    this.addLog("A chest cracks open and spills relics and coin.");
  }

  spawnLoot(x, y, bonus = false, sourceId = null) {
    const bias = this.currentThemeId !== "hub" ? DUNGEON_THEMES[this.currentThemeId]?.lootBias ?? [] : [];
    const baseTable = bonus
      ? ["potion", "mana_potion", "fury_tonic", "ward_tonic", "ember", "key", "relic", ...bias]
      : ["potion", "mana_potion", "ember", "potion", "fang", "key"];
    if (sourceId && (sourceId.includes("boss") || sourceId.includes("lord") || sourceId.includes("heart") || sourceId.includes("colossus"))) {
      baseTable.push("grave_saber", "ashen_mail", "warden_boots", "moon_charm");
    }
    const id = pick(baseTable);
    this.loot.push({
      x,
      y,
      id,
      bob: Math.random() * Math.PI * 2,
      collected: false,
      cooldown: 0.2,
    });
  }

  spawnEnemyProjectile({ x, y, angle, speed, damage, color, size, owner }) {
    this.projectiles.push({
      x,
      y,
      angle,
      speed,
      damage,
      color,
      size,
      owner,
      life: 2.4,
      maxLife: 2.4,
    });
  }

  collectLoot(drop) {
    if (drop.id === "gold_coin") {
      this.player.gold += 18 + Math.floor(this.threatLevel * 3);
      this.audio.playLoot();
      this.addLog(`Scavenge ${Math.floor(this.threatLevel * 3) + 18} gold coins.`);
      return true;
    }
    if (drop.id === "ember") {
      if (this.addItemToInventory(this.createItemInstance("ember"))) {
        this.audio.playLoot();
        this.addLog("An Ember Shard pulses with residual furnace heat.");
        return true;
      }
      return false;
    }
    if (drop.id === "key") {
      if (this.addItemToInventory(this.createItemInstance("key"))) {
        this.audio.playLoot();
        this.addLog("A Rust Key added to your pack.");
        return true;
      }
      return false;
    }
    if (drop.id === "relic") {
      if (this.addItemToInventory(this.createItemInstance("relic"))) {
        this.audio.playLoot();
        this.addLog("A Moon Relic glimmers with faint lunar script.");
        return true;
      }
      return false;
    }
    if (drop.id === "potion" || drop.id === "mana_potion" || drop.id === "fury_tonic" || drop.id === "ward_tonic" || drop.id === "fang") {
      if (this.addItemToInventory(this.createItemInstance(drop.id))) {
        this.audio.playLoot();
        this.addLog(`${ITEM_DEFS[drop.id].name} stowed away.`);
        return true;
      }
      return false;
    }
    if (ITEM_DEFS[drop.id]?.kind === "equipment") {
      if (this.addItemToInventory(this.createItemInstance(drop.id))) {
        this.audio.playLoot();
        this.addLog(`${ITEM_DEFS[drop.id].name} added to inventory.`);
        return true;
      }
      return false;
    }
    return false;
  }

  createItemInstance(id) {
    const def = ITEM_DEFS[id];
    if (!def) return null;
    const instance = { ...def, instanceId: this.nextItemInstanceId++, count: 1 };
    return instance;
  }

  createItemInstanceForStackable(id) {
    const instance = this.createItemInstance(id);
    if (instance) instance.count = 1;
    return instance;
  }

  addItemToInventory(item) {
    if (!item) return false;
    if (item.stackable) {
      const existing = this.inventory.find((entry) => entry && entry.id === item.id);
      if (existing) {
        existing.count = (existing.count ?? 1) + 1;
        return true;
      }
    }
    const empty = this.inventory.indexOf(null);
    if (empty === -1) return false;
    this.inventory[empty] = item;
    return true;
  }

  useInventorySlot(index) {
    if (this.stashOpen) {
      this.transferToStashSlot(index);
      return;
    }

    if (this.pendingQuickSlot !== null) {
      const item = this.inventory[index];
      if (item && item.kind === "consumable") {
        this.quickSlots[this.pendingQuickSlot] = item.id;
        this.pendingQuickSlot = null;
        this.addLog(`Assigned to slot ${this.pendingQuickSlot + 1}.`);
      } else {
        this.addLog("Only consumables can be assigned to the quickbar.");
      }
      return;
    }

    const item = this.inventory[index];
    if (!item) return;
    if (item.kind === "equipment") {
      this.equipItem(index);
    } else if (item.kind === "consumable") {
      this.consumeItem(index);
    }
    this.ui.refresh();
  }

  useQuickSlot(index) {
    const itemId = this.quickSlots[index];
    if (!itemId) return;
    const itemIndex = this.inventory.findIndex((entry) => entry && entry.id === itemId);
    if (itemIndex === -1) {
      this.addLog("That slot is empty.");
      return;
    }
    this.consumeItem(itemIndex);
  }

  consumeItem(index) {
    const item = this.inventory[index];
    if (!item || item.kind !== "consumable") return;

    if (item.heal) {
      const healed = Math.min(item.heal, this.player.maxHp - this.player.hp);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.heal);
      this.addParticles(this.player.x, this.player.y - 10, "#ffa8a8", 8, 50);
      this.audio.playLoot();
      this.addLog(`${item.name} restores ${healed} HP.`);
    }
    if (item.manaRestore) {
      this.player.mana = Math.min(this.player.maxMana, this.player.mana + item.manaRestore);
      this.addParticles(this.player.x, this.player.y - 10, "#8ec8f0", 8, 50);
      this.addLog(`${item.name} refuels ${item.manaRestore} mana.`);
    }
    if (item.buff) {
      this.player.buffs[item.buff] = (this.player.buffs[item.buff] ?? 0) + (item.duration ?? 10);
      this.addLog(`${item.name} active for ${item.duration ?? 10}s.`);
    }
    this.consumeInventoryItem(index);
  }

  toggleQuickAssign(index) {
    if (this.pendingQuickSlot === index) {
      this.pendingQuickSlot = null;
    } else {
      this.pendingQuickSlot = index;
    }
  }

  equipItem(index) {
    const item = this.inventory[index];
    if (!item || item.kind !== "equipment") return;
    const slot = item.slot;
    if (!slot) return;

    const current = this.player.equipment[slot];
    this.player.equipment[slot] = item;
    this.inventory[index] = current;

    if (current) {
      this.addLog(`${item.name} equipped. ${current.name} moved to inventory.`);
    } else {
      this.addLog(`${item.name} equipped.`);
    }
    this.player.recalculateDerivedStats();
  }

  unequip(slot) {
    const item = this.player.equipment[slot];
    if (!item) return;
    if (!this.addItemToInventory(item)) {
      this.addLog("Can't unequip — inventory is full.");
      return;
    }
    this.player.equipment[slot] = null;
    this.player.recalculateDerivedStats();
    this.addLog(`${item.name} stowed.`);
  }

  transferToStashSlot(invIndex) {
    const item = this.inventory[invIndex];
    if (!item) return;
    const empty = this.stash.indexOf(null);
    if (empty === -1) {
      this.addLog("Stash is full.");
      return;
    }
    this.stash[empty] = item;
    this.inventory[invIndex] = null;
    this.addLog(`${item.name} sent to stash.`);
  }

  transferStashSlot(stashIndex) {
    const item = this.stash[stashIndex];
    if (!item) return;
    if (!this.addItemToInventory(item)) {
      this.addLog("Inventory is full.");
      return;
    }
    this.stash[stashIndex] = null;
    this.addLog(`${item.name} retrieved from stash.`);
  }

  allocateSkillPoint(stat) {
    if (this.player.spendSkillPoint(stat)) {
      this.addLog(`Raised ${stat} to ${this.player.baseStats[stat]}.`);
    }
  }

  activateSelectedInventoryItem() {
    if (this.selectedInventoryIndex === null) return;
    this.useInventorySlot(this.selectedInventoryIndex);
  }

  dropSelectedInventoryItem() {
    if (this.selectedInventoryIndex === null) return;
    const item = this.inventory[this.selectedInventoryIndex];
    if (!item) return;
    this.inventory[this.selectedInventoryIndex] = null;
    this.selectedInventoryIndex = null;
    this.addLog(`${item.name} discarded into the dark.`);
    this.ui.refresh();
  }

  onEnemyDefeated(enemy) {
    this.player.gainExperience(enemy.xpValue, this);
    this.player.gold += enemy.goldValue;
    this.audio.playLoot();
    this.addLog(`${enemy.name} defeated. +${enemy.xpValue} XP, +${enemy.goldValue}g`);
  }

  castSkill(skillId) {
    if (!this.player || this.player.isDead) return;
    if (this.player.attackPhase !== "idle") return;

    if (skillId === "arcaneBurst" && this.player.canUseSkill("arcaneBurst")) {
      this.combat.castArcaneBurst(this.player, this);
    } else if (skillId === "dashSlash" && this.player.canUseSkill("dashSlash")) {
      this.combat.castDashSlash(this.player, this);
    } else if (skillId === "ironNova" && this.player.canUseSkill("ironNova")) {
      this.combat.castIronNova(this.player, this);
    }
  }

  consumeInventoryItem(index) {
    const item = this.inventory[index];
    if (!item) return;
    if (item.stackable && item.count > 1) {
      item.count -= 1;
    } else {
      this.inventory[index] = null;
    }
    if (this.selectedInventoryIndex === index) {
      this.selectedInventoryIndex = null;
    }
  }
}
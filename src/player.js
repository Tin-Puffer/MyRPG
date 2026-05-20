import { CORE_STATS, DIRECTIONS, EQUIPMENT_SLOTS } from "./constants.js";
import { angleBetween, clamp, distance, normalize } from "./utils.js";

const ATTACK_PROFILES = [
  {
    name: "Crescent Cut",
    windup: 0.05,
    active: 0.1,
    recovery: 0.14,
    range: 76,
    arc: 1.08,
    damageMin: 16,
    damageMax: 24,
    knockback: 18,
    lunge: 90,
    staminaCost: 14,
    slashScale: 1,
  },
  {
    name: "Cross Slash",
    windup: 0.045,
    active: 0.12,
    recovery: 0.16,
    range: 86,
    arc: 1.24,
    damageMin: 20,
    damageMax: 28,
    knockback: 28,
    lunge: 118,
    staminaCost: 16,
    slashScale: 1.1,
  },
  {
    name: "Execution Sweep",
    windup: 0.075,
    active: 0.16,
    recovery: 0.2,
    range: 98,
    arc: 1.56,
    damageMin: 28,
    damageMax: 38,
    knockback: 40,
    lunge: 144,
    staminaCost: 22,
    slashScale: 1.26,
    critChance: 0.22,
  },
];

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.hurtTimer = 0;
    this.invulnTimer = 0;
    this.walkCycle = 0;
    this.idleCycle = 0;
    this.facingAngle = Math.PI / 2;
    this.direction = DIRECTIONS.DOWN;
    this.isMoving = false;
    this.isDead = false;
    this.attackPhase = "idle";
    this.attackElapsed = 0;
    this.attackProfile = null;
    this.attackStep = 0;
    this.comboExpire = 0;
    this.queuedAttack = false;
    this.attackResolved = false;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.attackCooldown = 0;
    this.attackFacingLocked = null;
    this.lastMove = { x: 0, y: 1 };
    this.buffs = {
      fury: 0,
      ward: 0,
    };
    this.debuffs = {
      poison: 0,
      burn: 0,
      slow: 0,
      stun: 0,
    };
    this.debuffPower = {
      poison: 0,
      burn: 0,
      slow: 0,
    };
    this.debuffTicks = {
      poison: 0.6,
      burn: 0.45,
    };
    this.skills = {
      arcaneBurst: { key: "KeyU", name: "Arcane Burst", manaCost: 26, cooldown: 4.5, current: 0 },
      dashSlash: { key: "KeyI", name: "Dash Slash", manaCost: 18, cooldown: 3.2, current: 0 },
      ironNova: { key: "KeyO", name: "Iron Nova", manaCost: 32, cooldown: 7.5, current: 0 },
    };

    this.level = 1;
    this.xp = 0;
    this.skillPoints = 0;
    this.gold = 120;
    this.passiveBooks = [];
    this.passiveBonuses = {
      damage: 0,
      attackSpeed: 0,
      crit: 0,
      armor: 0,
      hp: 0,
      mana: 0,
      stamina: 0,
      staminaRegen: 0,
      speed: 0,
      reach: 0,
    };
    this.upgrades = {
      weapon: 0,
      armor: 0,
    };
    this.baseStats = {
      strength: 5,
      dexterity: 5,
      vitality: 5,
      spirit: 5,
    };
    this.equipment = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null]));

    this.maxHp = 120;
    this.hp = 120;
    this.maxMana = 80;
    this.mana = 80;
    this.maxStamina = 100;
    this.stamina = 100;
    this.speed = 220;
    this.manaRegen = 9;
    this.staminaRegen = 22;
    this.damageBonus = 0;
    this.critChance = 0.05;
    this.attackSpeed = 1;
    this.armor = 0;
    this.reachBonus = 0;
    this.recalculateDerivedStats();
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
  }

  get xpToNext() {
    return 60 + (this.level - 1) * 45 + Math.floor((this.level - 1) * (this.level - 1) * 12);
  }

  getEquipmentBonuses() {
    const bonuses = {
      strength: 0,
      dexterity: 0,
      vitality: 0,
      spirit: 0,
      damage: 0,
      attackSpeed: 0,
      crit: 0,
      armor: 0,
      hp: 0,
      mana: 0,
      stamina: 0,
      speed: 0,
      staminaRegen: 0,
      reach: 0,
    };

    Object.values(this.equipment).forEach((item) => {
      if (!item?.bonuses) return;
      Object.entries(item.bonuses).forEach(([key, value]) => {
        bonuses[key] = (bonuses[key] ?? 0) + value;
      });
    });

    return bonuses;
  }

  recalculateDerivedStats() {
    const gear = this.getEquipmentBonuses();
    const weaponUpgrade = this.upgrades.weapon * 4;
    const armorUpgrade = this.upgrades.armor * 3;
    this.totalStats = {
      strength: this.baseStats.strength + gear.strength,
      dexterity: this.baseStats.dexterity + gear.dexterity,
      vitality: this.baseStats.vitality + gear.vitality,
      spirit: this.baseStats.spirit + gear.spirit,
    };

    const previousHpRatio = this.maxHp ? this.hp / this.maxHp : 1;
    const previousManaRatio = this.maxMana ? this.mana / this.maxMana : 1;
    const previousStaminaRatio = this.maxStamina ? this.stamina / this.maxStamina : 1;

    this.maxHp = 70 + this.totalStats.vitality * 16 + gear.hp + this.passiveBonuses.hp + this.upgrades.armor * 10;
    this.maxMana = 40 + this.totalStats.spirit * 14 + gear.mana + this.passiveBonuses.mana;
    this.maxStamina = 60 + this.totalStats.spirit * 11 + gear.stamina + this.passiveBonuses.stamina;
    this.manaRegen = 4 + this.totalStats.spirit * 1.5;
    this.staminaRegen = 10 + this.totalStats.spirit * 1.8 + gear.staminaRegen + this.passiveBonuses.staminaRegen;
    this.speed = 190 + this.totalStats.dexterity * 3 + gear.speed + this.passiveBonuses.speed;
    this.damageBonus = this.totalStats.strength * 2 + gear.damage + this.passiveBonuses.damage + weaponUpgrade;
    this.critChance = 0.04 + this.totalStats.dexterity * 0.012 + gear.crit + this.passiveBonuses.crit;
    this.attackSpeed = 1 + this.totalStats.dexterity * 0.018 + gear.attackSpeed + this.passiveBonuses.attackSpeed;
    this.armor = this.totalStats.vitality * 0.45 + gear.armor + this.passiveBonuses.armor + armorUpgrade;
    this.reachBonus = (gear.reach ?? 0) + this.passiveBonuses.reach;

    this.hp = clamp(this.maxHp * previousHpRatio, 0, this.maxHp);
    this.mana = clamp(this.maxMana * previousManaRatio, 0, this.maxMana);
    this.stamina = clamp(this.maxStamina * previousStaminaRatio, 0, this.maxStamina);
  }

  gainExperience(amount, game) {
    this.xp += amount;
    let leveled = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.skillPoints += 2;
      leveled += 1;
    }

    if (leveled > 0) {
      this.recalculateDerivedStats();
      this.hp = this.maxHp;
      this.mana = this.maxMana;
      this.stamina = this.maxStamina;
      game.addLog(`Level up. You are now level ${this.level} with ${this.skillPoints} skill points.`);
      game.addParticles(this.x, this.y - 20, "#8de8ef", 18, 90);
      game.addPopup(this.x, this.y - 46, `LEVEL ${this.level}`, "#8de8ef");
    }
  }

  spendSkillPoint(stat) {
    if (!CORE_STATS.includes(stat) || this.skillPoints <= 0) return false;
    this.baseStats[stat] += 1;
    this.skillPoints -= 1;
    this.recalculateDerivedStats();
    return true;
  }

  addPassiveBook(id, apply) {
    if (this.passiveBooks.includes(id)) return false;
    this.passiveBooks.push(id);
    apply(this);
    return true;
  }

  getScaledAttackProfile(stepIndex) {
    const base = ATTACK_PROFILES[stepIndex];
    const furyDamage = this.buffs.fury > 0 ? 10 : 0;
    const furySpeed = this.buffs.fury > 0 ? 0.1 : 0;
    const speedScale = 1 / (this.attackSpeed + furySpeed);
    return {
      ...base,
      windup: base.windup * speedScale,
      active: base.active * speedScale,
      recovery: base.recovery * speedScale,
      range: Math.round(base.range * (1 + this.reachBonus)),
      damageMin: Math.round(base.damageMin + this.damageBonus * 0.7 + furyDamage),
      damageMax: Math.round(base.damageMax + this.damageBonus + furyDamage),
      knockback: base.knockback + this.totalStats.strength * 1.8,
      lunge: base.lunge + this.totalStats.dexterity * 2.2,
      staminaCost: Math.max(8, Math.round(base.staminaCost - this.totalStats.spirit * 0.2)),
      critChance: (base.critChance ?? 0) + this.critChance,
      attackStop: 0.03 + stepIndex * 0.01,
    };
  }

  update(dt, game) {
    if (this.isDead) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.comboExpire = Math.max(0, this.comboExpire - dt);
    this.mana = clamp(this.mana + this.manaRegen * dt, 0, this.maxMana);
    this.stamina = clamp(this.stamina + this.staminaRegen * dt, 0, this.maxStamina);
    this.knockbackX *= Math.pow(0.001, dt);
    this.knockbackY *= Math.pow(0.001, dt);
    Object.values(this.skills).forEach((skill) => {
      skill.current = Math.max(0, skill.current - dt);
    });
    Object.keys(this.buffs).forEach((buff) => {
      this.buffs[buff] = Math.max(0, this.buffs[buff] - dt);
    });
    Object.keys(this.debuffs).forEach((debuff) => {
      this.debuffs[debuff] = Math.max(0, this.debuffs[debuff] - dt);
    });
    this.updateDebuffs(dt, game);

    const moveX = (game.input.isDown("KeyD") ? 1 : 0) - (game.input.isDown("KeyA") ? 1 : 0);
    const moveY = (game.input.isDown("KeyS") ? 1 : 0) - (game.input.isDown("KeyW") ? 1 : 0);
    const move = normalize(moveX, moveY);
    const stunned = this.debuffs.stun > 0;
    this.isMoving = !stunned && (move.x !== 0 || move.y !== 0);

    if (this.isMoving) {
      this.lastMove = move;
      this.facingAngle = Math.atan2(move.y, move.x);
      this.direction = this.angleToDirection(this.facingAngle);
    } else {
      // Auto-aim: face the nearest enemy
      let nearestEnemy = null;
      let nearestDist = 200; // max auto-aim range
      game.enemies.forEach((enemy) => {
        if (!enemy.isAlive) return;
        const d = distance(this.x, this.y, enemy.x, enemy.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestEnemy = enemy;
        }
      });
      if (nearestEnemy) {
        this.facingAngle = angleBetween(this.x, this.y, nearestEnemy.x, nearestEnemy.y);
        this.direction = this.angleToDirection(this.facingAngle);
      }
    }

    this.resolveAttackState(dt, game);

    if (Math.abs(this.knockbackX) > 1 || Math.abs(this.knockbackY) > 1) {
      this.move(this.knockbackX * dt, this.knockbackY * dt, game.dungeon);
    }

    if (this.isMoving) {
      const slowScale = this.debuffs.slow > 0 ? Math.max(0.45, 1 - this.debuffPower.slow) : 1;
      const velocity = (this.attackPhase === "idle" ? this.speed : this.speed * 0.45) * slowScale;
      this.move(move.x * velocity * dt, move.y * velocity * dt, game.dungeon);
      this.walkCycle += dt * 10;
    } else {
      this.idleCycle += dt * 3.2;
    }

    if (!stunned && game.input.consumeAttack()) {
      if (this.attackPhase === "idle") {
        this.beginAttack(game);
      } else if (this.canQueueNextAttack()) {
        this.queuedAttack = true;
      }
    }
  }

  updateDebuffs(dt, game) {
    if (this.debuffs.poison > 0) {
      this.debuffTicks.poison -= dt;
      if (this.debuffTicks.poison <= 0) {
        this.debuffTicks.poison = 0.6;
        this.applyDamageOverTime(Math.max(1, Math.round(this.debuffPower.poison)), "#8ee182", game, "poison");
      }
    }

    if (this.debuffs.burn > 0) {
      this.debuffTicks.burn -= dt;
      if (this.debuffTicks.burn <= 0) {
        this.debuffTicks.burn = 0.45;
        this.applyDamageOverTime(Math.max(1, Math.round(this.debuffPower.burn)), "#ffb06d", game, "burn");
      }
    }
  }

  applyDamageOverTime(amount, color, game, type) {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    game.addPopup(this.x, this.y - 24, `-${amount}`, color);
    game.addParticles(this.x, this.y - 4, color, 6, 45);
    if (this.hp <= 0) this.isDead = true;
  }

  applyDebuff(effect, game) {
    if (!effect?.type || this.isDead) return;
    const duration = effect.duration ?? 0;

    if (effect.type === "poison") {
      this.debuffs.poison = Math.max(this.debuffs.poison, duration);
      this.debuffPower.poison = Math.max(this.debuffPower.poison, effect.power ?? 4);
      this.debuffTicks.poison = Math.min(this.debuffTicks.poison, effect.tick ?? 0.6);
      game.addPopup(this.x, this.y - 40, "POISON", "#8ee182");
    } else if (effect.type === "burn") {
      this.debuffs.burn = Math.max(this.debuffs.burn, duration);
      this.debuffPower.burn = Math.max(this.debuffPower.burn, effect.power ?? 4);
      this.debuffTicks.burn = Math.min(this.debuffTicks.burn, effect.tick ?? 0.45);
      game.addPopup(this.x, this.y - 40, "BURN", "#ffb06d");
    } else if (effect.type === "slow") {
      this.debuffs.slow = Math.max(this.debuffs.slow, duration);
      this.debuffPower.slow = Math.max(this.debuffPower.slow, effect.power ?? 0.35);
      game.addPopup(this.x, this.y - 40, "SLOW", "#98d4ff");
    } else if (effect.type === "stun") {
      this.debuffs.stun = Math.max(this.debuffs.stun, duration);
      this.attackPhase = "idle";
      this.attackElapsed = 0;
      this.attackProfile = null;
      this.attackResolved = false;
      this.queuedAttack = false;
      this.attackFacingLocked = null;
      game.addPopup(this.x, this.y - 40, "STUN", "#ffe08a");
    }
  }

  resolveAttackState(dt, game) {
    if (this.attackPhase === "idle" || !this.attackProfile) return;

    this.attackElapsed += dt;
    const { windup, active, recovery, lunge } = this.attackProfile;
    const activeStart = windup;
    const activeEnd = windup + active;
    const total = windup + active + recovery;

    if (this.attackElapsed < activeStart) {
      this.attackPhase = "windup";
    } else if (this.attackElapsed < activeEnd) {
      this.attackPhase = "active";
      const lungeStrength = lunge * dt;
      const angle = this.attackFacingLocked ?? this.facingAngle;
      this.move(Math.cos(angle) * lungeStrength, Math.sin(angle) * lungeStrength, game.dungeon);
      if (!this.attackResolved) {
        this.attackResolved = true;
        game.combat.playerAttack(this, this.attackProfile);
      }
    } else if (this.attackElapsed < total) {
      this.attackPhase = "recovery";
    } else {
      this.finishAttack(game);
    }
  }

  beginAttack(game) {
    const nextStep = this.comboExpire > 0 ? (this.attackStep + 1) % ATTACK_PROFILES.length : 0;
    const profile = this.getScaledAttackProfile(nextStep);
    if (this.stamina < profile.staminaCost) {
      game.addLog("Your footing slips. Not enough stamina.");
      return;
    }

    // Face direction: use last move direction or auto-aim
    if (this.isMoving) {
      this.facingAngle = Math.atan2(this.lastMove.y, this.lastMove.x);
      this.direction = this.angleToDirection(this.facingAngle);
    }
    // Otherwise maintain the auto-aim direction already set in update()

    this.attackFacingLocked = this.directionToAngle(this.direction);
    this.facingAngle = this.attackFacingLocked;
    this.attackStep = nextStep;
    this.attackProfile = profile;
    this.attackElapsed = 0;
    this.attackPhase = "windup";
    this.attackResolved = false;
    this.queuedAttack = false;
    this.comboExpire = 0.52;
    this.attackCooldown = profile.windup + profile.active + profile.recovery * 0.55;
    this.stamina = Math.max(0, this.stamina - profile.staminaCost);
  }

  finishAttack(game) {
    const continueCombo = this.queuedAttack;
    this.attackPhase = "idle";
    this.attackElapsed = 0;
    this.attackProfile = null;
    this.attackResolved = false;
    this.queuedAttack = false;
    this.attackFacingLocked = null;

    if (continueCombo) {
      this.beginAttack(game);
    }
  }

  canQueueNextAttack() {
    if (!this.attackProfile) return false;
    const total = this.attackProfile.windup + this.attackProfile.active + this.attackProfile.recovery;
    return this.attackElapsed >= total * 0.42;
  }

  move(dx, dy, dungeon) {
    if (dx !== 0) {
      const nextX = this.x + dx;
      if (!dungeon.collidesCircle(nextX, this.y, this.radius)) {
        this.x = nextX;
      }
    }
    if (dy !== 0) {
      const nextY = this.y + dy;
      if (!dungeon.collidesCircle(this.x, nextY, this.radius)) {
        this.y = nextY;
      }
    }
  }

  takeDamage(amount, game, angle = 0, effect = null) {
    if (this.invulnTimer > 0 || this.isDead) return false;

    const wardReduction = this.buffs.ward > 0 ? 0.78 : 1;
    const mitigated = Math.max(1, Math.round(amount * (100 / (100 + this.armor * 8)) * wardReduction));
    this.hp = Math.max(0, this.hp - mitigated);
    this.hurtTimer = 0.25;
    this.invulnTimer = 0.45;
    this.knockbackX = Math.cos(angle) * 120;
    this.knockbackY = Math.sin(angle) * 120;
    game.addPopup(this.x, this.y - 32, `-${mitigated}`, "#ffb0a4");
    game.addParticles(this.x, this.y, "#ff8a73", 12, 95);
    game.addScreenShake(7, 0.2);
    game.audio.playPlayerHurt();
    game.addLog(`The dungeon bites back for ${mitigated} damage.`);
    if (effect) this.applyDebuff(effect, game);

    if (this.hp <= 0) {
      this.isDead = true;
    }
    return true;
  }

  canUseSkill(skillId) {
    const skill = this.skills[skillId];
    return Boolean(skill && skill.current <= 0 && this.mana >= skill.manaCost && !this.isDead);
  }

  triggerSkill(skillId) {
    const skill = this.skills[skillId];
    if (!skill) return false;
    skill.current = skill.cooldown;
    this.mana = Math.max(0, this.mana - skill.manaCost);
    return true;
  }

  angleToDirection(angle) {
    if (angle > -Math.PI * 0.25 && angle <= Math.PI * 0.25) return DIRECTIONS.RIGHT;
    if (angle > Math.PI * 0.25 && angle <= Math.PI * 0.75) return DIRECTIONS.DOWN;
    if (angle <= -Math.PI * 0.25 && angle > -Math.PI * 0.75) return DIRECTIONS.UP;
    return DIRECTIONS.LEFT;
  }

  directionToAngle(direction) {
    if (direction === DIRECTIONS.RIGHT) return 0;
    if (direction === DIRECTIONS.DOWN) return Math.PI / 2;
    if (direction === DIRECTIONS.UP) return -Math.PI / 2;
    return Math.PI;
  }

  render(ctx, camera, assets, viewportWidth, viewportHeight) {
    const screenX = this.x - camera.x + viewportWidth / 2;
    const screenY = this.y - camera.y + viewportHeight / 2;
    const state = this.attackPhase !== "idle" ? "attack" : this.isMoving ? "walk" : "idle";
    const total = this.attackProfile
      ? this.attackProfile.windup + this.attackProfile.active + this.attackProfile.recovery
      : 1;
    const attackFrame = Math.min(3, Math.floor((this.attackElapsed / total) * 4));
    const frame =
      state === "attack"
        ? attackFrame
        : state === "walk"
          ? Math.floor(this.walkCycle) % 4
          : Math.floor(this.idleCycle) % 4;
    const sprite = assets.getCharacterSprite(
      "player",
      this.direction,
      state,
      frame,
      this.hurtTimer > 0,
      0,
      this.attackStep
    );
    const outline = assets.getCharacterOutlineSprite
      ? assets.getCharacterOutlineSprite("player", this.direction, state, frame, this.hurtTimer > 0, 0, this.attackStep)
      : null;
    const spriteSize = assets.characterSpriteSize ?? 48;
    const spriteHalf = spriteSize / 2;

    if (assets.props.shadowSoft) {
      ctx.drawImage(assets.props.shadowSoft, screenX - 22, screenY + 9, 44, 16);
    } else {
      ctx.drawImage(assets.props.shadow, screenX - 20, screenY + 9, 40, 14);
    }

    // Attack glow
    if (this.attackPhase === "active") {
      ctx.fillStyle = "rgba(255, 181, 95, 0.16)";
      ctx.beginPath();
      ctx.arc(screenX, screenY - 2, 16 + this.attackStep * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Buff aura
    if (this.buffs.fury > 0 || this.buffs.ward > 0) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = this.buffs.fury > 0 ? "#ff9e52" : "#7fd79a";
      ctx.beginPath();
      ctx.arc(screenX, screenY - 8, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (this.debuffs.poison > 0 || this.debuffs.burn > 0 || this.debuffs.slow > 0) {
      ctx.globalAlpha = 0.14;
      ctx.fillStyle =
        this.debuffs.poison > 0
          ? "#8ee182"
          : this.debuffs.burn > 0
            ? "#ffb06d"
            : "#98d4ff";
      ctx.beginPath();
      ctx.arc(screenX, screenY - 6, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (this.debuffs.stun > 0) {
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(screenX - 6, screenY - 34, 4, 4);
      ctx.fillRect(screenX + 2, screenY - 37, 4, 4);
      ctx.fillRect(screenX + 9, screenY - 33, 4, 4);
    }

    if (outline) {
      ctx.drawImage(outline, screenX - spriteHalf, screenY - 31, spriteSize, spriteSize);
    }
    ctx.drawImage(sprite, screenX - spriteHalf, screenY - 31, spriteSize, spriteSize);
  }
}

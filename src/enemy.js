import { ENEMY_ARCHETYPES } from "./content.js";
import { DIRECTIONS } from "./constants.js";
import { angleBetween, distance, normalize } from "./utils.js";

export class Enemy {
  constructor(x, y, typeId = "skeleton", scale = 1) {
    const profile = ENEMY_ARCHETYPES[typeId] ?? ENEMY_ARCHETYPES.skeleton;
    this.profile = profile;
    this.typeId = profile.id;
    this.name = profile.name;
    this.role = profile.role;
    this.visual = profile.visual ?? 0;
    this.variant = profile.variant ?? 0;
    this.sizeScale = profile.sizeScale ?? 1;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.scale = scale;
    this.radius = 15 * this.sizeScale;
    this.speed = profile.speed * (0.96 + scale * 0.08);
    this.maxHp = Math.round(profile.hp * scale);
    this.hp = this.maxHp;
    this.damage = Math.round(profile.damage * (0.92 + scale * 0.12));
    this.xpValue = Math.round(profile.xp * scale);
    this.goldValue = Math.round(profile.gold * scale);
    this.attackRange = profile.attackRange;
    this.preferredRange = profile.preferredRange ?? profile.attackRange;
    this.projectileSpeed = profile.projectileSpeed ?? 0;
    this.projectileColor = profile.projectileColor ?? "#d9d0c6";
    this.projectileSize = profile.projectileSize ?? 6;
    this.projectileEffect = profile.projectileEffect ?? null;
    this.meleeEffect = profile.meleeEffect ?? null;
    this.aggroRange = profile.aggro ?? 240;
    this.cooldownDuration = profile.cooldown ?? (this.role === "ranged" || this.role === "boss" ? 1.5 : 1.05);
    this.behavior = profile.behavior ?? "default";
    this.specialAttack = profile.specialAttack ?? null;
    this.specialCooldownDuration = profile.specialCooldown ?? 4.8;
    this.specialCooldown = 1.2 + Math.random();
    this.volleyShots = profile.shots ?? (this.role === "boss" ? 3 : 1);
    this.volleySpread = profile.spread ?? 0.18;
    this.summonType = profile.summonType ?? null;
    this.summonCount = profile.summonCount ?? 0;
    this.novaRadius = profile.novaRadius ?? 92;
    this.novaDamage = profile.novaDamage ?? Math.round(this.damage * 0.75);
    this.novaEffect = profile.novaEffect ?? null;
    this.chargeSpeed = profile.chargeSpeed ?? Math.round(this.speed * 2.8);
    this.chargeDuration = profile.chargeDuration ?? 0.24;
    this.chargeEffect = profile.chargeEffect ?? this.meleeEffect ?? null;
    this.rageThreshold = profile.rageThreshold ?? 0;
    this.direction = DIRECTIONS.DOWN;
    this.attackCooldown = 0.2;
    this.attackRecovery = 0;
    this.attackWindup = 0;
    this.hurtTimer = 0;
    this.hitStun = 0;
    this.walkCycle = Math.random() * 3;
    this.wanderTimer = 1 + Math.random() * 1.5;
    this.wanderDir = { x: 0, y: 0 };
    this.alerted = false;
    this.isAlive = true;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.hpBarTimer = 0;
    this.attackAngle = Math.PI / 2;
    this.pendingAction = null;
    this.chargeTimer = 0;
    this.chargeAngle = 0;
    this.chargeHit = false;
  }

  update(dt, game) {
    if (!this.isAlive) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackRecovery = Math.max(0, this.attackRecovery - dt);
    this.attackWindup = Math.max(0, this.attackWindup - dt);
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.hitStun = Math.max(0, this.hitStun - dt);
    this.hpBarTimer = Math.max(0, this.hpBarTimer - dt);
    this.knockbackX *= Math.pow(0.001, dt);
    this.knockbackY *= Math.pow(0.001, dt);

    const player = game.player;
    const dist = distance(this.x, this.y, player.x, player.y);
    if (dist <= this.aggroRange) this.alerted = true;

    if (Math.abs(this.knockbackX) > 1 || Math.abs(this.knockbackY) > 1) {
      this.move(this.knockbackX * dt, this.knockbackY * dt, game.dungeon);
    }

    if (this.chargeTimer > 0) {
      this.chargeTimer = Math.max(0, this.chargeTimer - dt);
      const stepX = Math.cos(this.chargeAngle) * this.chargeSpeed * dt;
      const stepY = Math.sin(this.chargeAngle) * this.chargeSpeed * dt;
      this.walkCycle += dt * 14;
      this.move(stepX, stepY, game.dungeon);
      if (
        !this.chargeHit &&
        distance(this.x, this.y, player.x, player.y) < this.radius + player.radius + 4
      ) {
        this.chargeHit = true;
        player.takeDamage(Math.round(this.damage * 1.25), game, this.chargeAngle, this.chargeEffect);
        game.addParticles(this.x, this.y - 6, this.projectileColor, 12, 110);
        game.addScreenShake(8, 0.18);
        this.attackRecovery = 0.3;
        this.chargeTimer = 0;
      }
      if (this.chargeTimer > 0) return;
    }

    if (this.attackWindup > 0) {
      if (this.attackWindup <= 0.08) {
        this.attackWindup = 0;
        this.executeAttack(game);
        this.attackRecovery = this.role === "boss" ? 0.42 : 0.34;
      }
      return;
    }

    if (this.attackRecovery > 0 || this.hitStun > 0) return;

    let moveX = 0;
    let moveY = 0;
    const angle = angleBetween(this.x, this.y, player.x, player.y);
    this.attackAngle = angle;
    this.direction = this.angleToDirection(angle);
    const enraged = this.rageThreshold > 0 && this.hp / this.maxHp <= this.rageThreshold;
    const moveSpeed = this.speed * (enraged ? 1.18 : 1);

    if (this.alerted && dist < this.aggroRange * 1.45) {
      const direction = normalize(player.x - this.x, player.y - this.y);
      const specialReady =
        this.specialAttack &&
        this.specialCooldown <= 0 &&
        (
          (this.specialAttack === "charge" && dist > this.attackRange * 1.05 && dist < this.attackRange * 3.1) ||
          (this.specialAttack === "summon" && dist < this.aggroRange * 1.1) ||
          (this.specialAttack === "nova" && dist < this.novaRadius * 1.35)
        );

      if (specialReady) {
        this.pendingAction = this.specialAttack;
        this.attackWindup = this.role === "boss" || this.role === "miniboss" ? 0.34 : 0.24;
        this.attackCooldown = this.cooldownDuration * 0.9;
        this.specialCooldown = this.specialCooldownDuration;
        return;
      }

      if (this.role === "ranged" || this.role === "boss") {
        const retreatBias = dist < this.preferredRange * 0.7 ? -1 : dist > this.preferredRange ? 1 : 0;
        moveX = direction.x * retreatBias + Math.sin(angle) * (this.behavior === "skirmish" ? 0.65 : 0.3);
        moveY = direction.y * retreatBias - Math.cos(angle) * (this.behavior === "skirmish" ? 0.65 : 0.3);
      } else if (this.behavior === "skirmish") {
        const closeBias = dist < this.attackRange * 0.9 ? -0.35 : 1;
        moveX = direction.x * closeBias + Math.sin(angle) * 0.78;
        moveY = direction.y * closeBias - Math.cos(angle) * 0.78;
      } else if (this.behavior === "dart") {
        moveX = direction.x * 1.15 + Math.sin(angle) * 0.32;
        moveY = direction.y * 1.15 - Math.cos(angle) * 0.32;
      } else if (this.behavior === "guard") {
        moveX = dist > this.attackRange * 0.92 ? direction.x * 0.82 : Math.sin(angle) * 0.2;
        moveY = dist > this.attackRange * 0.92 ? direction.y * 0.82 : -Math.cos(angle) * 0.2;
      } else {
        moveX = direction.x;
        moveY = direction.y;
      }

      const canAttack =
        this.role === "ranged" || this.role === "boss"
          ? dist <= this.attackRange && dist >= this.preferredRange * 0.52
          : dist <= this.attackRange;
      if (canAttack && this.attackCooldown <= 0) {
        this.pendingAction = null;
        this.attackWindup = this.role === "boss" ? 0.36 : this.role === "ranged" ? 0.28 : 0.3;
        this.attackCooldown = this.cooldownDuration;
        return;
      }
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 1.2 + Math.random() * 1.6;
        const angle = Math.random() * Math.PI * 2;
        this.wanderDir = { x: Math.cos(angle), y: Math.sin(angle) };
      }
      moveX = this.wanderDir.x * 0.42;
      moveY = this.wanderDir.y * 0.42;
    }

    if (moveX || moveY) {
      const movement = normalize(moveX, moveY);
      this.walkCycle += dt * (this.role === "boss" ? 5 : 8);
      this.move(movement.x * moveSpeed * dt, movement.y * moveSpeed * dt, game.dungeon);
    }
  }

  executeAttack(game) {
    if (this.pendingAction === "charge") {
      this.chargeTimer = this.chargeDuration;
      this.chargeAngle = this.attackAngle;
      this.chargeHit = false;
      this.pendingAction = null;
      game.addParticles(this.x, this.y - 6, this.projectileColor, 10, 80);
      return;
    }

    if (this.pendingAction === "summon" && this.summonType && this.summonCount > 0) {
      const activeSummons = game.enemies.filter((enemy) => enemy.isAlive && enemy.typeId === this.summonType).length;
      const summonLimit = this.role === "boss" ? 8 : 5;
      if (activeSummons < summonLimit) {
        const spawnCount = Math.min(this.summonCount, summonLimit - activeSummons);
        for (let index = 0; index < spawnCount; index += 1) {
          const a = this.attackAngle + (index - (spawnCount - 1) / 2) * 0.85;
          game.spawnEnemyUnit(
            this.summonType,
            this.x + Math.cos(a) * 34,
            this.y + Math.sin(a) * 34,
            Math.max(0.9, this.scale * 0.82)
          );
        }
        game.addParticles(this.x, this.y - 8, this.projectileColor, 18, 95);
        if (this.role === "boss" || this.role === "miniboss") {
          game.addLog(`${this.name} calls reinforcements.`);
        }
      }
      this.pendingAction = null;
      return;
    }

    if (this.pendingAction === "nova") {
      const player = game.player;
      if (distance(this.x, this.y, player.x, player.y) <= this.novaRadius) {
        player.takeDamage(this.novaDamage, game, this.attackAngle, this.novaEffect);
      }
      game.addParticles(this.x, this.y - 6, this.projectileColor, 24, 140);
      game.addScreenShake(this.role === "boss" ? 9 : 6, 0.16);
      this.pendingAction = null;
      return;
    }

    this.pendingAction = null;

    if (this.role === "ranged" || this.role === "boss") {
      const volley =
        this.volleyShots <= 1
          ? [0]
          : Array.from({ length: this.volleyShots }, (_, index) => {
              const center = (this.volleyShots - 1) / 2;
              return (index - center) * this.volleySpread;
            });
      volley.forEach((spread) => {
        game.spawnEnemyProjectile({
          x: this.x,
          y: this.y - 8,
          angle: this.attackAngle + spread,
          speed: this.projectileSpeed,
          damage: this.damage,
          color: this.projectileColor,
          size: this.projectileSize,
          owner: this,
          effect: this.projectileEffect,
        });
      });
      if (this.role === "boss") {
        game.addScreenShake(4, 0.12);
      }
      return;
    }
    game.combat.enemyAttack(this);
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

  takeDamage(amount, game, attackAngle = 0, knockback = 0, critical = false) {
    if (!this.isAlive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hurtTimer = 0.18;
    this.hitStun = this.role === "boss" ? 0.08 : 0.16;
    this.attackWindup = 0;
    this.attackRecovery = 0.06;
    this.alerted = true;
    this.hpBarTimer = 1.2;
    const kbScale = this.role === "boss" ? 0.45 : this.role === "miniboss" ? 0.7 : 1;
    this.knockbackX = Math.cos(attackAngle) * knockback * 8 * kbScale;
    this.knockbackY = Math.sin(attackAngle) * knockback * 8 * kbScale;
    game.addPopup(this.x, this.y - 28, critical ? `CRIT ${amount}` : `${amount}`, critical ? "#ffd27f" : "#ffe2a9");
    game.addParticles(this.x, this.y - 6, this.variant ? "#b9a0ff" : "#c8d1da", this.role === "boss" ? 16 : 10, 110);

    if (this.hp <= 0) {
      this.isAlive = false;
      game.addLog(`${this.name} collapses into dust.`);
      game.addParticles(this.x, this.y, "#ffc688", this.role === "boss" ? 28 : 18, 140);
      game.spawnLoot(this.x, this.y, this.role === "boss" || this.role === "miniboss", this.profile.id);
      game.onEnemyDefeated(this);
    }
  }

  angleToDirection(angle) {
    if (angle > -Math.PI * 0.25 && angle <= Math.PI * 0.25) return DIRECTIONS.RIGHT;
    if (angle > Math.PI * 0.25 && angle <= Math.PI * 0.75) return DIRECTIONS.DOWN;
    if (angle <= -Math.PI * 0.25 && angle > -Math.PI * 0.75) return DIRECTIONS.UP;
    return DIRECTIONS.LEFT;
  }

  render(ctx, camera, assets, viewportWidth, viewportHeight) {
    if (!this.isAlive) return;
    const screenX = this.x - camera.x + viewportWidth / 2;
    const screenY = this.y - camera.y + viewportHeight / 2;
    const state = this.attackWindup > 0 || this.attackRecovery > 0 ? "attack" : "walk";
    const phaseTime = this.attackWindup > 0 ? 0.3 - this.attackWindup : 0.34 - this.attackRecovery;
    const frame = state === "attack" ? Math.min(3, Math.floor((phaseTime / 0.1) % 4)) : Math.floor(this.walkCycle) % 4;
    const sprite = assets.getCharacterSprite(
      "enemy",
      this.direction,
      state,
      frame,
      this.hurtTimer > 0,
      this.variant,
      this.visual
    );
    const outline = assets.getCharacterOutlineSprite
      ? assets.getCharacterOutlineSprite(
          "enemy",
          this.direction,
          state,
          frame,
          this.hurtTimer > 0,
          this.variant,
          this.visual
        )
      : null;
    const spriteSize = assets.characterSpriteSize ?? 48;

    if (this.attackWindup > 0) {
      const ring = assets.props.telegraphRing;
      const pulse = 1 + (this.attackWindup / 0.3) * 0.12;
      ctx.globalAlpha = this.role === "boss" ? 0.7 : 0.5;
      const ringSize = 48 * pulse * this.sizeScale;
      ctx.drawImage(ring, screenX - ringSize / 2, screenY - 16 - ringSize / 2, ringSize, ringSize);
      ctx.globalAlpha = 1;
    }

    if (assets.props.shadowSoft) {
      ctx.drawImage(
        assets.props.shadowSoft,
        screenX - 22 * this.sizeScale,
        screenY + 9 * this.sizeScale,
        44 * this.sizeScale,
        16 * this.sizeScale
      );
    } else {
      ctx.drawImage(
        assets.props.shadow,
        screenX - 20 * this.sizeScale,
        screenY + 9 * this.sizeScale,
        40 * this.sizeScale,
        14 * this.sizeScale
      );
    }

    if (outline) {
      ctx.drawImage(
        outline,
        screenX - (spriteSize / 2) * this.sizeScale,
        screenY - 31 * this.sizeScale,
        spriteSize * this.sizeScale,
        spriteSize * this.sizeScale
      );
    }
    ctx.drawImage(
      sprite,
      screenX - (spriteSize / 2) * this.sizeScale,
      screenY - 31 * this.sizeScale,
      spriteSize * this.sizeScale,
      spriteSize * this.sizeScale
    );

    // HP bar (4px-aligned)
    if (this.hpBarTimer > 0 || this.hp < this.maxHp) {
      const width = 28 * this.sizeScale;
      const ratio = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(screenX - width / 2, screenY - 41 * this.sizeScale, width, 4);
      ctx.fillStyle =
        this.role === "boss"
          ? "#f08d65"
          : this.role === "miniboss"
            ? "#d2a35d"
            : this.variant
            ? "#a984ba"
            : "#d05d63";
      ctx.fillRect(screenX - width / 2 + 1, screenY - 40 * this.sizeScale, (width - 2) * ratio, 3);
    }
  }
}

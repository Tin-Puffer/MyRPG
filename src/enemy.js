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
    this.aggroRange = profile.aggro ?? 240;
    this.cooldownDuration = profile.cooldown ?? (this.role === "ranged" || this.role === "boss" ? 1.5 : 1.05);
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
  }

  update(dt, game) {
    if (!this.isAlive) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackRecovery = Math.max(0, this.attackRecovery - dt);
    this.attackWindup = Math.max(0, this.attackWindup - dt);
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

    if (this.alerted && dist < this.aggroRange * 1.45) {
      const direction = normalize(player.x - this.x, player.y - this.y);

      if (this.role === "ranged" || this.role === "boss") {
        const retreatBias = dist < this.preferredRange * 0.7 ? -1 : dist > this.preferredRange ? 1 : 0;
        moveX = direction.x * retreatBias + Math.sin(angle) * 0.3;
        moveY = direction.y * retreatBias - Math.cos(angle) * 0.3;
      } else {
        moveX = direction.x;
        moveY = direction.y;
      }

      const canAttack =
        this.role === "ranged" || this.role === "boss"
          ? dist <= this.attackRange && dist >= this.preferredRange * 0.52
          : dist <= this.attackRange;
      if (canAttack && this.attackCooldown <= 0) {
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
      this.move(movement.x * this.speed * dt, movement.y * this.speed * dt, game.dungeon);
    }
  }

  executeAttack(game) {
    if (this.role === "ranged" || this.role === "boss") {
      const volley = this.role === "boss" ? [-0.18, 0, 0.18] : [0];
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
    const spriteSize = 32;

    if (this.attackWindup > 0) {
      const ring = assets.props.telegraphRing;
      const pulse = 1 + (this.attackWindup / 0.3) * 0.12;
      ctx.globalAlpha = this.role === "boss" ? 0.7 : 0.5;
      const ringSize = 48 * pulse * this.sizeScale;
      ctx.drawImage(ring, screenX - ringSize / 2, screenY - 16 - ringSize / 2, ringSize, ringSize);
      ctx.globalAlpha = 1;
    }

    // Draw shadow (4px-aligned)
    ctx.drawImage(assets.props.shadow, screenX - 16 * this.sizeScale, screenY + 8, 32 * this.sizeScale, 12 * this.sizeScale);

    // Draw sprite at 32x32 native size
    ctx.drawImage(sprite, screenX - (spriteSize / 2) * this.sizeScale, screenY - 20 * this.sizeScale, spriteSize * this.sizeScale, spriteSize * this.sizeScale);

    // HP bar (4px-aligned)
    if (this.hpBarTimer > 0 || this.hp < this.maxHp) {
      const width = 28 * this.sizeScale;
      const ratio = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(screenX - width / 2, screenY - 30 * this.sizeScale, width, 4);
      ctx.fillStyle =
        this.role === "boss"
          ? "#f08d65"
          : this.role === "miniboss"
            ? "#d2a35d"
            : this.variant
              ? "#a984ba"
              : "#d05d63";
      ctx.fillRect(screenX - width / 2 + 1, screenY - 29 * this.sizeScale, (width - 2) * ratio, 3);
    }
  }
}

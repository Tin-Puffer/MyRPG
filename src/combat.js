import { angleBetween, angleDiff, distance, randInt } from "./utils.js";

export class CombatSystem {
  constructor(game) {
    this.game = game;
  }

  playerAttack(player, profile) {
    const range = profile.range;
    const arc = profile.arc;
    const hits = [];

    this.game.audio.playSwing();
    this.game.addSlash(
      player.x + Math.cos(player.facingAngle) * 18,
      player.y + Math.sin(player.facingAngle) * 18,
      player.facingAngle,
      profile.slashScale,
      player.attackStep
    );

    this.game.enemies.forEach((enemy) => {
      if (!enemy.isAlive) return;
      const dist = distance(player.x, player.y, enemy.x, enemy.y);
      const angle = angleBetween(player.x, player.y, enemy.x, enemy.y);
      if (dist <= range && Math.abs(angleDiff(player.facingAngle, angle)) <= arc / 2) {
        let damage = randInt(profile.damageMin, profile.damageMax);
        const critical = Boolean(profile.critChance && Math.random() < profile.critChance);
        if (critical) damage = Math.floor(damage * 1.5);
        enemy.takeDamage(damage, this.game, player.facingAngle, profile.knockback, critical);
        hits.push({ enemy, critical });
      }
    });

    this.game.chests.forEach((chest) => {
      if (chest.opened) return;
      const dist = distance(player.x, player.y, chest.x, chest.y);
      const angle = angleBetween(player.x, player.y, chest.x, chest.y);
      if (dist <= range && Math.abs(angleDiff(player.facingAngle, angle)) <= arc / 1.8) {
        this.game.openChest(chest);
      }
    });

    if (hits.length > 0) {
      this.game.audio.playHit();
      this.game.addScreenShake(6 + hits.length, 0.18);
      this.game.addHitStop(profile.attackStop ?? 0.04);
      const crits = hits.filter((hit) => hit.critical).length;
      this.game.addLog(
        crits > 0
          ? `${profile.name} lands hard. ${crits} critical strike${crits > 1 ? "s" : ""}.`
          : `Steel bites deep: ${hits.length} fiend${hits.length > 1 ? "s" : ""} struck.`
      );
    } else if (player.attackStep === 2) {
      this.game.addLog(`${profile.name} cuts only dust.`);
    }
  }

  enemyAttack(enemy) {
    const player = this.game.player;
    if (!player || player.isDead) return;
    const dist = distance(enemy.x, enemy.y, player.x, player.y);
    if (dist > enemy.attackRange + 10) return;
    const angle = angleBetween(enemy.x, enemy.y, player.x, player.y);
    enemy.x += Math.cos(angle) * 8;
    enemy.y += Math.sin(angle) * 8;
    player.takeDamage(enemy.damage, this.game, angle, enemy.meleeEffect ?? null);
  }

  castArcaneBurst(player, game) {
    if (!player.triggerSkill("arcaneBurst")) return;
    const angle = player.facingAngle;
    game.audio.playHit();
    
    for (let i = -1; i <= 1; i++) {
      game.spawnEnemyProjectile({
        x: player.x,
        y: player.y,
        angle: angle + i * 0.25,
        speed: 380,
        damage: 25 + player.totalStats.spirit * 2,
        color: "#8de8ef",
        size: 8,
        owner: "player"
      });
    }
    game.addLog("You unleash a burst of arcane energy.");
    player.attackPhase = "recovery";
    player.attackElapsed = 0;
    player.attackProfile = { windup: 0, active: 0, recovery: 0.3 };
  }

  castDashSlash(player, game) {
    if (!player.triggerSkill("dashSlash")) return;
    
    // Find nearest enemy within visible range (400 pixels)
    let nearestEnemy = null;
    let minDistance = 400;
    
    game.enemies.forEach(enemy => {
      if (!enemy.isAlive) return;
      const dist = distance(player.x, player.y, enemy.x, enemy.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearestEnemy = enemy;
      }
    });
    
    if (nearestEnemy) {
      // Calculate target position near enemy
      const angleToEnemy = angleBetween(player.x, player.y, nearestEnemy.x, nearestEnemy.y);
      let targetX = nearestEnemy.x - Math.cos(angleToEnemy) * 20;
      let targetY = nearestEnemy.y - Math.sin(angleToEnemy) * 20;
      
      // Prevent getting stuck in walls by pulling back towards player
      const dist = distance(player.x, player.y, targetX, targetY);
      const angleFromPlayer = angleBetween(player.x, player.y, targetX, targetY);
      let pulled = 0;
      
      while (game.dungeon.collidesCircle(targetX, targetY, player.radius) && pulled <= dist) {
        pulled += 12;
        targetX -= Math.cos(angleFromPlayer) * 12;
        targetY -= Math.sin(angleFromPlayer) * 12;
      }

      player.x = targetX;
      player.y = targetY;
      player.facingAngle = angleToEnemy;
      
      game.audio.playSwing();
      // Apply guaranteed critical hit
      nearestEnemy.takeDamage((40 + player.damageBonus) * 1.5, game, angleToEnemy, 60, true);
      game.addLog("You vanish and strike with lethal precision.");
      
      // Visuals for teleport
      game.addParticles(player.x, player.y, "#ffffff", 15, 200);
      game.addSlash(player.x, player.y, player.facingAngle, 1.5, 0);
    } else {
      game.addLog("No target in sight for Dash Slash.");
    }
    
    player.attackPhase = "recovery";
    player.attackElapsed = 0;
    player.attackProfile = { windup: 0, active: 0, recovery: 0.25 };
  }

  castIronNova(player, game) {
    if (!player.triggerSkill("ironNova")) return;
    game.audio.playHit();
    
    // Intensive Visuals
    game.addParticles(player.x, player.y, "#f0d8b0", 60, 220); // More particles, faster
    game.addParticles(player.x, player.y, "#ffffff", 20, 180); // Bright core particles
    game.addScreenShake(20, 0.45); // Huge screen shake
    game.addDecal(player.x, player.y, 45, 6); // Add floor crack decal
    
    game.enemies.forEach((enemy) => {
      if (!enemy.isAlive) return;
      const dist = distance(player.x, player.y, enemy.x, enemy.y);
      if (dist <= 140) {
        const angle = angleBetween(player.x, player.y, enemy.x, enemy.y);
        enemy.takeDamage(35 + player.totalStats.strength * 2, game, angle, 250, false);
      }
    });
    
    game.addLog("Iron Nova erupts, shattering the ground.");
    player.attackPhase = "recovery";
    player.attackElapsed = 0;
    player.attackProfile = { windup: 0, active: 0, recovery: 0.45 };
  }
}

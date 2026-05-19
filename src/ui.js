import {
  CORE_STATS,
  EQUIPMENT_SLOTS,
  GAME_STATE,
  INVENTORY_SIZE,
  MAX_LOG_ENTRIES,
  STASH_SIZE,
} from "./constants.js";
import { formatCount } from "./utils.js";

const STAT_LABELS = {
  strength: "Strength",
  dexterity: "Dexterity",
  vitality: "Vitality",
  spirit: "Spirit",
};

const EQUIPMENT_LABELS = {
  weapon: "Weapon",
  armor: "Armor",
  boots: "Boots",
  charm: "Charm",
};

function formatBonusLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export class UI {
  constructor(doc, game) {
    this.doc = doc;
    this.game = game;
    this.hpFill = doc.getElementById("hpFill");
    this.hpText = doc.getElementById("hpText");
    this.staminaFill = doc.getElementById("staminaFill");
    this.staminaText = doc.getElementById("staminaText");
    this.manaFill = doc.getElementById("manaFill");
    this.manaText = doc.getElementById("manaText");
    this.xpFill = doc.getElementById("xpFill");
    this.xpText = doc.getElementById("xpText");
    this.levelBadge = doc.getElementById("levelBadge");
    this.goldText = doc.getElementById("goldText");
    this.areaBadge = doc.getElementById("areaBadge");
    this.skillPointBadge = doc.getElementById("skillPointBadge");
    this.inventoryPanel = doc.getElementById("inventoryPanel");
    this.equipmentPanel = doc.getElementById("equipmentPanel");
    this.statsPanel = doc.getElementById("statsPanel");
    this.stashPanel = doc.getElementById("stashPanel");
    this.stashCard = doc.getElementById("stashCard");
    this.worldPanel = doc.getElementById("worldPanel");
    this.interactionPanel = doc.getElementById("interactionPanel");
    this.quickbarPanel = doc.getElementById("quickbarPanel");
    this.skillbarPanel = doc.getElementById("skillbarPanel");
    this.quickAssignText = doc.getElementById("quickAssignText");
    this.itemActionCard = doc.getElementById("itemActionCard");
    this.itemActionTitle = doc.getElementById("itemActionTitle");
    this.itemActionText = doc.getElementById("itemActionText");
    this.itemPrimaryActionButton = doc.getElementById("itemPrimaryActionButton");
    this.itemDropActionButton = doc.getElementById("itemDropActionButton");
    this.tooltip = doc.getElementById("tooltip");
    this.combatLog = doc.getElementById("combatLog");
    this.menuOverlay = doc.getElementById("menuOverlay");
    this.menuTitle = doc.getElementById("menuTitle");
    this.menuCopy = doc.getElementById("menuCopy");
    this.startButton = doc.getElementById("startButton");
    this.restartButton = doc.getElementById("restartButton");
    this.screenOverlay = doc.getElementById("screenOverlay");
    this.characterWindow = doc.getElementById("characterWindow");
    this.inventoryWindow = doc.getElementById("inventoryWindow");
    this.worldWindow = doc.getElementById("worldWindow");
    this.inventoryVisible = true;
    this.hoverTarget = null;

    this.windows = {
      character: this.characterWindow,
      inventory: this.inventoryWindow,
      world: this.worldWindow,
      stash: this.stashCard,
    };

    this.toggleCharacterButton = doc.getElementById("toggleCharacterButton");
    this.toggleInventoryButton = doc.getElementById("toggleInventoryButton");
    this.toggleWorldButton = doc.getElementById("toggleWorldButton");
    this.closeCharacterButton = doc.getElementById("closeCharacterButton");
    this.closeInventoryButton = doc.getElementById("closeInventoryButton");
    this.closeWorldButton = doc.getElementById("closeWorldButton");
    this.closeStashButton = doc.getElementById("closeStashButton");

    this.buildInventory();
    this.buildEquipment();
    this.buildStats();
    this.buildStash();
    this.buildQuickbar();
    this.buildSkillbar();
  }

  bindHover(button, target) {
    button.addEventListener("mouseenter", () => {
      this.hoverTarget = target();
      this.refreshTooltip();
    });
    button.addEventListener("mouseleave", () => {
      this.hoverTarget = null;
      this.tooltip.classList.add("hidden");
    });
  }

  buildInventory() {
    this.slots = [];
    this.inventoryPanel.innerHTML = "";
    for (let index = 0; index < INVENTORY_SIZE; index += 1) {
      const slot = this.doc.createElement("button");
      slot.className = "inventory-slot empty";
      slot.type = "button";
      this.bindHover(slot, () => ({ type: "inventory", index }));
      slot.addEventListener("click", () => this.game.useInventorySlot(index));
      this.inventoryPanel.appendChild(slot);
      this.slots.push(slot);
    }
  }

  buildEquipment() {
    this.equipmentSlots = {};
    this.equipmentPanel.innerHTML = "";
    EQUIPMENT_SLOTS.forEach((slotName) => {
      const slot = this.doc.createElement("button");
      slot.className = "inventory-slot slot-equipment empty";
      slot.type = "button";
      this.bindHover(slot, () => ({ type: "equipment", slot: slotName }));
      slot.addEventListener("click", () => this.game.unequip(slotName));
      this.equipmentPanel.appendChild(slot);
      this.equipmentSlots[slotName] = slot;
    });
  }

  buildStash() {
    this.stashSlots = [];
    this.stashPanel.innerHTML = "";
    for (let index = 0; index < STASH_SIZE; index += 1) {
      const slot = this.doc.createElement("button");
      slot.className = "inventory-slot empty";
      slot.type = "button";
      this.bindHover(slot, () => ({ type: "stash", index }));
      slot.addEventListener("click", () => this.game.transferStashSlot(index));
      this.stashPanel.appendChild(slot);
      this.stashSlots.push(slot);
    }
  }

  buildStats() {
    this.statRows = {};
    this.statsPanel.innerHTML = "";
    CORE_STATS.forEach((stat) => {
      const row = this.doc.createElement("div");
      row.className = "stat-row";

      const name = this.doc.createElement("span");
      name.className = "stat-name";
      name.textContent = STAT_LABELS[stat];

      const value = this.doc.createElement("span");
      const derived = this.doc.createElement("span");
      derived.className = "stat-derived";

      const button = this.doc.createElement("button");
      button.className = "stat-button";
      button.type = "button";
      button.textContent = "+";
      button.addEventListener("click", () => this.game.allocateSkillPoint(stat));

      row.append(name, value, derived, button);
      this.statsPanel.appendChild(row);
      this.statRows[stat] = { value, derived, button };
    });
  }

  buildQuickbar() {
    this.quickbarSlots = [];
    this.quickbarPanel.innerHTML = "";
    for (let index = 0; index < 4; index += 1) {
      const slot = this.doc.createElement("button");
      slot.className = "action-slot empty";
      slot.type = "button";
      slot.addEventListener("click", () => this.game.toggleQuickAssign(index));
      this.quickbarPanel.appendChild(slot);
      this.quickbarSlots.push(slot);
    }
  }

  buildSkillbar() {
    this.skillSlots = [];
    this.skillbarPanel.innerHTML = "";
    this.game.skillOrder.forEach((skillId) => {
      const slot = this.doc.createElement("button");
      slot.className = "action-slot";
      slot.type = "button";
      slot.addEventListener("click", () => this.game.castSkill(skillId));
      this.skillbarPanel.appendChild(slot);
      this.skillSlots.push({ slot, skillId });
    });
  }

  bind() {
    this.startButton.addEventListener("click", () => this.game.startGame());
    this.restartButton.addEventListener("click", () => this.game.restartGame());

    this.toggleCharacterButton.addEventListener("click", () => this.toggleWindow("character"));
    this.toggleInventoryButton.addEventListener("click", () => this.toggleWindow("inventory"));
    this.toggleWorldButton.addEventListener("click", () => this.toggleWindow("world"));
    this.closeCharacterButton.addEventListener("click", () => this.hideWindow("character"));
    this.closeInventoryButton.addEventListener("click", () => this.hideWindow("inventory"));
    this.closeWorldButton.addEventListener("click", () => this.hideWindow("world"));
    this.closeStashButton.addEventListener("click", () => this.hideWindow("stash"));
    this.itemPrimaryActionButton.addEventListener("click", () => this.game.activateSelectedInventoryItem());
    this.itemDropActionButton.addEventListener("click", () => this.game.dropSelectedInventoryItem());
  }

  toggleWindow(name) {
    const target = this.windows[name];
    if (!target) return;
    const shouldShow = target.classList.contains("hidden");
    Object.keys(this.windows).forEach((key) => {
      if (key !== name) this.hideWindow(key);
    });
    target.classList.toggle("hidden", !shouldShow);
    if (name === "inventory") this.inventoryVisible = shouldShow;
  }

  hideWindow(name) {
    const target = this.windows[name];
    if (!target) return;
    target.classList.add("hidden");
    if (name === "inventory") this.inventoryVisible = false;
  }

  isWindowOpen(name) {
    const target = this.windows[name];
    return target ? !target.classList.contains("hidden") : false;
  }

  syncStashVisibility() {
    if (this.game.stashOpen) {
      this.hideWindow("character");
      this.hideWindow("inventory");
      this.hideWindow("world");
      this.stashCard.classList.remove("hidden");
    } else {
      this.stashCard.classList.add("hidden");
    }
  }

  refresh() {
    const { player, inventory, state } = this.game;

    if (player) {
      const hpRatio = player.hp / player.maxHp;
      const staminaRatio = player.stamina / player.maxStamina;
      const manaRatio = player.mana / player.maxMana;
      const xpRatio = player.xp / player.xpToNext;
      this.hpFill.style.transform = `scaleX(${hpRatio})`;
      this.staminaFill.style.transform = `scaleX(${staminaRatio})`;
      this.manaFill.style.transform = `scaleX(${manaRatio})`;
      this.xpFill.style.transform = `scaleX(${xpRatio})`;
      this.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
      this.staminaText.textContent = `${Math.ceil(player.stamina)} / ${player.maxStamina}`;
      this.manaText.textContent = `${Math.ceil(player.mana)} / ${player.maxMana}`;
      this.xpText.textContent = `${player.xp} / ${player.xpToNext}`;
      this.levelBadge.textContent = `Level ${player.level}`;
      this.goldText.textContent = `${player.gold}g`;
      this.skillPointBadge.textContent = `${player.skillPoints} SP`;
      this.areaBadge.textContent = this.game.areaLabel;

      CORE_STATS.forEach((stat) => {
        const row = this.statRows[stat];
        row.value.textContent = `${player.totalStats[stat]}`;
        row.derived.textContent = this.describeStat(stat, player);
        row.button.disabled = player.skillPoints <= 0;
      });
    } else {
      CORE_STATS.forEach((stat) => {
        const row = this.statRows[stat];
        row.value.textContent = "-";
        row.derived.textContent = "";
        row.button.disabled = true;
      });
    }

    this.slots.forEach((slot, index) => {
      this.renderItemSlot(slot, inventory[index], {
        equipped: inventory[index]?.kind === "equipment" && this.isCurrentlyEquipped(inventory[index]),
        selected: this.game.selectedInventoryIndex === index,
      });
    });

    this.stashSlots.forEach((slot, index) => {
      this.renderItemSlot(slot, this.game.stash[index] ?? null);
    });

    EQUIPMENT_SLOTS.forEach((slotName) => {
      const slot = this.equipmentSlots[slotName];
      this.renderItemSlot(slot, player?.equipment?.[slotName] ?? null, { label: EQUIPMENT_LABELS[slotName] });
      slot.classList.toggle("is-equipped", Boolean(player?.equipment?.[slotName]));
    });

    this.renderWorld();
    this.renderInteractions();
    this.renderQuickbar();
    this.renderSkillbar();
    this.renderItemActions();
    this.syncStashVisibility();
    this.refreshTooltip();
    this.renderLog();
    this.syncState(state);
  }

  renderItemSlot(slot, item, options = {}) {
    slot.innerHTML = "";
    slot.classList.toggle("empty", !item);
    slot.classList.toggle("is-equipped", Boolean(options.equipped));
    slot.classList.toggle("is-selected", Boolean(options.selected));

    if (options.label) {
      const label = this.doc.createElement("span");
      label.className = "slot-label";
      label.textContent = options.label;
      slot.appendChild(label);
    }

    if (!item) {
      if (options.label) {
        const sub = this.doc.createElement("span");
        sub.className = "slot-subtext";
        sub.textContent = "Empty slot";
        slot.appendChild(sub);
      }
      return;
    }

    const icon = this.doc.createElement("img");
    icon.className = "inventory-icon";
    icon.alt = item.name;
    icon.src = this.game.assets.itemIcons[item.id].url;
    slot.appendChild(icon);

    const count = this.doc.createElement("span");
    count.className = "inventory-count";
    count.textContent = formatCount(item.count);
    slot.appendChild(count);

    if (options.label) {
      const sub = this.doc.createElement("span");
      sub.className = "slot-subtext";
      sub.textContent = item.name;
      slot.appendChild(sub);
    }
  }

  isCurrentlyEquipped(item) {
    return Object.values(this.game.player?.equipment ?? {}).some((entry) => entry?.instanceId === item.instanceId);
  }

  describeStat(stat, player) {
    if (stat === "strength") return `Damage +${player.damageBonus}`;
    if (stat === "dexterity") return `Crit ${(player.critChance * 100).toFixed(0)}%`;
    if (stat === "vitality") return `Armor ${player.armor.toFixed(1)}`;
    return `Regen ${player.staminaRegen.toFixed(0)}/s`;
  }

  getTooltipItem() {
    if (!this.hoverTarget) return null;
    if (this.hoverTarget.type === "inventory") return this.game.inventory[this.hoverTarget.index] ?? null;
    if (this.hoverTarget.type === "equipment") return this.game.player?.equipment?.[this.hoverTarget.slot] ?? null;
    if (this.hoverTarget.type === "stash") return this.game.stash[this.hoverTarget.index] ?? null;
    return null;
  }

  refreshTooltip() {
    const item = this.getTooltipItem();
    if (!item || (!this.inventoryVisible && this.hoverTarget?.type === "inventory")) {
      this.tooltip.classList.add("hidden");
      return;
    }

    const bonuses = item.bonuses
      ? Object.entries(item.bonuses)
          .map(([key, value]) => `${formatBonusLabel(key)}: +${value}`)
          .join(" • ")
      : item.heal
        ? `Restores ${item.heal} HP`
        : "No combat bonuses";

    this.tooltip.classList.remove("hidden");
    this.tooltip.innerHTML = `
      <strong>${item.name}</strong><br />
      <span>${item.rarity}${item.slot ? ` • ${item.slot}` : ""}</span><br />
      <span>${item.description}</span><br />
      <span>${bonuses}</span>
    `;
  }

  renderWorld() {
    this.worldPanel.innerHTML = "";
    const entries = [
      `${this.game.areaLabel}`,
      `Threat ${this.game.threatLevel.toFixed(1)} • Elapsed ${Math.floor(this.game.runTime)}s`,
      this.game.currentThemeDescription,
    ];
    entries.forEach((text) => {
      const block = this.doc.createElement("div");
      block.className = "world-entry";
      block.textContent = text;
      this.worldPanel.appendChild(block);
    });
  }

  renderQuickbar() {
    if (!this.game.player) {
      this.quickAssignText.textContent = "Click slot, then click consumable";
      return;
    }
    const pending = this.game.pendingQuickSlot;
    this.quickAssignText.textContent =
      pending === null ? "Click slot, then click consumable" : `Assigning to slot ${pending + 1}`;

    this.quickbarSlots.forEach((slot, index) => {
      const itemId = this.game.quickSlots[index];
      const item = itemId ? this.game.inventory.find((entry) => entry && entry.id === itemId) : null;
      slot.innerHTML = "";
      slot.classList.toggle("empty", !itemId);
      slot.classList.toggle("selected", pending === index);

      const key = this.doc.createElement("span");
      key.className = "action-key";
      key.textContent = `${index + 1}`;
      slot.appendChild(key);

      if (!itemId) return;
      const def = this.game.assets.itemIcons[itemId];
      const icon = this.doc.createElement("img");
      icon.className = "inventory-icon";
      icon.alt = itemId;
      icon.src = def.url;
      slot.appendChild(icon);

      const count = this.doc.createElement("span");
      count.className = "action-count";
      count.textContent = `${this.game.countInventoryItem(itemId)}`;
      slot.appendChild(count);

      const name = this.doc.createElement("span");
      name.className = "action-name";
      name.textContent = item?.name ?? itemId;
      slot.appendChild(name);
    });
  }

  renderSkillbar() {
    if (!this.game.player) return;
    this.skillSlots.forEach(({ slot, skillId }) => {
      const skill = this.game.player.skills[skillId];
      slot.innerHTML = "";
      slot.classList.remove("empty");

      const key = this.doc.createElement("span");
      key.className = "action-key";
      key.textContent = skill.key.replace("Key", "");
      slot.appendChild(key);

      const name = this.doc.createElement("span");
      name.className = "action-name";
      name.textContent = `${skill.name} • ${skill.manaCost} MP`;
      slot.appendChild(name);

      if (skill.current > 0) {
        const cd = this.doc.createElement("div");
        cd.className = "action-cooldown";
        cd.textContent = `${skill.current.toFixed(1)}s`;
        slot.appendChild(cd);
      }
    });
  }

  renderInteractions() {
    this.interactionPanel.innerHTML = "";
    const nearby = this.game.getInteractionContext();
    if (!nearby) {
      const empty = this.doc.createElement("div");
      empty.className = "interaction-entry";
      empty.textContent = "No interactable nearby.";
      this.interactionPanel.appendChild(empty);
      return;
    }

    const entry = this.doc.createElement("div");
    entry.className = "interaction-entry";
    entry.textContent = `${nearby.name}: ${nearby.description}`;
    this.interactionPanel.appendChild(entry);

    const actions = this.doc.createElement("div");
    actions.className = "interaction-actions";
    nearby.actions.forEach((action) => {
      const button = this.doc.createElement("button");
      button.className = "interaction-button";
      button.type = "button";
      const costs = [action.costGold ? `${action.costGold}g` : "", action.costEmber ? `${action.costEmber} ember` : ""]
        .filter(Boolean)
        .join(" • ");
      button.textContent = costs ? `${action.label} (${costs})` : action.label;
      button.addEventListener("click", () => this.game.handleInteractionAction(action.id));
      actions.appendChild(button);
    });
    this.interactionPanel.appendChild(actions);
  }

  renderItemActions() {
    const index = this.game.selectedInventoryIndex;
    const item = index === null || index === undefined ? null : this.game.inventory[index];
    if (!item || this.game.stashOpen) {
      this.itemActionCard.classList.add("hidden");
      return;
    }

    const primaryLabel =
      item.kind === "equipment" ? "Equip" : item.kind === "consumable" ? "Use" : null;

    this.itemActionCard.classList.remove("hidden");
    this.itemActionTitle.textContent = item.name;
    this.itemActionText.textContent = `${item.rarity}${item.slot ? ` • ${item.slot}` : ""} • ${item.description}`;
    this.itemPrimaryActionButton.classList.toggle("hidden", !primaryLabel);
    this.itemDropActionButton.classList.remove("hidden");
    if (primaryLabel) this.itemPrimaryActionButton.textContent = primaryLabel;
  }

  renderLog() {
    this.combatLog.innerHTML = "";
    this.game.logEntries.slice(0, MAX_LOG_ENTRIES).forEach((entry) => {
      const block = this.doc.createElement("div");
      block.className = "combat-entry";
      block.textContent = entry;
      this.combatLog.appendChild(block);
    });
  }

  toggleInventory() {
    this.toggleWindow("inventory");
    if (!this.inventoryVisible) this.tooltip.classList.add("hidden");
    else this.refreshTooltip();
  }

  toggleCharacter() {
    this.toggleWindow("character");
  }

  toggleWorld() {
    this.toggleWindow("world");
  }

  syncState(state) {
    if (state === GAME_STATE.MENU) {
      this.menuOverlay.classList.remove("hidden");
      this.screenOverlay.classList.add("hidden");
      this.restartButton.classList.add("hidden");
      this.startButton.classList.remove("hidden");
      return;
    }

    if (state === GAME_STATE.RUNNING) {
      this.menuOverlay.classList.add("hidden");
      this.screenOverlay.classList.add("hidden");
      return;
    }

    if (state === GAME_STATE.PAUSED) {
      this.menuOverlay.classList.add("hidden");
      this.screenOverlay.classList.remove("hidden");
      this.screenOverlay.textContent = "Paused";
      return;
    }

    if (state === GAME_STATE.GAME_OVER) {
      this.menuOverlay.classList.remove("hidden");
      this.screenOverlay.classList.add("hidden");
      this.menuTitle.textContent = "The Depths Claim Another";
      this.menuCopy.textContent =
        "Your run ends in the dark. Re-enter the shifting dungeon and bring back more than scars.";
      this.startButton.classList.add("hidden");
      this.restartButton.classList.remove("hidden");
    }
  }

  setMenuIntro() {
    this.menuTitle.textContent = "Descend the Emberfall";
    this.menuCopy.textContent =
      "Move through the outer sanctum, gear up, then descend through themed dungeons filled with champions and bosses.";
    this.startButton.classList.remove("hidden");
    this.restartButton.classList.add("hidden");
  }
}

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const TILE_SIZE = 48;
export const WORLD_COLS = 72;
export const WORLD_ROWS = 48;
export const INVENTORY_SIZE = 12;
export const STASH_SIZE = 16;
export const MAX_LOG_ENTRIES = 5;

export const GAME_STATE = {
  MENU: "menu",
  RUNNING: "running",
  PAUSED: "paused",
  GAME_OVER: "gameover",
};

export const TILE = {
  WALL: 0,
  FLOOR: 1,
  DOOR: 2,
};

export const DIRECTIONS = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
};

export const EQUIPMENT_SLOTS = ["weapon", "armor", "boots", "charm"];

export const CORE_STATS = ["strength", "dexterity", "vitality", "spirit"];

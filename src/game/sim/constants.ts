// Feel constants for the platformer. Units: tiles (1 tile = 1 block) and seconds.

export const GRAVITY_UP = 32; // rising while jump is held
export const GRAVITY_CUT = 85; // rising after jump released (short hop)
export const GRAVITY_DOWN = 60; // falling
export const MAX_FALL = 22;

export const JUMP_VELOCITY = 16.5;
export const JUMP_RUN_BONUS = 0.22; // extra jump velocity per unit of horizontal speed
export const STOMP_BOUNCE = 10;
export const STOMP_BOUNCE_HELD = 14;

export const WALK_SPEED = 6;
export const RUN_SPEED = 9.5;
export const GROUND_ACCEL = 28;
export const AIR_ACCEL = 18;
export const SKID_ACCEL = 48;
export const GROUND_DRAG = 11;
export const AIR_DRAG = 0.6;

export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER = 0.12;

export const PLAYER_W = 0.72;
export const SMALL_H = 0.95;
export const BIG_H = 1.85;
export const INVULN_TIME = 2;

export const ENEMY_SPEED = 2;
export const ENEMY_W = 0.85;
export const ENEMY_H = 0.85;
export const ENEMY_WAKE_DISTANCE = 15;
export const MUSHROOM_SPEED = 3.5;

export const LEVEL_TIME = 300;
export const TIME_SCALE = 2.5; // timer units per real second
export const DEATH_TIME = 3;
export const START_LIVES = 3;

export const MAX_SUBSTEP = 1 / 120;
export const PIT_Y = -4;

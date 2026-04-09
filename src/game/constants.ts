export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;
export const WALL_THICKNESS = 12;

export const GRAVITY_Y = -0.55; // Upwards gravity
export const INITIAL_VELOCITY_Y = -10;

export const SHAPE_PROPERTIES = {
  restitution: 0.2, // Low bounciness
  friction: 0.3,    // Low-mid friction
  density: 0.001,
};

export const LEVELS = [
  { level: 1, radius: 9, color: '#ef4444' }, // Red
  { level: 2, radius: 11, color: '#f97316' }, // Orange
  { level: 3, radius: 13, color: '#eab308' }, // Yellow
  { level: 4, radius: 15, color: '#22c55e' }, // Green
  { level: 5, radius: 17, color: '#0ea5e9' }, // Skyblue
  { level: 6, radius: 19, color: '#3b82f6' }, // Blue
  { level: 7, radius: 21, color: '#a855f7' }, // Purple
];

export const GET_LEVEL = (levelValue: number) => {
  return LEVELS.find(l => l.level === levelValue) || LEVELS[0];
};

export const SPAWN_WEIGHTS = [
  { level: 1, weight: 6 },
  { level: 2, weight: 3 },
  { level: 3, weight: 1 },
];

export const TARGET_WEIGHTS = [
  { level: 5, weight: 2 },
  { level: 6, weight: 3 },
  { level: 7, weight: 5 },
];

export const TARGET_SCORES: Record<number, number> = {
  5: 100,
  6: 250,
  7: 600,
};

export const getRandomSpawnLevel = () => {
  const totalWeight = SPAWN_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of SPAWN_WEIGHTS) {
    if (random < item.weight) return item.level;
    random -= item.weight;
  }
  return 1;
};

export const getRandomTargetLevel = () => {
  const totalWeight = TARGET_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of TARGET_WEIGHTS) {
    if (random < item.weight) return item.level;
    random -= item.weight;
  }
  return 5;
};

// src/utils/random.ts

export const getRandom = <T>(arr: T[]): T => {
  if (!arr || arr.length === 0) return undefined as any;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
};

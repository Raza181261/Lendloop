export const CATEGORIES = [
  "power-tools", "hand-tools", "garden", "kitchen",
  "camping", "cleaning", "automotive", "other",
] as const;

export const CONDITIONS = ["new", "good", "fair", "worn"] as const;

export const LIMITS = { nameMin: 2, nameMax: 80, descriptionMax: 500 } as const;

export const label = (value: string) => {
  const text = value.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};
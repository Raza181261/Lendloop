import { v } from "convex/values";
import { invalid } from "../lib/errors";

export const CATEGORIES = [
  "power-tools",
  "hand-tools",
  "garden",
  "kitchen",
  "camping",
  "cleaning",
  "automotive",
  "other",
] as const;

export const CONDITIONS = ["new", "good", "fair", "worn"] as const;

export const LIMITS = {
  nameMin: 2,
  nameMax: 80,
  descriptionMax: 500,
} as const;

export const toolFieldsValidator = {
  name: v.string(),
  category: v.string(),
  condition: v.string(),
  description: v.string(),
};

type ToolInput = {
  name: string;
  category: string;
  condition: string;
  description: string;
};

// Convex validators check types; this checks the business rules.
// Always runs on the server, so the UI can't bypass it.
export function validateToolInput(input: ToolInput): ToolInput {
  const name = input.name.trim();
  const description = input.description.trim();

  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
    throw invalid(
      `Name must be ${LIMITS.nameMin}-${LIMITS.nameMax} characters.`,
    );
  }
  if (description.length > LIMITS.descriptionMax) {
    throw invalid(
      `Description must be at most ${LIMITS.descriptionMax} characters.`,
    );
  }
  if (!(CATEGORIES as readonly string[]).includes(input.category)) {
    throw invalid("Invalid category.");
  }
  if (!(CONDITIONS as readonly string[]).includes(input.condition)) {
    throw invalid("Invalid condition.");
  }

  return { name, category: input.category, condition: input.condition, description };
}
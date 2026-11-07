import { ConvexError } from "convex/values";

// Turns our server errors (ConvexError with a message) into text for the UI.
export function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string } | string;
    return typeof data === "string" ? data : (data?.message ?? "Something went wrong.");
  }
  return "Something went wrong. Please try again.";
}
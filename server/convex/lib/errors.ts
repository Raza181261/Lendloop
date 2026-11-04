import { ConvexError } from "convex/values";

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT";

// ConvexError (unlike a plain Error) sends its data to the client in
// production, so the UI can show a proper message.
export function appError(code: AppErrorCode, message: string) {
  return new ConvexError({ code, message });
}

export const unauthenticated = (message = "You must be signed in.") =>
  appError("UNAUTHENTICATED", message);

export const forbidden = (message = "You are not allowed to do this.") =>
  appError("FORBIDDEN", message);

export const notFound = (message = "Not found.") =>
  appError("NOT_FOUND", message);

export const invalid = (message: string) => appError("VALIDATION", message);

export const conflict = (message: string) => appError("CONFLICT", message);
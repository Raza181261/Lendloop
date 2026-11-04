import { Doc } from "../_generated/dataModel";

type User = Doc<"users">;
type Tool = Doc<"tools">;
type Request = Doc<"requests">;
type Loan = Doc<"loans">;

export const isAdmin = (user: User) => user.role === "admin";

// ---- Tools ----
// Only the owner edits. Admin can delete (moderation) but not edit.
export const canEditTool = (user: User, tool: Tool) =>
  tool.ownerId === user._id;

export const canDeleteTool = (user: User, tool: Tool) =>
  isAdmin(user) || tool.ownerId === user._id;

// ---- Requests ----
export const canViewRequest = (user: User, req: Request) =>
  isAdmin(user) || req.ownerId === user._id || req.borrowerId === user._id;

// Only the tool's owner approves or declines.
export const canDecideRequest = (user: User, req: Request) =>
  req.ownerId === user._id;

// Only the borrower cancels their own request.
export const canCancelRequest = (user: User, req: Request) =>
  req.borrowerId === user._id;

// You can't borrow your own tool.
export const canRequestTool = (user: User, tool: Tool) =>
  tool.ownerId !== user._id;

// ---- Loans ----
export const canViewLoan = (user: User, loan: Loan) =>
  isAdmin(user) || loan.ownerId === user._id || loan.borrowerId === user._id;

// The lender confirms the tool came back.
export const canMarkReturned = (user: User, loan: Loan) =>
  loan.ownerId === user._id;

// ---- Admin-only actions ----
export const canManageUsers = (user: User) => isAdmin(user);
export const canViewAllLoans = (user: User) => isAdmin(user);
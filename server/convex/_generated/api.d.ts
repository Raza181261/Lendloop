/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as automation_activity from "../automation/activity.js";
import type * as automation_dispatch from "../automation/dispatch.js";
import type * as automation_hmac from "../automation/hmac.js";
import type * as automation_outbox from "../automation/outbox.js";
import type * as automation_reminders from "../automation/reminders.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as loans_mutations from "../loans/mutations.js";
import type * as loans_queries from "../loans/queries.js";
import type * as loans_rules from "../loans/rules.js";
import type * as requests_mutations from "../requests/mutations.js";
import type * as requests_queries from "../requests/queries.js";
import type * as requests_rules from "../requests/rules.js";
import type * as tools_mutations from "../tools/mutations.js";
import type * as tools_queries from "../tools/queries.js";
import type * as tools_validators from "../tools/validators.js";
import type * as users_internal from "../users/internal.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "automation/activity": typeof automation_activity;
  "automation/dispatch": typeof automation_dispatch;
  "automation/hmac": typeof automation_hmac;
  "automation/outbox": typeof automation_outbox;
  "automation/reminders": typeof automation_reminders;
  crons: typeof crons;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/errors": typeof lib_errors;
  "lib/permissions": typeof lib_permissions;
  "loans/mutations": typeof loans_mutations;
  "loans/queries": typeof loans_queries;
  "loans/rules": typeof loans_rules;
  "requests/mutations": typeof requests_mutations;
  "requests/queries": typeof requests_queries;
  "requests/rules": typeof requests_rules;
  "tools/mutations": typeof tools_mutations;
  "tools/queries": typeof tools_queries;
  "tools/validators": typeof tools_validators;
  "users/internal": typeof users_internal;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

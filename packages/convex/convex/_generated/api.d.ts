/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as auth_ResendOTP from "../auth/ResendOTP.js";
import type * as auth_ResendOTPReset from "../auth/ResendOTPReset.js";
import type * as auth_emailTemplate from "../auth/emailTemplate.js";
import type * as auth_passwordResetTemplate from "../auth/passwordResetTemplate.js";
import type * as connectors_connections from "../connectors/connections.js";
import type * as connectors_github from "../connectors/github.js";
import type * as connectors_index from "../connectors/index.js";
import type * as http from "../http.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_planLimits from "../lib/planLimits.js";
import type * as organizations_organizations from "../organizations/organizations.js";
import type * as products_index from "../products/index.js";
import type * as products_products from "../products/products.js";
import type * as userPreferences from "../userPreferences.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "auth/ResendOTP": typeof auth_ResendOTP;
  "auth/ResendOTPReset": typeof auth_ResendOTPReset;
  "auth/emailTemplate": typeof auth_emailTemplate;
  "auth/passwordResetTemplate": typeof auth_passwordResetTemplate;
  "connectors/connections": typeof connectors_connections;
  "connectors/github": typeof connectors_github;
  "connectors/index": typeof connectors_index;
  http: typeof http;
  "lib/access": typeof lib_access;
  "lib/planLimits": typeof lib_planLimits;
  "organizations/organizations": typeof organizations_organizations;
  "products/index": typeof products_index;
  "products/products": typeof products_products;
  userPreferences: typeof userPreferences;
  users: typeof users;
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

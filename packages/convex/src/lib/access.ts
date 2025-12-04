/**
 * Helpers centralizados de seguridad para verificar acceso a recursos.
 * CRÍTICO: Usar estos helpers en TODAS las queries/mutations que accedan
 * a datos de organizaciones o productos para garantizar seguridad multi-tenant.
 */

import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../../convex/_generated/server";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

type Context = QueryCtx | MutationCtx;

/**
 * Verifica que el usuario autenticado tiene acceso a una organización.
 * Lanza ConvexError si no tiene acceso.
 *
 * @throws ConvexError con code: "UNAUTHENTICATED" | "NOT_FOUND" | "FORBIDDEN"
 */
export async function assertOrgAccess(
  ctx: Context,
  organizationId: Id<"organizations">
): Promise<{
  membership: Doc<"organizationMembers">;
  organization: Doc<"organizations">;
}> {
  // 1. Obtener userId autenticado
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Usuario no autenticado",
    });
  }

  // 2. Verificar que existe la organización
  const organization = await ctx.db.get(organizationId);
  if (!organization) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Organización no encontrada",
    });
  }

  // 3. Verificar membership
  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "No tienes acceso a esta organización",
    });
  }

  return { membership, organization };
}

/**
 * Verifica que el usuario autenticado tiene acceso a un producto.
 * Realiza DOBLE VERIFICACIÓN: membership en producto Y en organización padre.
 * Lanza ConvexError si no tiene acceso.
 *
 * @throws ConvexError con code: "UNAUTHENTICATED" | "NOT_FOUND" | "FORBIDDEN"
 */
export async function assertProductAccess(
  ctx: Context,
  productId: Id<"products">
): Promise<{
  membership: Doc<"productMembers">;
  product: Doc<"products">;
  organization: Doc<"organizations">;
}> {
  // 1. Obtener userId autenticado
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Usuario no autenticado",
    });
  }

  // 2. Verificar que existe el producto
  const product = await ctx.db.get(productId);
  if (!product) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Producto no encontrado",
    });
  }

  // 3. Verificar que existe la organización padre
  const organization = await ctx.db.get(product.organizationId);
  if (!organization) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Organización no encontrada",
    });
  }

  // 4. Verificar membership en organización (DOBLE VERIFICACIÓN)
  const orgMembership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", product.organizationId).eq("userId", userId)
    )
    .first();

  if (!orgMembership) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "No tienes acceso a esta organización",
    });
  }

  // 5. Verificar membership en producto
  const membership = await ctx.db
    .query("productMembers")
    .withIndex("by_product_user", (q) =>
      q.eq("productId", productId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "No tienes acceso a este producto",
    });
  }

  return { membership, product, organization };
}

/**
 * Versión null-safe de assertOrgAccess.
 * Retorna null en lugar de lanzar error si no hay acceso.
 * Útil para verificaciones condicionales.
 */
export async function getOrgMembership(
  ctx: Context,
  organizationId: Id<"organizations">
): Promise<{
  membership: Doc<"organizationMembers">;
  organization: Doc<"organizations">;
} | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const organization = await ctx.db.get(organizationId);
  if (!organization) return null;

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();

  if (!membership) return null;

  return { membership, organization };
}

/**
 * Versión null-safe de assertProductAccess.
 * Retorna null en lugar de lanzar error si no hay acceso.
 * Realiza doble verificación: producto Y organización padre.
 * Útil para verificaciones condicionales.
 */
export async function getProductMembership(
  ctx: Context,
  productId: Id<"products">
): Promise<{
  membership: Doc<"productMembers">;
  product: Doc<"products">;
  organization: Doc<"organizations">;
} | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const product = await ctx.db.get(productId);
  if (!product) return null;

  const organization = await ctx.db.get(product.organizationId);
  if (!organization) return null;

  // Verificar membership en org
  const orgMembership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", product.organizationId).eq("userId", userId)
    )
    .first();

  if (!orgMembership) return null;

  // Verificar membership en producto
  const membership = await ctx.db
    .query("productMembers")
    .withIndex("by_product_user", (q) =>
      q.eq("productId", productId).eq("userId", userId)
    )
    .first();

  if (!membership) return null;

  return { membership, product, organization };
}

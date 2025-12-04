/**
 * Helpers de seguridad centralizados para verificar acceso a recursos.
 * CRÍTICO para la seguridad multi-tenant.
 *
 * Estos helpers deben usarse en TODAS las queries/mutations que accedan
 * a datos de organizaciones o productos.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/**
 * Verifica que el usuario tiene acceso a una organización.
 * Lanza error si no es miembro.
 *
 * @throws Error si el usuario no está autenticado o no es miembro de la org
 */
export async function assertOrgAccess(
  ctx: Ctx,
  organizationId: Id<"organizations">
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Usuario no autenticado");
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("No tienes acceso a esta organización");
  }

  const organization = await ctx.db.get(organizationId);
  if (!organization) {
    throw new Error("Organización no encontrada");
  }

  return { membership, organization, userId };
}

/**
 * Verifica que el usuario tiene acceso a un producto.
 * Lanza error si no es miembro.
 *
 * @throws Error si el usuario no está autenticado o no es miembro del producto
 */
export async function assertProductAccess(
  ctx: Ctx,
  productId: Id<"products">
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Usuario no autenticado");
  }

  const membership = await ctx.db
    .query("productMembers")
    .withIndex("by_product_user", (q) =>
      q.eq("productId", productId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("No tienes acceso a este producto");
  }

  const product = await ctx.db.get(productId);
  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const organization = await ctx.db.get(product.organizationId);
  if (!organization) {
    throw new Error("Organización no encontrada");
  }

  return { membership, product, organization, userId };
}

/**
 * Obtiene la membresía del usuario a una organización.
 * Retorna null si no es miembro (no lanza error).
 */
export async function getOrgMembership(
  ctx: Ctx,
  organizationId: Id<"organizations">
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();

  return membership;
}

/**
 * Obtiene la membresía del usuario a un producto.
 * Retorna null si no es miembro (no lanza error).
 */
export async function getProductMembership(
  ctx: Ctx,
  productId: Id<"products">
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const membership = await ctx.db
    .query("productMembers")
    .withIndex("by_product_user", (q) =>
      q.eq("productId", productId).eq("userId", userId)
    )
    .first();

  return membership;
}

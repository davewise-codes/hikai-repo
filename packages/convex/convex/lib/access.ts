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
 * Acceso se otorga si:
 * 1. El usuario es miembro directo del producto, O
 * 2. El usuario es owner/admin de la organización padre (acceso implícito)
 *
 * @throws Error si el usuario no está autenticado o no tiene acceso
 * @returns membership (real o virtual), product, organization, userId, isImplicitAccess
 */
export async function assertProductAccess(
  ctx: Ctx,
  productId: Id<"products">
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Usuario no autenticado");
  }

  const product = await ctx.db.get(productId);
  if (!product) {
    throw new Error("Producto no encontrado");
  }

  const organization = await ctx.db.get(product.organizationId);
  if (!organization) {
    throw new Error("Organización no encontrada");
  }

  // Check direct product membership first
  const productMembership = await ctx.db
    .query("productMembers")
    .withIndex("by_product_user", (q) =>
      q.eq("productId", productId).eq("userId", userId)
    )
    .first();

  if (productMembership) {
    return {
      membership: productMembership,
      product,
      organization,
      userId,
      isImplicitAccess: false,
    };
  }

  // No direct membership - check if org owner/admin (implicit access)
  const orgMembership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", product.organizationId).eq("userId", userId)
    )
    .first();

  if (orgMembership && (orgMembership.role === "owner" || orgMembership.role === "admin")) {
    // Org admins get implicit admin access to all products
    // Return a "virtual" membership object for compatibility
    return {
      membership: {
        _id: orgMembership._id, // Use org membership ID as reference
        productId,
        userId,
        role: "admin" as const,
        joinedAt: orgMembership.joinedAt,
      },
      product,
      organization,
      userId,
      isImplicitAccess: true,
    };
  }

  throw new Error("No tienes acceso a este producto");
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
 * Incluye acceso implícito para org owners/admins.
 * Retorna null si no tiene acceso (no lanza error).
 */
export async function getProductMembership(
  ctx: Ctx,
  productId: Id<"products">
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  // Check direct product membership first
  const productMembership = await ctx.db
    .query("productMembers")
    .withIndex("by_product_user", (q) =>
      q.eq("productId", productId).eq("userId", userId)
    )
    .first();

  if (productMembership) {
    return productMembership;
  }

  // No direct membership - check if org owner/admin (implicit access)
  const product = await ctx.db.get(productId);
  if (!product) {
    return null;
  }

  const orgMembership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization_user", (q) =>
      q.eq("organizationId", product.organizationId).eq("userId", userId)
    )
    .first();

  if (orgMembership && (orgMembership.role === "owner" || orgMembership.role === "admin")) {
    // Return a virtual membership for org admins
    return {
      _id: orgMembership._id,
      productId,
      userId,
      role: "admin" as const,
      joinedAt: orgMembership.joinedAt,
      isImplicitAccess: true,
    };
  }

  return null;
}

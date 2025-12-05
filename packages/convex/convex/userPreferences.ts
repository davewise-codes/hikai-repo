/**
 * Mutations para gestionar preferencias de usuario y trazabilidad.
 * Incluye tracking de último acceso a organizaciones y productos.
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertOrgAccess, assertProductAccess } from "./lib/access";

/**
 * Actualiza el último acceso del usuario a una organización.
 * Se llama cuando el usuario cambia de organización activa.
 *
 * Acciones:
 * 1. Upsert en userPreferences: lastOrgAccessAt y lastActiveOrgId
 * 2. Update en organizationMembers: lastAccessAt
 */
export const updateLastOrgAccess = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    // Verificar acceso (lanza error si no es miembro)
    const { userId } = await assertOrgAccess(ctx, organizationId);

    const now = Date.now();

    // Buscar preferencias existentes del usuario
    const existingPrefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingPrefs) {
      // Actualizar preferencias existentes
      await ctx.db.patch(existingPrefs._id, {
        lastOrgAccessAt: now,
        lastActiveOrgId: organizationId,
      });
    } else {
      // Crear nuevas preferencias
      await ctx.db.insert("userPreferences", {
        userId,
        lastOrgAccessAt: now,
        lastActiveOrgId: organizationId,
      });
    }

    // Actualizar lastAccessAt en organizationMembers
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .first();

    if (membership) {
      await ctx.db.patch(membership._id, {
        lastAccessAt: now,
      });
    }
  },
});

/**
 * Actualiza el último acceso del usuario a un producto.
 * Se llama cuando el usuario navega a la página de detalle de un producto.
 *
 * Acciones:
 * 1. Upsert en userPreferences: lastProductAccessAt y lastActiveProductId
 * 2. Update en productMembers: lastAccessAt
 */
export const updateLastProductAccess = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    // Verificar acceso (lanza error si no es miembro)
    const { userId } = await assertProductAccess(ctx, productId);

    const now = Date.now();

    // Buscar preferencias existentes del usuario
    const existingPrefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingPrefs) {
      // Actualizar preferencias existentes
      await ctx.db.patch(existingPrefs._id, {
        lastProductAccessAt: now,
        lastActiveProductId: productId,
      });
    } else {
      // Crear nuevas preferencias
      await ctx.db.insert("userPreferences", {
        userId,
        lastProductAccessAt: now,
        lastActiveProductId: productId,
      });
    }

    // Actualizar lastAccessAt en productMembers
    const membership = await ctx.db
      .query("productMembers")
      .withIndex("by_product_user", (q) =>
        q.eq("productId", productId).eq("userId", userId)
      )
      .first();

    if (membership) {
      await ctx.db.patch(membership._id, {
        lastAccessAt: now,
      });
    }
  },
});

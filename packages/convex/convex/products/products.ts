/**
 * Products CRUD - Gestión de productos dentro de organizaciones.
 *
 * SEGURIDAD: Todas las operaciones validan acceso mediante:
 * - assertOrgAccess: Para operaciones a nivel de organización
 * - assertProductAccess: Para operaciones a nivel de producto
 *
 * Un usuario DEBE ser miembro de la org para acceder a sus productos.
 * Un usuario DEBE ser miembro del producto para acceder a sus datos.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import {
  assertOrgAccess,
  assertProductAccess,
  getProductMembership,
} from "../lib/access";
import { checkLimit, type Plan } from "../lib/planLimits";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Lista productos de una organización.
 * Requiere ser miembro de la org.
 * Incluye userRole para cada producto:
 * - Rol directo si es miembro del producto
 * - "admin" implícito si es owner/admin de la org
 * - null si es solo miembro de la org sin acceso al producto
 */
export const listProducts = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    // Validar acceso a la org
    const { userId, membership: orgMembership } = await assertOrgAccess(ctx, organizationId);

    // Check if user is org owner/admin (gets implicit admin access to all products)
    const isOrgAdmin = orgMembership.role === "owner" || orgMembership.role === "admin";

    // Obtener productos de la org
    const products = await ctx.db
      .query("products")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Añadir memberCount y userRole a cada producto
    const productsWithDetails = await Promise.all(
      products.map(async (product) => {
        const members = await ctx.db
          .query("productMembers")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();

        // Buscar membresía directa del usuario en este producto
        const userMembership = members.find((m) => m.userId === userId);

        // userRole: direct membership > implicit org admin > null
        let userRole: "admin" | "member" | null = null;
        if (userMembership) {
          userRole = userMembership.role;
        } else if (isOrgAdmin) {
          userRole = "admin"; // Implicit admin access for org owners/admins
        }

        return {
          ...product,
          memberCount: members.length,
          userRole,
        };
      })
    );

    return productsWithDetails;
  },
});

/**
 * Obtiene un producto por ID.
 * Requiere ser miembro del producto.
 */
export const getProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const { product, organization, membership } = await assertProductAccess(
      ctx,
      productId
    );

    // Contar miembros
    const members = await ctx.db
      .query("productMembers")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    return {
      ...product,
      organization: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
      },
      memberCount: members.length,
      userRole: membership.role,
    };
  },
});

/**
 * Obtiene un producto por slug dentro de una organización.
 * Requiere ser miembro de la org.
 */
export const getProductBySlug = query({
  args: {
    organizationId: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, { organizationId, slug }) => {
    // Validar acceso a la org
    await assertOrgAccess(ctx, organizationId);

    const product = await ctx.db
      .query("products")
      .withIndex("by_organization_slug", (q) =>
        q.eq("organizationId", organizationId).eq("slug", slug)
      )
      .first();

    if (!product) {
      return null;
    }

    // Verificar si el usuario es miembro del producto
    const membership = await getProductMembership(ctx, product._id);

    if (!membership) {
      // Usuario es miembro de la org pero no del producto
      return null;
    }

    // Contar miembros
    const members = await ctx.db
      .query("productMembers")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect();

    return {
      ...product,
      memberCount: members.length,
      userRole: membership.role,
    };
  },
});

/**
 * Obtiene todos los productos donde el usuario es miembro.
 */
export const getUserProducts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Obtener membresías del usuario
    const memberships = await ctx.db
      .query("productMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Obtener productos con info de org
    const products = await Promise.all(
      memberships.map(async (membership) => {
        const product = await ctx.db.get(membership.productId);
        if (!product) return null;

        const organization = await ctx.db.get(product.organizationId);
        if (!organization) return null;

        return {
          ...product,
          role: membership.role,
          joinedAt: membership.joinedAt,
          organization: {
            _id: organization._id,
            name: organization.name,
            slug: organization.slug,
          },
        };
      })
    );

    return products.filter(Boolean);
  },
});

/**
 * Verifica si se puede crear un producto en la organización.
 * Valida límites del plan y permisos.
 */
export const canCreateProduct = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const { membership, organization } = await assertOrgAccess(ctx, organizationId);

    // Solo admin/owner pueden crear productos
    if (membership.role !== "owner" && membership.role !== "admin") {
      return {
        canCreate: false,
        reason: "Solo administradores pueden crear productos",
        currentCount: 0,
        maxAllowed: 0,
      };
    }

    // Contar productos existentes
    const products = await ctx.db
      .query("products")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    const currentCount = products.length;
    const plan = organization.plan as Plan;
    const limitCheck = checkLimit(plan, "maxProductsPerOrg", currentCount);

    if (!limitCheck.allowed) {
      return {
        canCreate: false,
        reason: `Has alcanzado el límite de ${limitCheck.limit} producto(s) en el plan ${plan}`,
        currentCount,
        maxAllowed: limitCheck.limit,
      };
    }

    return {
      canCreate: true,
      currentCount,
      maxAllowed: limitCheck.limit,
    };
  },
});

/**
 * Obtiene los miembros de un producto.
 * Requiere ser miembro del producto.
 */
export const getProductMembers = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await assertProductAccess(ctx, productId);

    const members = await ctx.db
      .query("productMembers")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    // Obtener info de usuarios
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
              }
            : null,
        };
      })
    );

    return membersWithUsers;
  },
});

/**
 * Obtiene miembros de la org que NO son miembros del producto.
 * Útil para el dropdown de "añadir miembro".
 */
export const getAvailableOrgMembers = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const { product, membership } = await assertProductAccess(ctx, productId);

    // Solo admin puede ver esto
    if (membership.role !== "admin") {
      return [];
    }

    // Obtener miembros de la org
    const orgMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", product.organizationId)
      )
      .collect();

    // Obtener miembros actuales del producto
    const productMembers = await ctx.db
      .query("productMembers")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    const productMemberIds = new Set(productMembers.map((m) => m.userId));

    // Filtrar org members que no están en el producto
    const available = await Promise.all(
      orgMembers
        .filter((m) => !productMemberIds.has(m.userId))
        .map(async (member) => {
          const user = await ctx.db.get(member.userId);
          return user
            ? {
                userId: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                orgRole: member.role,
              }
            : null;
        })
    );

    return available.filter(Boolean);
  },
});

/**
 * Obtiene los productos accedidos recientemente por el usuario.
 * Cross-org: retorna productos de todas las organizaciones del usuario.
 */
export const getRecentProducts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Obtener membresías del usuario que tienen lastAccessAt
    const memberships = await ctx.db
      .query("productMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filtrar las que tienen lastAccessAt y ordenar por acceso más reciente
    const membershipsWithAccess = memberships
      .filter((m) => m.lastAccessAt != null)
      .sort((a, b) => (b.lastAccessAt || 0) - (a.lastAccessAt || 0))
      .slice(0, 5); // Limitar a 5

    // Obtener datos de los productos con info de org
    const recentProducts = await Promise.all(
      membershipsWithAccess.map(async (membership) => {
        const product = await ctx.db.get(membership.productId);
        if (!product) return null;

        const organization = await ctx.db.get(product.organizationId);
        if (!organization) return null;

        return {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          organization: {
            _id: organization._id,
            name: organization.name,
            slug: organization.slug,
          },
          role: membership.role,
          lastAccessAt: membership.lastAccessAt!,
        };
      })
    );

    return recentProducts.filter(Boolean) as NonNullable<
      (typeof recentProducts)[number]
    >[];
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Crea un nuevo producto.
 * Solo admin/owner de la org pueden crear.
 * El creador se añade automáticamente como admin del producto.
 */
export const createProduct = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    baseline: v.optional(
      v.object({
        valueProposition: v.optional(v.string()),
        problemSolved: v.optional(v.string()),
        targetMarket: v.optional(v.string()),
        productType: v.optional(v.string()),
        businessModel: v.optional(v.string()),
        stage: v.optional(v.string()),
        industries: v.optional(v.array(v.string())),
        audiences: v.optional(v.array(v.string())),
        productVision: v.optional(v.string()),
        strategicPillars: v.optional(v.array(v.string())),
        metricsOfInterest: v.optional(v.array(v.string())),
        personas: v.optional(
          v.array(
            v.object({
              role: v.string(),
              goals: v.array(v.string()),
              painPoints: v.array(v.string()),
              preferredTone: v.string(),
            })
          )
        ),
      })
    ),
  },
  handler: async (ctx, { organizationId, name, slug, baseline }) => {
    const { membership, organization, userId } = await assertOrgAccess(
      ctx,
      organizationId
    );

    // Validar permisos
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Solo administradores pueden crear productos");
    }

    // Validar límites
    const products = await ctx.db
      .query("products")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    const plan = organization.plan as Plan;
    const limitCheck = checkLimit(plan, "maxProductsPerOrg", products.length);

    if (!limitCheck.allowed) {
      throw new Error(
        `Has alcanzado el límite de ${limitCheck.limit} producto(s) en el plan ${plan}`
      );
    }

    // Validar slug único dentro de la org
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("by_organization_slug", (q) =>
        q.eq("organizationId", organizationId).eq("slug", slug)
      )
      .first();

    if (existingProduct) {
      throw new Error("Ya existe un producto con ese slug en esta organización");
    }

    const now = Date.now();

    // Crear producto
    const productId = await ctx.db.insert("products", {
      organizationId,
      name,
      slug,
      productBaseline: baseline,
      createdAt: now,
      updatedAt: now,
    });

    // Añadir creador como admin del producto
    await ctx.db.insert("productMembers", {
      productId,
      userId,
      role: "admin",
      joinedAt: now,
    });

    return productId;
  },
});

/**
 * Actualiza un producto.
 * Solo admin del producto puede actualizar.
 */
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    languagePreference: v.optional(v.string()),
    releaseCadence: v.optional(v.string()),
    productBaseline: v.optional(
      v.object({
        valueProposition: v.optional(v.string()),
        problemSolved: v.optional(v.string()),
        targetMarket: v.optional(v.string()),
        productType: v.optional(v.string()),
        businessModel: v.optional(v.string()),
        stage: v.optional(v.string()),
        industries: v.optional(v.array(v.string())),
        audiences: v.optional(v.array(v.string())),
        productVision: v.optional(v.string()),
        strategicPillars: v.optional(v.array(v.string())),
        metricsOfInterest: v.optional(v.array(v.string())),
        personas: v.optional(
          v.array(
            v.object({
              role: v.string(),
              goals: v.array(v.string()),
              painPoints: v.array(v.string()),
              preferredTone: v.string(),
            })
          )
        ),
      })
    ),
  },
  handler: async (
    ctx,
    { productId, name, productBaseline, languagePreference, releaseCadence }
  ) => {
    const { membership } = await assertProductAccess(ctx, productId);

    if (membership.role !== "admin") {
      throw new Error("Solo administradores pueden actualizar el producto");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (name !== undefined) updates.name = name;
    if (languagePreference !== undefined) updates.languagePreference = languagePreference;
    if (releaseCadence !== undefined) updates.releaseCadence = releaseCadence;
    if (productBaseline !== undefined) updates.productBaseline = productBaseline;

    await ctx.db.patch(productId, updates);
    return productId;
  },
});

/**
 * Actualiza baseline de producto y dispara regeneración de contexto.
 * Solo admin del producto puede actualizar baseline.
 */
export const updateBaseline = mutation({
  args: {
    productId: v.id("products"),
    baseline: v.object({
      valueProposition: v.optional(v.string()),
      problemSolved: v.optional(v.string()),
      targetMarket: v.optional(v.string()),
      productType: v.optional(v.string()),
      businessModel: v.optional(v.string()),
      stage: v.optional(v.string()),
      industries: v.optional(v.array(v.string())),
      audiences: v.optional(v.array(v.string())),
      productVision: v.optional(v.string()),
      strategicPillars: v.optional(v.array(v.string())),
      metricsOfInterest: v.optional(v.array(v.string())),
      personas: v.optional(
        v.array(
          v.object({
            role: v.string(),
            goals: v.array(v.string()),
            painPoints: v.array(v.string()),
            preferredTone: v.string(),
          })
        )
      ),
    }),
  },
  handler: async (ctx, { productId, baseline }) => {
    const { membership } = await assertProductAccess(ctx, productId);

    // Solo admin puede modificar baseline
    if (membership.role !== "admin") {
      throw new Error("Only admins can update product baseline");
    }

    await ctx.db.patch(productId, {
      productBaseline: baseline,
      updatedAt: Date.now(),
    });

    // Disparar regeneración de contexto en background
    await ctx.scheduler.runAfter(0, api.agents.actions.generateProductContext, {
      productId,
      forceRefresh: true,
    });

    return { success: true };
  },
});

/**
 * Elimina un producto y todas sus membresías.
 * Solo admin del producto puede eliminar.
 */
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const { membership } = await assertProductAccess(ctx, productId);

    if (membership.role !== "admin") {
      throw new Error("Solo administradores pueden eliminar el producto");
    }

    // Eliminar todas las membresías
    const members = await ctx.db
      .query("productMembers")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    await Promise.all(members.map((member) => ctx.db.delete(member._id)));

    // Eliminar el producto
    await ctx.db.delete(productId);

    return productId;
  },
});

/**
 * Añade un miembro al producto.
 * Requiere: ser admin del producto, target debe ser miembro de la org.
 */
export const addProductMember = mutation({
  args: {
    productId: v.id("products"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, { productId, userId, role }) => {
    const { membership, product } = await assertProductAccess(ctx, productId);

    // Solo admin puede añadir miembros
    if (membership.role !== "admin") {
      throw new Error("Solo administradores pueden añadir miembros");
    }

    // Verificar que el target es miembro de la org
    const orgMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_user", (q) =>
        q.eq("organizationId", product.organizationId).eq("userId", userId)
      )
      .first();

    if (!orgMembership) {
      throw new Error("El usuario debe ser miembro de la organización primero");
    }

    // Verificar que no es ya miembro del producto
    const existingMembership = await ctx.db
      .query("productMembers")
      .withIndex("by_product_user", (q) =>
        q.eq("productId", productId).eq("userId", userId)
      )
      .first();

    if (existingMembership) {
      throw new Error("El usuario ya es miembro del producto");
    }

    // Añadir miembro
    const membershipId = await ctx.db.insert("productMembers", {
      productId,
      userId,
      role,
      joinedAt: Date.now(),
    });

    return membershipId;
  },
});

/**
 * Elimina un miembro del producto.
 * Admin puede eliminar a cualquiera, usuario puede eliminarse a sí mismo.
 * No se puede eliminar el último admin.
 */
export const removeProductMember = mutation({
  args: {
    productId: v.id("products"),
    userId: v.id("users"),
  },
  handler: async (ctx, { productId, userId }) => {
    const { membership, userId: requesterId } = await assertProductAccess(
      ctx,
      productId
    );

    const isSelfRemoval = requesterId === userId;
    const isAdmin = membership.role === "admin";

    if (!isSelfRemoval && !isAdmin) {
      throw new Error("No tienes permisos para eliminar miembros");
    }

    // Obtener la membresía a eliminar
    const targetMembership = await ctx.db
      .query("productMembers")
      .withIndex("by_product_user", (q) =>
        q.eq("productId", productId).eq("userId", userId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("El usuario no es miembro del producto");
    }

    // Verificar que no es el último admin
    if (targetMembership.role === "admin") {
      const adminCount = await ctx.db
        .query("productMembers")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (adminCount.length === 1) {
        throw new Error("No puedes eliminar el último administrador del producto");
      }
    }

    await ctx.db.delete(targetMembership._id);
    return targetMembership._id;
  },
});

/**
 * Actualiza el rol de un miembro del producto.
 * Solo admin puede cambiar roles.
 * No se puede degradar el último admin.
 */
export const updateProductMemberRole = mutation({
  args: {
    productId: v.id("products"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, { productId, userId, role }) => {
    const { membership } = await assertProductAccess(ctx, productId);

    if (membership.role !== "admin") {
      throw new Error("Solo administradores pueden cambiar roles");
    }

    // Obtener la membresía a actualizar
    const targetMembership = await ctx.db
      .query("productMembers")
      .withIndex("by_product_user", (q) =>
        q.eq("productId", productId).eq("userId", userId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("El usuario no es miembro del producto");
    }

    // Si se degrada de admin a member, verificar que no es el último admin
    if (targetMembership.role === "admin" && role === "member") {
      const adminCount = await ctx.db
        .query("productMembers")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (adminCount.length === 1) {
        throw new Error("No puedes degradar el último administrador del producto");
      }
    }

    await ctx.db.patch(targetMembership._id, { role });
    return targetMembership._id;
  },
});

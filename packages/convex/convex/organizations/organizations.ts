import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { PLAN_LIMITS, checkLimit, type Plan } from "../lib/planLimits";

// Query para obtener todas las organizaciones (pública)
export const listOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const organizations = await ctx.db.query("organizations").collect();
    return organizations;
  },
});

// Query para obtener una organización específica por slug
export const getOrganizationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    
    return organization;
  },
});

// Query para obtener las organizaciones donde el usuario es miembro
export const getUserOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Obtener las membresías del usuario
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Obtener las organizaciones correspondientes
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        return {
          ...org,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    return organizations.filter(Boolean);
  },
});

// Query para obtener los miembros de una organización
export const getOrganizationMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Obtener la información del usuario para cada miembro
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          user,
        };
      })
    );

    return membersWithUsers;
  },
});

// Query para obtener la organización personal del usuario
export const getPersonalOrg = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const personalOrg = await ctx.db
      .query("organizations")
      .withIndex("by_owner_personal", (q) =>
        q.eq("ownerId", userId).eq("isPersonal", true)
      )
      .first();

    return personalOrg;
  },
});

// Query para verificar si el usuario puede crear una nueva organización
export const canCreateOrganization = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { canCreate: false, reason: "Usuario no autenticado", currentCount: 0, maxAllowed: 0 };
    }

    // Obtener las membresías del usuario
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Obtener las orgs y filtrar las no-personales donde es owner
    const orgs = await Promise.all(
      memberships
        .filter((m) => m.role === "owner")
        .map((m) => ctx.db.get(m.organizationId))
    );

    const nonPersonalOrgs = orgs.filter((org) => org && !org.isPersonal);
    const currentCount = nonPersonalOrgs.length;

    // Por ahora usamos plan free para el límite base
    // Esto se puede mejorar basándose en el plan más alto del usuario
    const maxAllowed = PLAN_LIMITS.free.maxOrganizations;

    const limitCheck = checkLimit("free", "maxOrganizations", currentCount);

    if (!limitCheck.allowed) {
      return {
        canCreate: false,
        reason: `Has alcanzado el límite de ${maxAllowed} organización(es) en el plan gratuito`,
        currentCount,
        maxAllowed,
      };
    }

    return {
      canCreate: true,
      currentCount,
      maxAllowed,
    };
  },
});

// Query para obtener las organizaciones del usuario con detalles adicionales
export const getUserOrganizationsWithDetails = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Obtener las membresías del usuario
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Obtener las organizaciones con detalles
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) return null;

        // Contar miembros de la org
        const members = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", membership.organizationId)
          )
          .collect();

        return {
          ...org,
          role: membership.role,
          joinedAt: membership.joinedAt,
          memberCount: members.length,
        };
      })
    );

    // Filtrar nulls y ordenar: personal primero, luego por nombre
    return organizations
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.isPersonal && !b!.isPersonal) return -1;
        if (!a!.isPersonal && b!.isPersonal) return 1;
        return a!.name.localeCompare(b!.name);
      }) as NonNullable<typeof organizations[number]>[];
  },
});

// Mutation para crear una nueva organización
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise"))),
    isPersonal: v.optional(v.boolean()),
  },
  handler: async (ctx, { name, slug, description, plan = "free", isPersonal = false }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Validar límites solo para orgs no personales
    if (!isPersonal) {
      const memberships = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const orgs = await Promise.all(
        memberships
          .filter((m) => m.role === "owner")
          .map((m) => ctx.db.get(m.organizationId))
      );

      const nonPersonalOrgs = orgs.filter((org) => org && !org.isPersonal);
      const currentCount = nonPersonalOrgs.length;
      const maxAllowed = PLAN_LIMITS.free.maxOrganizations;

      if (currentCount >= maxAllowed) {
        throw new Error(
          `Has alcanzado el límite de ${maxAllowed} organización(es) en el plan gratuito`
        );
      }
    }

    // Verificar que el slug no esté en uso
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existingOrg) {
      throw new Error("El slug ya está en uso");
    }

    const now = Date.now();

    // Crear la organización
    const organizationId = await ctx.db.insert("organizations", {
      name,
      slug,
      description,
      ownerId: userId,
      plan,
      isPersonal,
      createdAt: now,
      updatedAt: now,
    });

    // Añadir al creador como owner en la tabla de miembros
    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId,
      role: "owner",
      joinedAt: now,
    });

    return organizationId;
  },
});

// Mutation para actualizar una organización
export const updateOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, name, description }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario es owner o admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("No tienes permisos para actualizar esta organización");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    await ctx.db.patch(organizationId, updates);
    return organizationId;
  },
});

// Mutation para añadir un miembro a la organización
export const addMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    userEmail: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, { organizationId, userEmail, role }) => {
    const requesterId = await getAuthUserId(ctx);
    if (!requesterId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el solicitante es owner o admin
    const requesterMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", requesterId)
      )
      .first();

    if (!requesterMembership || (requesterMembership.role !== "owner" && requesterMembership.role !== "admin")) {
      throw new Error("No tienes permisos para añadir miembros");
    }

    // Buscar el usuario por email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), userEmail))
      .first();

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Verificar que no sea ya miembro
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", user._id)
      )
      .first();

    if (existingMembership) {
      throw new Error("El usuario ya es miembro de la organización");
    }

    // Añadir el miembro
    const membershipId = await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: user._id,
      role,
      joinedAt: Date.now(),
    });

    return membershipId;
  },
});

// Mutation para eliminar un miembro de la organización
export const removeMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, { organizationId, userId }) => {
    const requesterId = await getAuthUserId(ctx);
    if (!requesterId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el solicitante es owner o admin (o se está eliminando a sí mismo)
    const requesterMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", requesterId)
      )
      .first();

    const isSelfRemoval = requesterId === userId;
    const hasPermission = requesterMembership && 
      (requesterMembership.role === "owner" || requesterMembership.role === "admin");

    if (!isSelfRemoval && !hasPermission) {
      throw new Error("No tienes permisos para eliminar miembros");
    }

    // Obtener la membresía a eliminar
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("El usuario no es miembro de la organización");
    }

    // No permitir que el owner se elimine a sí mismo si es el último owner
    if (membership.role === "owner") {
      const ownerCount = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
        .filter((q) => q.eq(q.field("role"), "owner"))
        .collect();

      if (ownerCount.length === 1) {
        throw new Error("No puedes eliminar el último owner de la organización");
      }
    }

    await ctx.db.delete(membership._id);
    return membership._id;
  },
});

// Mutation para eliminar una organización (solo owner)
export const deleteOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario es owner
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_user", (q) => 
        q.eq("organizationId", organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "owner") {
      throw new Error("Solo el owner puede eliminar la organización");
    }

    // Eliminar todos los miembros
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();

    await Promise.all(members.map(member => ctx.db.delete(member._id)));

    // Eliminar la organización
    await ctx.db.delete(organizationId);
    return organizationId;
  },
});

// Helper para generar slug URL-friendly
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Eliminar caracteres especiales
    .replace(/[\s_-]+/g, "-") // Reemplazar espacios y underscores por guiones
    .replace(/^-+|-+$/g, ""); // Eliminar guiones al inicio y final
}

// Internal mutation para crear organización personal (llamada desde auth callback)
export const createPersonalOrg = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // 1. Verificar que no existe org personal
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_owner_personal", (q) =>
        q.eq("ownerId", userId).eq("isPersonal", true)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // 2. Obtener user para nombre
    const user = await ctx.db.get(userId);
    const orgName = user?.name || user?.email?.split("@")[0] || "Personal";

    // 3. Generar slug único
    const baseSlug = slugify(orgName) || "personal";
    let slug = baseSlug;
    let suffix = 0;

    while (
      await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first()
    ) {
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    // 4. Crear org + membership
    const now = Date.now();
    const orgId = await ctx.db.insert("organizations", {
      name: orgName,
      slug,
      isPersonal: true,
      plan: "free",
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId,
      role: "owner",
      joinedAt: now,
    });

    return orgId;
  },
});
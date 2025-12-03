import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Query de debug para verificar autenticación con Convex Auth
export const debugAuth = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    // Obtener el usuario de la DB si está autenticado
    let user = null;
    if (userId !== null) {
      user = await ctx.db.get(userId);
    }

    return {
      isAuthenticated: !!userId,
      userId,
      identity: user ? {
        subject: userId,
        email: user.email,
        name: user.name,
        image: user.image
      } : null,
      timestamp: Date.now()
    };
  },
});

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
    console.log("getUserOrganizations - userId:", userId);
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

// Mutation de test sin autenticación
export const createOrganizationTest = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { name, slug, description }) => {
    console.log("createOrganizationTest - creating without auth check");
    
    // Buscar cualquier usuario existente para usar como owner
    const existingUser = await ctx.db.query("users").first();
    if (!existingUser) {
      throw new Error("No hay usuarios en el sistema para crear la organización");
    }
    
    console.log("createOrganizationTest - using existing user:", existingUser._id);
    
    // Verificar que el slug no esté en uso
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existingOrg) {
      throw new Error("El slug ya está en uso");
    }

    const now = Date.now();

    // Crear la organización con un usuario real
    const organizationId = await ctx.db.insert("organizations", {
      name,
      slug,
      description,
      ownerId: existingUser._id,
      createdAt: now,
      updatedAt: now,
    });

    // También añadir la membresía
    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: existingUser._id,
      role: "owner",
      joinedAt: now,
    });

    console.log("createOrganizationTest - created organization:", organizationId);
    return organizationId;
  },
});

// Mutation para crear una nueva organización (con auth)
export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { name, slug, description }) => {
    const userId = await getAuthUserId(ctx);
    console.log("createOrganization - userId:", userId);
    
    if (!userId) {
      throw new Error("Usuario no autenticado");
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
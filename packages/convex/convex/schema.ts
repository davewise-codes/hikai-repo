import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Schema principal que incluye las tablas de auth
const schema = defineSchema({
  ...authTables,

  // Preferencias de usuario (separado de authTables para no modificar users)
  userPreferences: defineTable({
    userId: v.id("users"),
    lastOrgAccessAt: v.optional(v.number()),
    lastProductAccessAt: v.optional(v.number()),
    lastActiveOrgId: v.optional(v.id("organizations")),
    lastActiveProductId: v.optional(v.id("products")),
  }).index("by_user", ["userId"]),

  // Tablas de organizaciones
  organizations: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly identifier
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
    isPersonal: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"])
    .index("by_owner_personal", ["ownerId", "isPersonal"]),

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member")
    ),
    joinedAt: v.number(),
    lastAccessAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_organization_user", ["organizationId", "userId"]),

  // Tablas de productos
  products: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_slug", ["organizationId", "slug"]),

  productMembers: defineTable({
    productId: v.id("products"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
    lastAccessAt: v.optional(v.number()),
  })
    .index("by_product", ["productId"])
    .index("by_user", ["userId"])
    .index("by_product_user", ["productId", "userId"]),
});

export default schema;
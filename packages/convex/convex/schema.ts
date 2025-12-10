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

  // Catálogo de tipos de conector disponibles
  connectorTypes: defineTable({
    type: v.union(v.literal("source"), v.literal("channel")),
    provider: v.string(), // "github", "twitter", "linkedin"
    name: v.string(),
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    isEnabled: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_provider", ["provider"]),

  // Conexiones de un producto a sources/channels
  connections: defineTable({
    productId: v.id("products"),
    connectorTypeId: v.id("connectorTypes"),
    name: v.string(), // Nombre dado por el usuario (ej: "hikai-repo")
    config: v.any(), // Configuración específica del provider (repo, owner, etc.)
    status: v.union(
      v.literal("pending"), // Esperando OAuth
      v.literal("active"), // Conectado y funcionando
      v.literal("error"), // Error de conexión
      v.literal("disconnected") // Desconectado manualmente
    ),
    credentials: v.optional(
      v.object({
        accessToken: v.optional(v.string()),
        refreshToken: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
      })
    ),
    lastSyncAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_product_type", ["productId", "connectorTypeId"])
    .index("by_status", ["status"]),

  rawEvents: defineTable({
    productId: v.id("products"),
    connectionId: v.id("connections"),
    provider: v.literal("github"),
    sourceType: v.union(
      v.literal("commit"),
      v.literal("pull_request"),
      v.literal("release")
    ),
    payload: v.any(),
    occurredAt: v.number(),
    ingestedAt: v.number(),
    processedAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("processed"),
      v.literal("error")
    ),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product_time", ["productId", "ingestedAt"])
    .index("by_connection_time", ["connectionId", "ingestedAt"])
    .index("by_status", ["status"]),

  interpretedEvents: defineTable({
    productId: v.id("products"),
    rawEventId: v.id("rawEvents"),
    kind: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    occurredAt: v.number(),
    relevance: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product_time", ["productId", "occurredAt"])
    .index("by_raw_event", ["rawEventId"]),
});

export default schema;

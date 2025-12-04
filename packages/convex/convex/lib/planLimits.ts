/**
 * Sistema centralizado de límites por plan y verificación de features.
 * Usado para determinar qué puede hacer cada organización según su plan.
 */

// Tipos de planes disponibles
export type Plan = "free" | "pro" | "enterprise";

// Estructura de límites por plan
export interface PlanLimits {
  maxOrganizations: number;
  maxProductsPerOrg: number;
  maxMembersPerOrg: number;
}

// Límites por plan
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxOrganizations: 1,
    maxProductsPerOrg: 1,
    maxMembersPerOrg: 5,
  },
  pro: {
    maxOrganizations: 5,
    maxProductsPerOrg: 10,
    maxMembersPerOrg: 50,
  },
  enterprise: {
    maxOrganizations: Infinity,
    maxProductsPerOrg: Infinity,
    maxMembersPerOrg: Infinity,
  },
};

// Features disponibles por plan
export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: ["basic_analytics"],
  pro: [
    "basic_analytics",
    "advanced_analytics",
    "team_collaboration",
    "api_access",
  ],
  enterprise: [
    "basic_analytics",
    "advanced_analytics",
    "team_collaboration",
    "api_access",
    "custom_integrations",
    "sso",
  ],
};

/**
 * Obtiene los límites de un plan
 */
export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Verifica si un recurso está dentro del límite del plan
 */
export function checkLimit(
  plan: Plan,
  resource: keyof PlanLimits,
  current: number
): {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
} {
  const limits = PLAN_LIMITS[plan];
  const limit = limits[resource];
  const remaining = Math.max(0, limit - current);

  return {
    allowed: current < limit,
    limit,
    current,
    remaining,
  };
}

/**
 * Verifica si un plan tiene acceso a una feature
 */
export function canAccessFeature(plan: Plan, feature: string): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

/**
 * Obtiene todas las features disponibles para un plan
 */
export function getAvailableFeatures(plan: Plan): string[] {
  return PLAN_FEATURES[plan];
}

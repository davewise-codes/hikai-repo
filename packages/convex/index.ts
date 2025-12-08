// Export Convex API for use in apps
export { api, internal } from './convex/_generated/api';

// Export plan limits and helpers for use in frontend
export {
  PLAN_LIMITS,
  PLAN_FEATURES,
  getPlanLimits,
  checkLimit,
  canAccessFeature,
  getAvailableFeatures,
  isProfessionalPlan,
  PROFESSIONAL_PLANS,
  type Plan,
  type ProfessionalPlan,
  type PlanLimits,
} from './convex/lib/planLimits';
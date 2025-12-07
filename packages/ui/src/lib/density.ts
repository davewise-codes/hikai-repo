export type Density = "compact" | "normal" | "comfortable";

export interface DensityConfig {
  name: Density;
  displayName: string;
  description: string;
}

export const densities: Record<Density, DensityConfig> = {
  compact: {
    name: "compact",
    displayName: "Compact",
    description: "More information, smaller elements",
  },
  normal: {
    name: "normal",
    displayName: "Normal",
    description: "Balanced view",
  },
  comfortable: {
    name: "comfortable",
    displayName: "Comfortable",
    description: "Larger elements, more spacing",
  },
};

export const defaultDensity: Density = "normal";

/**
 * Helper to get the CSS class for a density level
 */
export function getDensityClass(density: Density): string {
  return `density-${density}`;
}

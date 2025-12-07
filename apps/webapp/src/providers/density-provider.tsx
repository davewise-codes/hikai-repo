import { ReactNode, useEffect } from "react";
import { useDensity } from "@/domains/core";
import { getDensityClass, densities, Density } from "@hikai/ui";

interface DensityProviderProps {
  children: ReactNode;
}

export function DensityProvider({ children }: DensityProviderProps) {
  const { density } = useDensity();

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all density classes
    Object.keys(densities).forEach((d) => {
      root.classList.remove(getDensityClass(d as Density));
    });

    // Add current density class
    root.classList.add(getDensityClass(density));
  }, [density]);

  return <>{children}</>;
}

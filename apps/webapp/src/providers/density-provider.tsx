import { ReactNode, useEffect } from "react";
import { useFontSize } from "@/domains/core";
import { getFontSizeClass, fontSizes, FontSize } from "@hikai/ui";

interface FontSizeProviderProps {
  children: ReactNode;
}

export function FontSizeProvider({ children }: FontSizeProviderProps) {
  const { fontSize } = useFontSize();

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all font size classes
    Object.keys(fontSizes).forEach((fs) => {
      root.classList.remove(getFontSizeClass(fs as FontSize));
    });

    // Add current font size class
    root.classList.add(getFontSizeClass(fontSize));
  }, [fontSize]);

  return <>{children}</>;
}

// Backwards compatibility alias (deprecated)
export const DensityProvider = FontSizeProvider;

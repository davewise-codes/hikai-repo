import { ReactNode } from "react";

interface FontProviderProps {
	children: ReactNode;
	className?: string;
}

/**
 * FontProvider - Provides theme fonts to the application
 * Simply applies antialiasing and any additional classes
 * Fonts are loaded via CSS @font-face declarations
 */
export function FontProvider({ children, className = "" }: FontProviderProps) {
	return <div className={`antialiased ${className}`}>{children}</div>;
}

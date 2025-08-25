"use client";

import { ReactNode } from "react";

interface FontProviderProps {
  children: ReactNode;
  className?: string;
}

export function FontProvider({ children, className = "" }: FontProviderProps) {
  return <div className={`antialiased ${className}`}>{children}</div>;
}
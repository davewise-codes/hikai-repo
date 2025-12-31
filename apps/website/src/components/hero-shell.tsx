"use client";

import { ReactNode } from "react";

interface HeroShellProps {
	children: ReactNode;
}

export function HeroShell({ children }: HeroShellProps) {
	return (
		<div className="hero-shell">
			<div className="hero-bg" />
			<div className="hero-gradient" />
			<div className="hero-grid" />
			<div className="hero-grid-streaks" />
			{children}
		</div>
	);
}

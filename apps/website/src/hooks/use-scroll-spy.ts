"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollSpy(sectionIds: string[]) {
	const [activeSection, setActiveSection] = useState<string | null>(null);
	const rafId = useRef<number | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const isDesktop = window.matchMedia("(min-width: 768px)").matches;
		if (!isDesktop) {
			return;
		}

		const elements = sectionIds
			.map((id) => document.getElementById(id))
			.filter((el): el is HTMLElement => Boolean(el));

		if (elements.length === 0) {
			return;
		}

		const handleScroll = () => {
			if (rafId.current) {
				return;
			}
			rafId.current = window.requestAnimationFrame(() => {
				rafId.current = null;
				const offset = 120;
				let nextActive: string | null = null;

				for (const el of elements) {
					const rect = el.getBoundingClientRect();
					if (rect.top <= offset && rect.bottom > offset) {
						nextActive = el.id;
						break;
					}
				}

				setActiveSection(nextActive);
			});
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("resize", handleScroll, { passive: true });

		return () => {
			if (rafId.current) {
				window.cancelAnimationFrame(rafId.current);
			}
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleScroll);
		};
	}, [sectionIds]);

	return activeSection;
}

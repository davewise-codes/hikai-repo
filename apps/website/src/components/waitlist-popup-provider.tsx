"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@hikai/ui";

type WaitlistPopupContextValue = {
	open: () => void;
	close: () => void;
};

const WaitlistPopupContext = createContext<WaitlistPopupContextValue | null>(null);

const TALLY_SCRIPT_SRC = "https://tally.so/widgets/embed.js";

function loadTallyEmbeds() {
	if (typeof window === "undefined") {
		return;
	}

	const win = window as typeof window & { Tally?: { loadEmbeds?: () => void } };
	if (win.Tally?.loadEmbeds) {
		win.Tally.loadEmbeds();
		return;
	}

	if (!document.querySelector(`script[src="${TALLY_SCRIPT_SRC}"]`)) {
		const script = document.createElement("script");
		script.src = TALLY_SCRIPT_SRC;
		script.async = true;
		script.onload = () => win.Tally?.loadEmbeds?.();
		script.onerror = () => win.Tally?.loadEmbeds?.();
		document.body.appendChild(script);
		return;
	}

	document
		.querySelectorAll('iframe[data-tally-src]:not([src])')
		.forEach((iframe) => {
			const element = iframe as HTMLIFrameElement & { dataset: { tallySrc?: string } };
			if (element.dataset.tallySrc) {
				element.src = element.dataset.tallySrc;
			}
		});
}

export function WaitlistPopupProvider({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const [openCount, setOpenCount] = useState(0);

	useEffect(() => {
		if (isOpen) {
			setOpenCount((count) => count + 1);
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			loadTallyEmbeds();
		}, 50);

		return () => window.clearTimeout(timeoutId);
	}, [isOpen, openCount]);

	const open = useCallback(() => setIsOpen(true), []);
	const close = useCallback(() => setIsOpen(false), []);
	const value = useMemo(() => ({ open, close }), [open, close]);

	return (
		<WaitlistPopupContext.Provider value={value}>
			{children}
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-2xl p-4 sm:p-6 bg-transparent border-none shadow-none">
					<DialogTitle className="sr-only">Join Hikai Beta Waitlist</DialogTitle>
					<div className="max-h-[80vh] overflow-y-auto rounded-3xl bg-white p-2 sm:p-3 shadow-2xl">
						<iframe
							key={openCount}
							data-tally-src="https://tally.so/embed/EkdL1q?alignLeft=1&hideTitle=1&dynamicHeight=1"
							loading="lazy"
							width="100%"
							height="585"
							frameBorder={0}
							marginHeight={0}
							marginWidth={0}
							title="Join Hikai Beta Waitlist"
							className="w-full rounded-2xl"
						/>
					</div>
				</DialogContent>
			</Dialog>
		</WaitlistPopupContext.Provider>
	);
}

export function useWaitlistPopup() {
	const context = useContext(WaitlistPopupContext);
	if (!context) {
		throw new Error("useWaitlistPopup must be used within WaitlistPopupProvider");
	}
	return context;
}

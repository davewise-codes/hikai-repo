"use client";

import { Button, type ButtonProps } from "@hikai/ui";
import { ReactNode } from "react";
import { useWaitlistPopup } from "@/components/waitlist-popup-provider";

type WaitlistButtonProps = {
	children: ReactNode;
	className?: string;
	size?: ButtonProps["size"];
	variant?: ButtonProps["variant"];
};

export function WaitlistButton({
	children,
	className,
	size = "lg",
	variant,
}: WaitlistButtonProps) {
	const { open } = useWaitlistPopup();

	return (
		<Button type="button" size={size} variant={variant} className={className} onClick={open}>
			{children}
		</Button>
	);
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const logoVariants = cva("h-full w-full", {
	variants: {
		variant: {
			mono: "text-current",
			brand: "text-brand-primary",
			inverse: "text-brand-primary-inverse",
		},
		tone: {
			auto: "",
			light: "",
			dark: "",
		},
	},
	compoundVariants: [
		{
			variant: "brand",
			tone: "light",
			className: "text-brand-primary-light",
		},
		{
			variant: "brand",
			tone: "dark",
			className: "text-brand-primary-dark",
		},
		{
			variant: "inverse",
			tone: "light",
			className: "text-brand-primary-inverse-light",
		},
		{
			variant: "inverse",
			tone: "dark",
			className: "text-brand-primary-inverse-dark",
		},
	],
	defaultVariants: {
		variant: "brand",
		tone: "auto",
	},
});

const logoDotVariants = cva("", {
	variants: {
		variant: {
			mono: "fill-background",
			brand: "fill-brand-primary-inverse",
			inverse: "fill-brand-primary",
		},
		tone: {
			auto: "",
			light: "",
			dark: "",
		},
	},
	compoundVariants: [
		{
			variant: "brand",
			tone: "light",
			className: "fill-brand-primary-inverse-light",
		},
		{
			variant: "brand",
			tone: "dark",
			className: "fill-brand-primary-inverse-dark",
		},
		{
			variant: "inverse",
			tone: "light",
			className: "fill-brand-primary-light",
		},
		{
			variant: "inverse",
			tone: "dark",
			className: "fill-brand-primary-dark",
		},
	],
	defaultVariants: {
		variant: "brand",
		tone: "auto",
	},
});

export interface HikaiIsotipoProps
	extends React.SVGProps<SVGSVGElement>,
		VariantProps<typeof logoVariants> {
	decorative?: boolean;
	title?: string;
}

const HikaiIsotipo = React.forwardRef<SVGSVGElement, HikaiIsotipoProps>(
	(
		{
			className,
			variant,
			tone,
			decorative = false,
			title,
			"aria-label": ariaLabel,
			...props
		},
		ref,
	) => {
		const resolvedLabel = decorative
			? undefined
			: ariaLabel ?? title ?? "Hikai logo";

		return (
			<svg
				ref={ref}
				viewBox="0 0 1085 1085"
				xmlns="http://www.w3.org/2000/svg"
				width="100%"
				height="100%"
				preserveAspectRatio="xMidYMid meet"
				className={cn(logoVariants({ variant, tone, className }))}
				role={resolvedLabel ? "img" : undefined}
				aria-hidden={resolvedLabel ? undefined : true}
				aria-label={resolvedLabel}
				focusable="false"
				{...props}
			>
				{title ? <title>{title}</title> : null}
				<circle cx="542.5" cy="542.5" r="542.5" fill="currentColor" />
				<circle
					cx="719.5"
					cy="730.5"
					r="98.5"
					className={cn(logoDotVariants({ variant, tone }))}
				/>
			</svg>
		);
	},
);
HikaiIsotipo.displayName = "HikaiIsotipo";

export { HikaiIsotipo };

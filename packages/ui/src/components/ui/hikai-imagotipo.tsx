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

export interface HikaiImagotipoProps
	extends React.SVGProps<SVGSVGElement>,
		VariantProps<typeof logoVariants> {
	decorative?: boolean;
	title?: string;
}

const HikaiImagotipo = React.forwardRef<SVGSVGElement, HikaiImagotipoProps>(
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
				viewBox="0 0 4161 1085"
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
				<circle cx="506" cy="543" r="506" fill="currentColor" />
				<circle
					cx="671.092"
					cy="718.351"
					r="91.8728"
					className={cn(logoDotVariants({ variant, tone }))}
				/>
				<path
					d="M1264.73 906V178.727H1396.48V486.611H1733.48V178.727H1865.59V906H1733.48V597.051H1396.48V906H1264.73ZM2043.19 906V360.545H2171.74V906H2043.19ZM2107.82 283.131C2087.46 283.131 2069.94 276.384 2055.27 262.889C2040.59 249.158 2033.25 232.705 2033.25 213.528C2033.25 194.116 2040.59 177.662 2055.27 164.168C2069.94 150.437 2087.46 143.571 2107.82 143.571C2128.42 143.571 2145.94 150.437 2160.38 164.168C2175.06 177.662 2182.4 194.116 2182.4 213.528C2182.4 232.705 2175.06 249.158 2160.38 262.889C2145.94 276.384 2128.42 283.131 2107.82 283.131ZM2461.12 734.835L2460.77 579.651H2481.36L2677.39 360.545H2827.6L2586.48 629.011H2559.84L2461.12 734.835ZM2343.93 906V178.727H2472.49V906H2343.93ZM2686.26 906L2508.71 657.776L2595.35 567.222L2840.03 906H2686.26ZM3110.23 917.009C3075.67 917.009 3044.53 910.853 3016.84 898.543C2989.37 885.995 2967.59 867.529 2951.49 843.145C2935.63 818.76 2927.7 788.694 2927.7 752.946C2927.7 722.17 2933.38 696.72 2944.75 676.597C2956.11 656.473 2971.62 640.375 2991.27 628.301C3010.92 616.227 3033.05 607.113 3057.67 600.957C3082.53 594.565 3108.22 589.949 3134.73 587.108C3166.69 583.794 3192.62 580.834 3212.5 578.23C3232.39 575.389 3246.83 571.128 3255.83 565.446C3265.06 559.527 3269.68 550.413 3269.68 538.102V535.972C3269.68 509.22 3261.75 488.505 3245.88 473.827C3230.02 459.149 3207.18 451.81 3177.35 451.81C3145.86 451.81 3120.88 458.675 3102.42 472.406C3084.19 486.137 3071.88 502.354 3065.49 521.057L2945.46 504.011C2954.93 470.867 2970.55 443.169 2992.33 420.915C3014.11 398.424 3040.75 381.616 3072.23 370.489C3103.72 359.125 3138.52 353.443 3176.64 353.443C3202.91 353.443 3229.07 356.521 3255.12 362.676C3281.16 368.831 3304.95 379.011 3326.49 393.216C3348.04 407.184 3365.32 426.241 3378.34 450.389C3391.6 474.537 3398.23 504.722 3398.23 540.943V906H3274.65V831.071H3270.39C3262.57 846.223 3251.57 860.427 3237.36 873.685C3223.39 886.705 3205.76 897.241 3184.45 905.29C3163.38 913.102 3138.64 917.009 3110.23 917.009ZM3143.61 822.548C3169.42 822.548 3191.79 817.458 3210.73 807.278C3229.67 796.862 3244.23 783.131 3254.41 766.085C3264.82 749.04 3270.03 730.455 3270.03 710.332V646.057C3266.01 649.371 3259.14 652.449 3249.43 655.29C3239.96 658.131 3229.31 660.616 3217.47 662.747C3205.64 664.878 3193.92 666.772 3182.32 668.429C3170.72 670.086 3160.66 671.507 3152.13 672.69C3132.96 675.294 3115.79 679.556 3100.64 685.474C3085.49 691.393 3073.54 699.679 3064.78 710.332C3056.02 720.749 3051.64 734.243 3051.64 750.815C3051.64 774.49 3060.28 792.364 3077.56 804.438C3094.84 816.511 3116.86 822.548 3143.61 822.548ZM3567.49 906V360.545H3696.04V906H3567.49ZM3632.12 283.131C3611.76 283.131 3594.24 276.384 3579.56 262.889C3564.88 249.158 3557.55 232.705 3557.55 213.528C3557.55 194.116 3564.88 177.662 3579.56 164.168C3594.24 150.437 3611.76 143.571 3632.12 143.571C3652.72 143.571 3670.23 150.437 3684.68 164.168C3699.35 177.662 3706.69 194.116 3706.69 213.528C3706.69 232.705 3699.35 249.158 3684.68 262.889C3670.23 276.384 3652.72 283.131 3632.12 283.131Z"
					fill="currentColor"
				/>
			</svg>
		);
	},
);
HikaiImagotipo.displayName = "HikaiImagotipo";

export { HikaiImagotipo };

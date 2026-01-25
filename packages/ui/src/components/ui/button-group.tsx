import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonGroupProps
	extends React.HTMLAttributes<HTMLDivElement> {}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"inline-flex items-center rounded-md border border-input bg-background shadow-sm",
				"[&>button]:rounded-none [&>button]:border-0 [&>button+button]:border-l [&>button+button]:border-border",
				"[&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md",
				className,
			)}
			{...props}
		/>
	),
);
ButtonGroup.displayName = "ButtonGroup";

export { ButtonGroup };

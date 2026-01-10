"use client";

import * as React from "react";
import { format } from "date-fns";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { CalendarDays } from "../../lib/icons";

type DatePickerProps = {
	value?: Date;
	onChange: (date?: Date) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
};

export function DatePicker({
	value,
	onChange,
	placeholder = "Pick a date",
	disabled,
	className,
}: DatePickerProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					disabled={disabled}
					className={cn(
						"w-full justify-start gap-2 text-left font-normal",
						!value && "text-muted-foreground",
						className,
					)}
				>
					<CalendarDays className="h-4 w-4" />
					{value ? format(value, "LLL dd, yyyy") : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={value}
					onSelect={onChange}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}

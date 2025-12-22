"use client";

import * as React from "react";
import { Button } from "./button";
import { Input } from "./input";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown-menu";
import { ChevronDown, Search } from "../../lib/icons";
import { cn } from "../../lib/utils";

type MultiSelectOption = {
	value: string;
	label: string;
	description?: string;
};

type MultiSelectDropdownProps = {
	options: MultiSelectOption[];
	selected: string[];
	onChange: (next: string[]) => void;
	placeholder?: string;
	filterPlaceholder?: string;
	summaryFormatter?: (selected: string[], options: MultiSelectOption[]) => string;
	disabled?: boolean;
	className?: string;
	contentClassName?: string;
};

const defaultSummary = (
	selected: string[],
	options: MultiSelectOption[],
	placeholder: string,
) => {
	if (selected.length === 0) {
		return placeholder;
	}

	const optionMap = new Map(options.map((option) => [option.value, option.label]));
	const firstLabel = optionMap.get(selected[0]) ?? selected[0];
	if (selected.length === 1) {
		return firstLabel;
	}

	return `${firstLabel} + ${selected.length - 1}`;
};

export function MultiSelectDropdown({
	options,
	selected,
	onChange,
	placeholder = "Select",
	filterPlaceholder = "Filter...",
	summaryFormatter,
	disabled,
	className,
	contentClassName,
}: MultiSelectDropdownProps) {
	const [query, setQuery] = React.useState("");

	const filteredOptions = React.useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return options;
		return options.filter((option) => {
			const label = option.label.toLowerCase();
			const description = option.description?.toLowerCase() ?? "";
			return (
				label.includes(normalizedQuery) || description.includes(normalizedQuery)
			);
		});
	}, [options, query]);

	const summary = summaryFormatter
		? summaryFormatter(selected, options)
		: defaultSummary(selected, options, placeholder);

	const handleToggle = (value: string) => {
		if (disabled) return;
		onChange(
			selected.includes(value)
				? selected.filter((item) => item !== value)
				: [...selected, value],
		);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					disabled={disabled}
					className={cn("justify-between gap-2 w-full", className)}
				>
					<span className="truncate text-left">{summary}</span>
					<ChevronDown className="h-4 w-4 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className={cn("min-w-[16rem]", contentClassName)}
			>
				<div className="px-2 pb-2">
					<div className="relative">
						<Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={filterPlaceholder}
							className="h-8 pl-7"
							disabled={disabled}
						/>
					</div>
				</div>
				<DropdownMenuSeparator />
				<div className="max-h-64 overflow-auto">
					{filteredOptions.map((option) => (
						<DropdownMenuCheckboxItem
							key={option.value}
							checked={selected.includes(option.value)}
							onCheckedChange={() => handleToggle(option.value)}
							onSelect={(event) => event.preventDefault()}
							disabled={disabled}
						>
							<div className="flex flex-col">
								<span>{option.label}</span>
								{option.description ? (
									<span className="text-fontSize-xs text-muted-foreground">
										{option.description}
									</span>
								) : null}
							</div>
						</DropdownMenuCheckboxItem>
					))}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export type { MultiSelectOption };

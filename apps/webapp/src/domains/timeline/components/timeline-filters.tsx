import { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import {
	ArrowDown,
	ArrowUp,
	Button,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@hikai/ui";
import { cn } from "@hikai/ui";

export type TimelineFilterState = {
	kind: string;
	from: string;
	to: string;
};

interface TimelineFiltersProps {
	filters: TimelineFilterState;
	kinds: string[];
	onChange: (next: TimelineFilterState) => void;
	onPrev?: () => void;
	onNext?: () => void;
	disablePrev?: boolean;
	disableNext?: boolean;
	variant?: "floating" | "inline";
	showArrows?: boolean;
}

export function TimelineFilters({
	filters,
	kinds,
	onChange,
	onPrev,
	onNext,
	disablePrev,
	disableNext,
	variant = "floating",
	showArrows = true,
}: TimelineFiltersProps) {
	const { t } = useTranslation("timeline");

	const handleDateChange = (key: "from" | "to") => (event: ChangeEvent<HTMLInputElement>) =>
		onChange({ ...filters, [key]: event.target.value });

	return (
		<div
			className={cn(
				"flex w-full justify-center",
				variant === "floating" ? "pointer-events-auto sticky top-2 z-20" : "pointer-events-auto"
			)}
		>
			<div
				className={cn(
					"flex items-center gap-3 rounded-full border bg-background/90 px-3 py-2 shadow-sm backdrop-blur",
					variant === "inline" ? "border-dashed bg-background px-2 py-1 shadow-none" : ""
				)}
			>
				{showArrows ? (
					<>
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9"
							onClick={onPrev}
							disabled={disablePrev}
							aria-label={t("controls.prev")}
						>
							<ArrowUp className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9"
							onClick={onNext}
							disabled={disableNext}
							aria-label={t("controls.next")}
						>
							<ArrowDown className="h-4 w-4" />
						</Button>
					</>
				) : null}
				<div className="hidden items-center gap-2 md:flex">
					<Label htmlFor="timeline-kind" className="text-fontSize-xs text-muted-foreground">
						{t("controls.kind")}
					</Label>
					<Select
						value={filters.kind}
						onValueChange={(value) => onChange({ ...filters, kind: value })}
					>
						<SelectTrigger id="timeline-kind" className="h-9 w-32 text-fontSize-xs">
							<SelectValue placeholder={t("controls.kind")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t("controls.allKinds")}</SelectItem>
							{kinds.map((kind) => (
								<SelectItem key={kind} value={kind}>
									{kind}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="hidden items-center gap-2 md:flex">
					<Label htmlFor="timeline-from" className="text-fontSize-xs text-muted-foreground">
						{t("controls.dateFrom")}
					</Label>
					<Input
						id="timeline-from"
						type="date"
						value={filters.from}
						onChange={handleDateChange("from")}
						className="h-9 w-36 text-fontSize-xs"
					/>
				</div>
				<div className="hidden items-center gap-2 md:flex">
					<Label htmlFor="timeline-to" className="text-fontSize-xs text-muted-foreground">
						{t("controls.dateTo")}
					</Label>
					<Input
						id="timeline-to"
						type="date"
						value={filters.to}
						onChange={handleDateChange("to")}
						className="h-9 w-36 text-fontSize-xs"
					/>
				</div>
			</div>
		</div>
	);
}

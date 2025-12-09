import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
	Card,
	CardContent,
	Button,
} from "@hikai/ui";
import { useConnectionMutations, useConnections } from "../hooks";
import { ConnectionCard } from "./connection-card";

interface ConnectionListProps {
	productId: Id<"products">;
	onAddClick?: () => void;
}

export function ConnectionList({ productId, onAddClick }: ConnectionListProps) {
	const { t } = useTranslation("connectors");
	const { connections, isLoading } = useConnections(productId);
	const { updateStatus, removeConnection } = useConnectionMutations();

	if (isLoading) {
		return (
			<Card>
				<CardContent className="space-y-2 py-6">
					<div className="flex justify-between items-center">
						<div className="h-6 w-40 rounded-md bg-muted animate-pulse" />
						<div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						<div className="h-32 w-full rounded-lg bg-muted animate-pulse" />
						<div className="h-32 w-full rounded-lg bg-muted animate-pulse" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!connections || connections.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center gap-3 py-10">
					<p className="text-fontSize-sm text-muted-foreground">
						{t("sources.empty")}
					</p>
					<p className="text-fontSize-sm text-muted-foreground text-center max-w-md">
						{t("sources.emptyDescription")}
					</p>
					{onAddClick && (
						<Button onClick={onAddClick}>{t("sources.addSource")}</Button>
					)}
				</CardContent>
			</Card>
		);
	}

	const handleDisconnect = (connectionId: Id<"connections">) =>
		updateStatus({ connectionId, status: "disconnected" });

	const handleRemove = (connectionId: Id<"connections">) =>
		removeConnection({ connectionId });

	return (
		<div className="grid gap-4 md:grid-cols-2">
			{connections.map((connection) => (
				<ConnectionCard
					key={connection._id}
					connection={connection as any}
					onDisconnect={handleDisconnect}
					onRemove={handleRemove}
				/>
			))}
		</div>
	);
}

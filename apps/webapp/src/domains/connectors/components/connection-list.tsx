import { useTranslation } from "react-i18next";
import { useConvex } from "convex/react";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
	Card,
	CardContent,
	Button,
} from "@hikai/ui";
import { api } from "@hikai/convex";
import { useConnectionMutations, useConnections } from "../hooks";
import { ConnectionCard } from "./connection-card";

type ConnectionItem = {
	_id: Id<"connections">;
	config?: {
		installationId?: string;
		[k: string]: unknown;
	};
	status?: string;
};

interface ConnectionListProps {
	productId: Id<"products">;
	onAddClick?: () => void;
}

export function ConnectionList({ productId, onAddClick }: ConnectionListProps) {
	const { t } = useTranslation("connectors");
	const convex = useConvex();
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

	const handleConnect = async (connection: ConnectionItem) => {
		try {
			const installationId =
				typeof connection?.config?.installationId === "string"
					? (connection.config.installationId as string)
					: undefined;

			if (installationId) {
				await updateStatus({ connectionId: connection._id, status: "active" });
				return;
			}

			const authUrl = await convex.query(api.connectors.github.getInstallUrl, {
				productId,
				connectionId: connection._id,
			});

			if (!authUrl) {
				throw new Error(t("add.authUrlError"));
			}

			await updateStatus({ connectionId: connection._id, status: "pending" });

			const opened = window.open(authUrl, "_blank", "width=600,height=750");
			if (!opened) {
				window.location.href = authUrl;
			}
		} catch (error) {
			throw error instanceof Error ? error : new Error(t("toast.error"));
		}
	};

	return (
		<div className="grid gap-4 md:grid-cols-2">
			{connections.map((connection) => (
				<ConnectionCard
					key={connection._id}
					connection={connection as any}
					onDisconnect={handleDisconnect}
					onRemove={handleRemove}
					onConnect={() => handleConnect(connection as ConnectionItem)}
				/>
			))}
		</div>
	);
}

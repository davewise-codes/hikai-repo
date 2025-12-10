import { useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Button,
	MoreHorizontal,
	Power,
	Trash2,
	Github,
	Link2,
	ExternalLink,
	toast,
} from "@hikai/ui";

type ConnectionStatus = "pending" | "active" | "error" | "disconnected";

interface ConnectionCardProps {
	connection: {
		_id: Id<"connections">;
		name: string;
		status: ConnectionStatus;
		config?: Record<string, unknown>;
	connectorType?: {
		name: string;
		provider: string;
		description?: string;
		iconUrl?: string;
	} | null;
	productId?: Id<"products">;
	};
	onDisconnect: (connectionId: Id<"connections">) => Promise<unknown>;
	onRemove: (connectionId: Id<"connections">) => Promise<unknown>;
	onConnect?: (connection: ConnectionCardProps["connection"]) => Promise<unknown>;
}

const statusVariant: Record<ConnectionStatus, "default" | "secondary" | "destructive" | "outline"> =
	{
		active: "default",
		pending: "secondary",
		error: "destructive",
		disconnected: "outline",
	};

const providerIconMap: Record<string, ComponentType<{ className?: string }>> = {
	github: Github,
};

	export function ConnectionCard({
	connection,
	onDisconnect,
	onRemove,
	onConnect,
}: ConnectionCardProps) {
	const { t } = useTranslation("connectors");
	const [isDisconnecting, setIsDisconnecting] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const ProviderIcon =
		providerIconMap[connection.connectorType?.provider ?? ""] ?? Link2;

	const repoOwner =
		typeof connection.config?.repoOwner === "string"
			? (connection.config.repoOwner as string)
			: undefined;
	const repoName =
		typeof connection.config?.repoName === "string"
			? (connection.config.repoName as string)
			: undefined;
	const installationId =
		typeof connection.config?.installationId === "string"
			? (connection.config.installationId as string)
			: undefined;

	const configLabel = repoOwner && repoName ? `${repoOwner}/${repoName}` : undefined;

	const canConnect =
		(connection.status === "disconnected" || connection.status === "error") &&
		Boolean(onConnect);
	const configureUrl = installationId
		? `https://github.com/settings/installations/${installationId}`
		: undefined;

	const handleDisconnect = async () => {
		setIsDisconnecting(true);
		try {
			await onDisconnect(connection._id);
			toast.success(t("actions.disconnectSuccess"));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t("toast.error"));
		} finally {
			setIsDisconnecting(false);
		}
	};

	const handleConnect = async () => {
		if (!onConnect) return;

		setIsConnecting(true);
		try {
			await onConnect(connection);
			toast.success(t("actions.connectSuccess"));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t("toast.error"));
		} finally {
			setIsConnecting(false);
		}
	};

	const handleRemove = async () => {
		setIsRemoving(true);
		try {
			await onRemove(connection._id);
			toast.success(t("actions.removeSuccess"));
			setConfirmOpen(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t("toast.error"));
		} finally {
			setIsRemoving(false);
		}
	};

	return (
		<Card className="h-full">
			<CardHeader className="flex-row items-start gap-3">
				<div className="mt-0.5">
					<div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
						<ProviderIcon className="h-4 w-4" />
					</div>
				</div>
				<div className="flex-1 min-w-0 space-y-1">
					<CardTitle className="text-base truncate">{connection.name}</CardTitle>
					<CardDescription className="truncate">
						{connection.connectorType?.name ?? t("sources.unknownProvider")}
					</CardDescription>
				</div>
				<div className="flex items-center gap-2">
					{canConnect && (
						<Button
							variant="outline"
							size="sm"
							className="h-8"
							disabled={isConnecting}
							onClick={handleConnect}
						>
							<Link2 className="h-4 w-4 mr-2" />
							{isConnecting ? t("actions.connecting") : t("actions.connect")}
						</Button>
					)}
					<Badge variant={statusVariant[connection.status]}>
						{t(`statuses.${connection.status}`)}
					</Badge>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreHorizontal className="h-4 w-4" />
								<span className="sr-only">{t("actions.menuLabel")}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{configureUrl && (
								<DropdownMenuItem
									onClick={() => window.open(configureUrl, "_blank", "noopener,noreferrer")}
								>
									<ExternalLink className="h-4 w-4 mr-2" />
									{t("actions.configureInGithub")}
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								onClick={handleDisconnect}
								disabled={isDisconnecting || connection.status === "disconnected"}
							>
								<Power className="h-4 w-4 mr-2" />
								{t("actions.disconnect")}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setConfirmOpen(true)} disabled={isRemoving}>
								<Trash2 className="h-4 w-4 mr-2" />
								{t("actions.remove")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>
			<CardContent className="space-y-2">
				{connection.connectorType?.description && (
					<p className="text-fontSize-sm text-muted-foreground">
						{connection.connectorType.description}
					</p>
				)}
				{configLabel && (
					<div className="text-fontSize-sm text-muted-foreground font-mono inline-flex items-center gap-2 px-2 py-1 rounded-md bg-muted">
						{configLabel}
					</div>
				)}
			</CardContent>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("actions.removeConfirmTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("actions.removeConfirmDescription")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isRemoving}>
							{t("actions.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleRemove}
							disabled={isRemoving}
						>
							{isRemoving ? t("actions.removing") : t("actions.removeConfirmCTA")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}

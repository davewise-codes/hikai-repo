import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConvex } from "convex/react";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	toast,
} from "@hikai/ui";
import { api } from "@hikai/convex";
import { useConnectionMutations, useConnectorTypes } from "../hooks";

interface AddConnectionDialogProps {
	productId: Id<"products">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AddConnectionDialog({ productId, open, onOpenChange }: AddConnectionDialogProps) {
	const { t } = useTranslation("connectors");
	const convex = useConvex();
	const { connectorTypes, isLoading } = useConnectorTypes(productId);
	const { createConnection } = useConnectionMutations();

	const [connectorTypeId, setConnectorTypeId] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isStartingOAuth, setIsStartingOAuth] = useState(false);

	const availableTypes = connectorTypes ?? [];

	const defaultName = useMemo(() => {
		if (!connectorTypeId) return "";
		const selected = availableTypes.find((type) => type._id === connectorTypeId);
		return selected ? selected.name : "";
	}, [availableTypes, connectorTypeId]);

	const resetForm = () => {
		setConnectorTypeId(null);
		setName("");
		setIsSubmitting(false);
	};

	useEffect(() => {
		if (!open) {
			resetForm();
		}
	}, [open]);

	useEffect(() => {
		if (!connectorTypeId || name.trim()) return;
		const selected = availableTypes.find((type) => type._id === connectorTypeId);
		if (selected) {
			setName(selected.name);
		}
	}, [availableTypes, connectorTypeId, name]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!connectorTypeId) {
			toast.error(t("add.selectTypeError"));
			return;
		}

		setIsSubmitting(true);
		setIsStartingOAuth(true);
		try {
			const connectionId = await createConnection({
				productId,
				connectorTypeId: connectorTypeId as Id<"connectorTypes">,
				name: name || defaultName || t("add.defaultName"),
				config: {},
			});
			const authUrl = await convex.query(api.connectors.github.getInstallUrl, {
				productId,
				connectionId,
			});

			if (!authUrl) {
				throw new Error(t("add.authUrlError"));
			}

			const opened = window.open(authUrl, "_blank", "width=600,height=750");
			if (!opened) {
				// Fallback to full redirect if popup blocked
				window.location.href = authUrl;
			}

			toast.success(t("actions.createSuccess"));
			onOpenChange(false);
			resetForm();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t("toast.error"));
		} finally {
			setIsSubmitting(false);
			setIsStartingOAuth(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("add.title")}</DialogTitle>
					<DialogDescription>{t("add.description")}</DialogDescription>
				</DialogHeader>

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label>{t("add.selectType")}</Label>
						<Select
							value={connectorTypeId ?? undefined}
							onValueChange={setConnectorTypeId}
							disabled={isLoading}
						>
							<SelectTrigger>
								<SelectValue placeholder={t("add.selectTypePlaceholder")} />
							</SelectTrigger>
					<SelectContent>
						{availableTypes.map((type) => (
							<SelectItem key={type._id} value={type._id}>
								{type.name}
							</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="connection-name">{t("add.nameLabel")}</Label>
						<Input
							id="connection-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder={t("add.namePlaceholder")}
							disabled={isSubmitting}
						/>
					</div>

					<div className="rounded-md bg-muted px-3 py-2 text-fontSize-sm text-muted-foreground space-y-1">
						<p className="font-medium text-foreground">{t("add.howItWorksTitle")}</p>
						<p>{t("add.orgAdminHint")}</p>
						<p>{t("add.repoConfigHint")}</p>
					</div>

					<DialogFooter>
						<Button
							type="submit"
							disabled={isSubmitting || isStartingOAuth || !connectorTypeId}
						>
							{isSubmitting || isStartingOAuth ? t("add.creating") : t("add.submit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

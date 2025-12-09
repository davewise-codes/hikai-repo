import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useConnectionMutations, useConnectorTypes } from "../hooks";

interface AddConnectionDialogProps {
	productId: Id<"products">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AddConnectionDialog({ productId, open, onOpenChange }: AddConnectionDialogProps) {
	const { t } = useTranslation("connectors");
	const { connectorTypes, isLoading } = useConnectorTypes(productId);
	const { createConnection } = useConnectionMutations();

	const [connectorTypeId, setConnectorTypeId] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [repoOwner, setRepoOwner] = useState("");
	const [repoName, setRepoName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const availableTypes = connectorTypes ?? [];

	const defaultName = useMemo(() => {
		if (!connectorTypeId) return "";
		const selected = availableTypes.find((type) => type._id === connectorTypeId);
		return selected ? selected.name : "";
	}, [availableTypes, connectorTypeId]);

	const resetForm = () => {
		setConnectorTypeId(null);
		setName("");
		setRepoOwner("");
		setRepoName("");
		setIsSubmitting(false);
	};

	useEffect(() => {
		if (!open) {
			resetForm();
		}
	}, [open]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!connectorTypeId) {
			toast.error(t("add.selectTypeError"));
			return;
		}

		setIsSubmitting(true);
		try {
			await createConnection({
				productId,
				connectorTypeId: connectorTypeId as Id<"connectorTypes">,
				name: name || defaultName || t("add.defaultName"),
				config: {
					repoOwner: repoOwner || undefined,
					repoName: repoName || undefined,
				},
			});
			toast.success(t("actions.createSuccess"));
			onOpenChange(false);
			resetForm();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t("toast.error"));
		} finally {
			setIsSubmitting(false);
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

					<div className="grid gap-3 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="repo-owner">{t("add.repoOwner")}</Label>
							<Input
								id="repo-owner"
								value={repoOwner}
								onChange={(event) => setRepoOwner(event.target.value)}
								placeholder={t("add.repoOwnerPlaceholder")}
								disabled={isSubmitting}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="repo-name">{t("add.repoName")}</Label>
							<Input
								id="repo-name"
								value={repoName}
								onChange={(event) => setRepoName(event.target.value)}
								placeholder={t("add.repoNamePlaceholder")}
								disabled={isSubmitting}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button type="submit" disabled={isSubmitting || !connectorTypeId}>
							{isSubmitting ? t("add.creating") : t("add.submit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

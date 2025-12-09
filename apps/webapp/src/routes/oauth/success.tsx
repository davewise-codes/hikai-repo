import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button, CheckCircle } from "@hikai/ui";

function OAuthSuccessPage() {
	const { t } = useTranslation("connectors");

	useEffect(() => {
		// Intentar cerrar la ventana/pestaña si fue abierta como popup
		if (window.opener) {
			window.close();
		}
	}, []);

	const handleClose = () => window.close();

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="w-full max-w-md rounded-lg border bg-card shadow-sm p-6 space-y-4 text-center">
				<div className="flex justify-center">
					<CheckCircle className="h-10 w-10 text-primary" />
				</div>
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">{t("oauth.success.title")}</h1>
					<p className="text-fontSize-sm text-muted-foreground">
						{t("oauth.success.description")}
					</p>
				</div>
				<div className="flex justify-center">
					<Button onClick={handleClose}>{t("oauth.success.close")}</Button>
				</div>
			</div>
		</div>
	);
}

export const Route = createFileRoute("/oauth/success")({
	component: OAuthSuccessPage,
});

import { FormEvent, useState } from "react";
import { useAction, useQuery } from "convex/react";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	Input,
	Button,
	Textarea,
	Separator,
	Label,
	Switch,
} from "@hikai/ui";
import { api } from "@hikai/convex";
import { useCurrentOrg } from "@/domains/organizations/hooks/use-current-org";
import { useCurrentProduct } from "@/domains/products/hooks/use-current-product";
import { useMemo } from "react";

export function AiTestPanel() {
	const chat = useAction(api.agents.actions.chat);
	const chatStream = useAction(api.agents.actions.chatStream);
	const [prompt, setPrompt] = useState("");
	const [response, setResponse] = useState("");
	const [threadId, setThreadId] = useState<string | undefined>(undefined);
	const [isStreaming, setIsStreaming] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastUsage, setLastUsage] = useState<{
		provider: string;
		model: string;
		tokensIn: number;
		tokensOut: number;
		totalTokens: number;
		latencyMs: number;
		status: "success" | "error";
	} | null>(null);

	const { currentOrg, isLoading: isOrgLoading } = useCurrentOrg();
	const { currentProduct } = useCurrentProduct();

	const messages = useQuery(
		api.agents.messages.listThreadMessages,
		threadId ? { threadId } : "skip",
	);
	const lastUsageEntry = useQuery(
		api.lib.aiUsage.getUsageByUseCase,
		currentOrg?._id
			? {
					organizationId: currentOrg._id,
					productId: currentProduct?._id,
					useCase: "ai_test",
					startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
					endDate: Date.now(),
			  }
			: "skip",
	);

	const latestByThread = useMemo(() => {
		if (!lastUsageEntry?.byUseCase?.ai_test) return null;
		// No tenemos el último por thread en la query; mostramos el agregado rápido
		return lastUsageEntry.byUseCase.ai_test;
	}, [lastUsageEntry]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!prompt.trim()) return;
		if (!currentOrg?._id) {
			setError("Selecciona una organización antes de enviar un prompt.");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			if (isStreaming) {
				const result = await chatStream({
					prompt,
					threadId,
					organizationId: currentOrg._id,
					productId: currentProduct?._id,
				});
				setThreadId(result.threadId);
				setResponse("");
				setLastUsage(result.usage ?? null);
			} else {
				const result = await chat({
					prompt,
					threadId,
					organizationId: currentOrg._id,
					productId: currentProduct?._id,
				});
				setResponse(result.text);
				setThreadId(result.threadId);
				setLastUsage(result.usage ?? null);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unexpected error");
		} finally {
			setIsLoading(false);
		}
	};

	const conversation = (messages?.page ?? []).map((message) => {
		const role = message.message?.role ?? (message.userId ? "user" : "assistant");
		const text = extractMessageContent(message);

		return {
			id: message._id ?? message.id ?? `${message._creationTime}-${role}`,
			role,
			text,
			status: message.status,
		};
	});

	return (
		<Card className="max-w-2xl mx-auto">
			<CardHeader>
				<CardTitle>AI Test - Internal Only</CardTitle>
				<CardDescription>
					Envía un prompt al agente hello world y revisa la respuesta.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between gap-3">
					<div className="space-y-1">
						<div className="text-sm font-medium">Modo de prueba</div>
						<p className="text-sm text-muted-foreground">
							Activa streaming para ver las respuestas en tiempo real y mantener el thread.
						</p>
					</div>
					<div className="flex items-center gap-3">
						<Label htmlFor="streaming">Streaming</Label>
						<Switch
							id="streaming"
							checked={isStreaming}
							onCheckedChange={setIsStreaming}
							disabled={isLoading}
						/>
					</div>
				</div>

				<form className="space-y-3" onSubmit={handleSubmit}>
					<label className="text-sm font-medium leading-none" htmlFor="prompt">
						Prompt
					</label>
					<Input
						id="prompt"
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
						placeholder="Escribe tu mensaje"
						disabled={isLoading}
					/>
					<Button type="submit" disabled={isLoading}>
						{isLoading ? "Enviando..." : "Enviar"}
					</Button>
				</form>

				<Separator />

				<div className="space-y-2">
					<div className="text-sm text-muted-foreground">
						<strong>Thread:</strong> {threadId ?? "Sin thread (se crea en el primer envío)"}
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setThreadId(undefined);
								setResponse("");
								setLastUsage(null);
								setError(null);
							}}
							disabled={isLoading}
						>
							Reset thread
						</Button>
					</div>
					<div className="text-sm text-muted-foreground">
						<strong>Organización:</strong>{" "}
						{currentOrg?._id ?? (isOrgLoading ? "Cargando..." : "No seleccionada")}
						{currentProduct?._id ? (
							<>
								{" "}
								| <strong>Producto:</strong> {currentProduct._id}
							</>
						) : (
							" | Sin producto"
						)}
					</div>
					{conversation.length > 0 && (
						<div className="rounded-md border bg-muted/30 p-3 space-y-3">
							{conversation.map((message) => (
								<div key={message.id} className="space-y-1">
									<div className="flex items-center gap-2 text-sm font-medium">
										<span className="capitalize">{message.role}</span>
										{message.status === "pending" && (
											<span className="text-xs text-muted-foreground">(generando...)</span>
										)}
									</div>
									<p className="text-sm leading-relaxed whitespace-pre-wrap">
										{message.text || "[sin contenido]"}
									</p>
								</div>
							))}
						</div>
					)}
					{!isStreaming && (
						<Textarea
							value={response}
							readOnly
							placeholder="Aquí verás la respuesta del agente"
							className="min-h-[140px]"
						/>
					)}
					{lastUsage && (
						<div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
							<div>
								<strong>Estado:</strong> {lastUsage.status}
							</div>
							<div>
								<strong>Proveedor/Modelo:</strong>{" "}
								{lastUsage.provider} / {lastUsage.model}
							</div>
							<div>
								<strong>Tokens:</strong> in {lastUsage.tokensIn} · out{" "}
								{lastUsage.tokensOut} · total {lastUsage.totalTokens}
							</div>
							<div>
								<strong>Latencia:</strong> {lastUsage.latencyMs} ms
							</div>
						</div>
					)}
					{latestByThread && (
						<div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
							<div className="font-medium">Uso reciente (ai_test, últimos 7 días)</div>
							<div>
								<strong>Llamadas:</strong> {latestByThread.calls}
							</div>
							<div>
								<strong>Tokens:</strong> in {latestByThread.tokensIn} · out{" "}
								{latestByThread.tokensOut} · total {latestByThread.totalTokens}
							</div>
							<div>
								<strong>Coste estimado:</strong>{" "}
								{latestByThread.estimatedCostUsd.toFixed(6)} USD
							</div>
							<div>
								<strong>Avg latencia:</strong> {Math.round(latestByThread.avgLatencyMs)} ms
							</div>
							<div>
								<strong>Errores:</strong> {latestByThread.errors}
							</div>
						</div>
					)}
					{error && (
						<p className="text-sm text-destructive">
							{error}
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function extractMessageContent(message: any): string {
	if (typeof message.text === "string" && message.text.length > 0) {
		return message.text;
	}

	const content = message.message?.content;

	if (!content) {
		return "";
	}

	if (typeof content === "string") {
		return content;
	}

	return content
		.map((part: any) => {
			if (typeof part === "string") return part;
			if (typeof part.text === "string") return part.text;
			return "";
		})
		.filter(Boolean)
		.join("\n");
}

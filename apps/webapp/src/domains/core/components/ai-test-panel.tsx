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

export function AiTestPanel() {
	const chat = useAction(api.agents.actions.chat);
	const chatStream = useAction(api.agents.actions.chatStream);
	const [prompt, setPrompt] = useState("");
	const [response, setResponse] = useState("");
	const [threadId, setThreadId] = useState<string | undefined>(undefined);
	const [isStreaming, setIsStreaming] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const messages = useQuery(
		api.agents.messages.listThreadMessages,
		threadId ? { threadId } : "skip",
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!prompt.trim()) return;

		setIsLoading(true);
		setError(null);

		try {
			if (isStreaming) {
				const result = await chatStream({ prompt, threadId });
				setThreadId(result.threadId);
				setResponse("");
			} else {
				const result = await chat({ prompt, threadId });
				setResponse(result.text);
				setThreadId(result.threadId);
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

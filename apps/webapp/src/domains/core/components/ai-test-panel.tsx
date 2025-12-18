import { FormEvent, useState } from "react";
import { useAction } from "convex/react";
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
} from "@hikai/ui";
import { api } from "@hikai/convex";

export function AiTestPanel() {
	const chat = useAction(api.agents.actions.chat);
	const [prompt, setPrompt] = useState("");
	const [response, setResponse] = useState("");
	const [threadId, setThreadId] = useState<string | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!prompt.trim()) return;

		setIsLoading(true);
		setError(null);

		try {
			const result = await chat({ prompt, threadId });
			setResponse(result.text);
			setThreadId(result.threadId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unexpected error");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="max-w-2xl mx-auto">
			<CardHeader>
				<CardTitle>AI Test - Internal Only</CardTitle>
				<CardDescription>
					Envía un prompt al agente hello world y revisa la respuesta.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
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
					<Textarea
						value={response}
						readOnly
						placeholder="Aquí verás la respuesta del agente"
						className="min-h-[140px]"
					/>
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

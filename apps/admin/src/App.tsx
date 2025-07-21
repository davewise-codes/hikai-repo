import { useState } from "react";
import { Button } from "@hikai/ui";
import i18n, { useTranslation } from "@hikai/i18n";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
	const [count, setCount] = useState(0);

	const { t } = useTranslation();

	return (
		<>
			<div>
				<Button>Hola desde UI</Button>
			</div>
			<div style={{ padding: "2rem" }}>
				<h1>{t("greeting")}</h1>
				<button onClick={() => i18n.changeLanguage("es")}>ES</button>
				<button onClick={() => i18n.changeLanguage("en")}>EN</button>
			</div>
			<div>
				<a href="https://vite.dev" target="_blank">
					<img src={viteLogo} className="logo" alt="Vite logo" />
				</a>
				<a href="https://react.dev" target="_blank">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<h1>Vite + React</h1>
			<div className="card">
				<button onClick={() => setCount((count) => count + 1)}>
					count is {count}
				</button>
				<p>
					Edit <code>src/App.tsx</code> and save to test HMR
				</p>
			</div>
			<p className="read-the-docs">
				Click on the Vite and React logos to learn more
			</p>
		</>
	);
}

export default App;

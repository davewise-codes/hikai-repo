import { Header } from "@/components/Header";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Waitlist } from "@/components/sections/Waitlist";

export const dynamic = "force-static"; // SSG

export default function Home() {
	return (
		<>
			<Header />
			<main>
				<Hero />
				<Features />
				<Waitlist />
			</main>
		</>
	);
}

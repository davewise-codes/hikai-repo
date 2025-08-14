import { Layout } from "./components/Layout";
import { Hero } from "./components/sections/Hero";
import { Features } from "./components/sections/Features";
import { Waitlist } from "./components/sections/Waitlist";

export default function App() {
  return (
    <Layout>
      <Hero />
      <Features />
      <Waitlist />
    </Layout>
  );
}

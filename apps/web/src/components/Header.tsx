import { Navbar } from "./Navbar";

export function Header() {
  return (
    <header className="p-4 flex items-center justify-between">
      <Navbar />
      <div>{/* Language control will go here */}</div>
    </header>
  );
}


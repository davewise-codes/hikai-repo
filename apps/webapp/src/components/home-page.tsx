import { Button, Alert, AlertDescription } from "@hikai/ui";
import { ThemeSwitcher } from "./theme-switcher";

export function HomePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold">Hikai WebApp</h1>
        <ThemeSwitcher />
      </div>

      {/* Hero section */}
      <div className="text-center mb-16">
        <h2 className="font-serif text-6xl font-bold mb-6 leading-tight">
          Welcome to our{" "}
          <span className="text-primary">Vite App</span>
        </h2>
        <p className="font-sans text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          This app demonstrates the integration of our centralized UI system with 
          Vite and TanStack Router. All themes, fonts, and components are 
          inherited from @hikai/ui.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg">Get Started</Button>
          <Button variant="outline" size="lg">Learn More</Button>
        </div>
      </div>

      {/* Features section */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="text-center">
          <h3 className="font-serif text-2xl font-semibold mb-4">🎨 Centralized UI</h3>
          <p className="text-muted-foreground">
            All components, themes, and styles come from @hikai/ui package
          </p>
        </div>
        <div className="text-center">
          <h3 className="font-serif text-2xl font-semibold mb-4">⚡ Vite Powered</h3>
          <p className="text-muted-foreground">
            Lightning fast development with Vite and hot module replacement
          </p>
        </div>
        <div className="text-center">
          <h3 className="font-serif text-2xl font-semibold mb-4">🧭 Type-safe Routing</h3>
          <p className="text-muted-foreground">
            TanStack Router provides fully typed navigation and routing
          </p>
        </div>
      </div>

      {/* Font demo */}
      <div className="mb-16">
        <h3 className="text-2xl font-bold mb-6">Font System Demo</h3>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-sans text-lg font-semibold mb-2">Sans Serif (Inter)</h4>
            <p className="font-sans">
              This text uses Inter font for clean, modern UI elements and body text.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-serif text-lg font-semibold mb-2">Serif (Playfair Display)</h4>
            <p className="font-serif">
              This text uses Playfair Display for elegant headings and display text.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-mono text-lg font-semibold mb-2">Monospace (JetBrains Mono)</h4>
            <p className="font-mono">
              This text uses JetBrains Mono for code blocks and technical content.
            </p>
          </div>
        </div>
      </div>

      {/* Alert demo */}
      <Alert className="mb-8">
        <AlertDescription>
          🎉 Congratulations! The UI system is working correctly. 
          Try switching between light and dark themes to see the changes.
        </AlertDescription>
      </Alert>
    </div>
  );
}
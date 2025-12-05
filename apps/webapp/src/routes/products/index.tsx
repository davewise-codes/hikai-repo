import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { ProductList } from "@/domains/products";

export const Route = createFileRoute("/products/")({
  component: () => (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <ProductList />
      </div>
    </AppShell>
  ),
});

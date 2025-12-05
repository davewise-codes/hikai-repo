import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@hikai/ui";
import { useOrganizationsActions } from "../hooks/use-organizations";

export function CreateOrganizationForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createOrganizationSafe } = useOrganizationsActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      setError("El nombre y slug son obligatorios");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await createOrganizationSafe({
      name: formData.name.trim(),
      slug: formData.slug.trim().toLowerCase(),
      description: formData.description.trim() || undefined,
    });

    if (result.success) {
      // Resetear formulario y cerrar
      setFormData({ name: "", slug: "", description: "" });
      setIsOpen(false);
    } else {
      setError(result.error || "Error desconocido");
    }

    setIsLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim()
      .substring(0, 50); // Limit length
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      // Auto-generate slug if it's empty or matches the previous auto-generated one
      slug: prev.slug === generateSlug(prev.name) || !prev.slug 
        ? generateSlug(value) 
        : prev.slug
    }));
  };

  if (!isOpen) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => setIsOpen(true)} className="w-full">
            + Crear Nueva Organización
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Nueva Organización</CardTitle>
        <CardDescription>
          Crea una nueva organización para colaborar con tu equipo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="org-name">Nombre de la organización *</Label>
            <Input
              id="org-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Mi Empresa"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="org-slug">Identificador (slug) *</Label>
            <Input
              id="org-slug"
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="mi-empresa"
              required
              disabled={isLoading}
              pattern="^[a-z0-9-]+$"
              title="Solo letras minúsculas, números y guiones"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL amigable para tu organización. Solo letras minúsculas, números y guiones.
            </p>
          </div>

          <div>
            <Label htmlFor="org-description">Descripción (opcional)</Label>
            <Textarea
              id="org-description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Breve descripción de tu organización..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.slug.trim()}
            >
              {isLoading ? "Creando..." : "Crear Organización"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setFormData({ name: "", slug: "", description: "" });
                setError(null);
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
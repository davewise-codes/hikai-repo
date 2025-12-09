import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@hikai/ui";
import { useUserOrganizations } from "../hooks/use-organizations";
import { CreateOrganizationForm } from "./create-organization-form";

export function OrganizationList() {
  const organizations = useUserOrganizations();

  if (organizations === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Mis Organizaciones</h1>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Cargando organizaciones...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mis Organizaciones</h1>
      </div>

      <CreateOrganizationForm />

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No tienes ninguna organización aún. Crea tu primera organización para comenzar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{org.name}</CardTitle>
                    <CardDescription>@{org.slug}</CardDescription>
                  </div>
                  <Badge variant={org.role as "owner" | "admin" | "member"}>
                    {org.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {org.description && (
                  <p className="text-fontSize-sm text-muted-foreground mb-4">{org.description}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  Unido el {new Date(org.joinedAt).toLocaleDateString("es-ES")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
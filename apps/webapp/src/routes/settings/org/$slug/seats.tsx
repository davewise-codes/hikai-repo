import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useOrganizationBySlug, OrgMembers } from "@/domains/organizations";

export const Route = createFileRoute("/settings/org/$slug/seats")({
  component: OrgSeatsPage,
});

/**
 * Página de gestión de miembros (seats) de la organización.
 * Muestra la tabla de miembros con layout wide.
 */
function OrgSeatsPage() {
  const { t } = useTranslation("organizations");
  const { slug } = Route.useParams();
  const { currentOrg } = useCurrentOrg();

  const organization = useOrganizationBySlug(slug);

  if (!organization) {
    return null; // Layout handles loading/not found
  }

  // Use role from currentOrg if available, otherwise default to member
  const userRole = currentOrg?.role ?? "member";

  return (
    <SettingsLayout variant="wide">
      <SettingsHeader
        title={t("members.title")}
        subtitle={t("members.subtitle", { name: organization.name })}
      />

      <OrgMembers
        organizationId={organization._id}
        userRole={userRole}
      />
    </SettingsLayout>
  );
}

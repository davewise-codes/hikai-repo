import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Building2, Plus } from "@hikai/ui";
import { SettingsLayout, SettingsHeader } from "@/domains/shared";
import {
  useUserOrganizationsWithDetails,
  useRecentOrganizations,
} from "@/domains/organizations/hooks/use-organizations";
import { OrgCard, CreateOrganizationForm } from "@/domains/organizations/components";

export const Route = createFileRoute("/settings/organizations")({
  component: MyOrganizationsPage,
});

/**
 * Página de "Mis Organizaciones" en settings.
 * Muestra todas las organizaciones del usuario ordenadas por acceso reciente.
 */
function MyOrganizationsPage() {
  const { t } = useTranslation("organizations");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const organizationsWithDetails = useUserOrganizationsWithDetails();
  const recentOrgs = useRecentOrganizations();

  // Loading state
  if (organizationsWithDetails === undefined) {
    return (
      <SettingsLayout variant="wide">
        <SettingsHeader
          title={t("myOrganizations.title")}
          subtitle={t("myOrganizations.subtitle")}
        />
        <div className="flex items-center justify-center py-16">
          <div className="text-fontSize-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        </div>
      </SettingsLayout>
    );
  }

  // Sort organizations: recent first, then by name
  const sortedOrganizations = [...organizationsWithDetails].sort((a, b) => {
    // Check if org is in recent list and get its position
    const aRecentIndex = recentOrgs?.findIndex((r) => r._id === a._id) ?? -1;
    const bRecentIndex = recentOrgs?.findIndex((r) => r._id === b._id) ?? -1;

    // Both in recent - sort by recent order
    if (aRecentIndex !== -1 && bRecentIndex !== -1) {
      return aRecentIndex - bRecentIndex;
    }
    // Only a is recent
    if (aRecentIndex !== -1) return -1;
    // Only b is recent
    if (bRecentIndex !== -1) return 1;

    // Personal org always after recent but before others
    if (a.isPersonal && !b.isPersonal) return -1;
    if (!a.isPersonal && b.isPersonal) return 1;

    // Otherwise sort by name
    return a.name.localeCompare(b.name);
  });

  return (
    <SettingsLayout variant="wide">
      <SettingsHeader
        title={t("myOrganizations.title")}
        subtitle={t("myOrganizations.subtitle")}
      />

      {/* Create Organization Form */}
      <CreateOrganizationForm />

      {/* Organizations Grid */}
      {sortedOrganizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-fontSize-sm">{t("myOrganizations.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sortedOrganizations.map((org) => (
            <OrgCard key={org._id} organization={org} />
          ))}
        </div>
      )}
    </SettingsLayout>
  );
}

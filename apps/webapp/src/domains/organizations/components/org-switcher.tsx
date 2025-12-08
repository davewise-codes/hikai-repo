import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Badge,
  Button,
  Building,
  Plus,
  Check,
  Settings,
  ChevronDown,
  toast,
} from "@hikai/ui";
import { useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { useTranslation } from "react-i18next";
import { useCurrentOrg } from "../hooks/use-current-org";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

/**
 * OrgSwitcher - Componente para cambiar de organización.
 *
 * Diseño: Botón con avatar + nombre + chevron que abre dropdown.
 * Ubicación: Header horizontal.
 *
 * Incluye secciones:
 * - Current org header con gear de settings (admin/owner)
 * - Recent: organizaciones accedidas recientemente + link a Mis Orgs
 * - All organizations: todas las demás (solo si hay recientes)
 * - Create new organization
 */
export function OrgSwitcher() {
  const { t } = useTranslation("organizations");
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrg, organizations, isLoading, setCurrentOrg } =
    useCurrentOrg();

  // Obtener organizaciones recientes
  const recentOrgs = useQuery(
    api.organizations.organizations.getRecentOrganizations
  );

  // Filtrar orgs que no están en recientes para evitar duplicados
  const recentOrgIds = new Set(recentOrgs?.map((o) => o._id) ?? []);
  const nonRecentOrgs = organizations.filter((o) => !recentOrgIds.has(o._id));

  // Determinar si hay sección de recientes
  const hasRecentOrgs = recentOrgs && recentOrgs.length > 0;

  // Verificar si el usuario es admin/owner de la org actual
  const isAdminOrOwner =
    currentOrg?.role === "admin" || currentOrg?.role === "owner";

  // Obtener iniciales de la org para el avatar
  const getOrgInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handler para seleccionar org
  // Si estamos en /settings/org/$slug/*, redirige a la página equivalente de la nueva org
  const handleSelectOrg = (orgId: Id<"organizations">, orgName: string, orgSlug: string) => {
    setCurrentOrg(orgId);
    toast.success(t("switcher.switched", { name: orgName }));

    // Check if we're on an org-specific settings page
    const orgSettingsMatch = location.pathname.match(/^\/settings\/org\/([^/]+)\/(.+)$/);
    if (orgSettingsMatch) {
      const subPage = orgSettingsMatch[2]; // e.g., "general", "products", "plan"
      navigate({ to: `/settings/org/${orgSlug}/${subPage}` });
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-8 gap-2">
        <div className="w-5 h-5 bg-muted rounded animate-pulse" />
        <span className="text-muted-foreground">...</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 max-w-48"
          title={currentOrg?.name || t("switcher.title")}
        >
          {/* Avatar */}
          <div className="w-5 h-5 bg-primary rounded flex items-center justify-center flex-shrink-0">
            {currentOrg ? (
              <span className="text-primary-foreground text-[10px] font-bold">
                {getOrgInitials(currentOrg.name)}
              </span>
            ) : (
              <Building className="w-3 h-3 text-primary-foreground" />
            )}
          </div>
          {/* Name */}
          <span className="truncate">
            {currentOrg?.name || t("switcher.title")}
          </span>
          {/* Chevron */}
          <ChevronDown className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {/* Current org header */}
        {currentOrg && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate flex-1">
                    {currentOrg.name}
                  </span>
                  {currentOrg.isPersonal && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {t("switcher.personal")}
                    </Badge>
                  )}
                  {isAdminOrOwner && (
                    <button
                      type="button"
                      className="flex-shrink-0 p-1 rounded hover:bg-accent transition-colors"
                      title={t("switcher.settings")}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        navigate({
                          to: "/settings/org/$slug/general",
                          params: { slug: currentOrg.slug },
                        });
                      }}
                    >
                      <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {currentOrg.memberCount}{" "}
                  {currentOrg.memberCount === 1
                    ? t("detail.members").replace(/s$/, "")
                    : t("detail.members")}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Recent organizations section */}
        {hasRecentOrgs && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              {t("switcher.recent")}
            </DropdownMenuLabel>
            {recentOrgs.map((org) => (
              <DropdownMenuItem
                key={org._id}
                onClick={() => handleSelectOrg(org._id, org.name, org.slug)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium">
                        {getOrgInitials(org.name)}
                      </span>
                    </div>
                    <span className="truncate">{org.name}</span>
                    {org.isPersonal && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {t("switcher.personal")}
                      </Badge>
                    )}
                    {!org.isPersonal && org.plan !== "free" && (
                      <Badge variant="default" className="text-xs flex-shrink-0">
                        {t(`plans.${org.plan}`)}
                      </Badge>
                    )}
                  </div>
                  {org._id === currentOrg?._id && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            {/* Link to My Organizations */}
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                to="/settings/organizations"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t("switcher.myOrganizations")}
              </Link>
            </DropdownMenuItem>
          </>
        )}

        {/* All organizations section (excluding recent) */}
        {nonRecentOrgs.length > 0 && (
          <>
            {hasRecentOrgs && <DropdownMenuSeparator />}
            {/* Only show label if there are recent orgs above */}
            {hasRecentOrgs && (
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                {t("switcher.all")}
              </DropdownMenuLabel>
            )}
            {nonRecentOrgs.map((org) => (
              <DropdownMenuItem
                key={org._id}
                onClick={() => handleSelectOrg(org._id, org.name, org.slug)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium">
                        {getOrgInitials(org.name)}
                      </span>
                    </div>
                    <span className="truncate">{org.name}</span>
                    {org.isPersonal && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {t("switcher.personal")}
                      </Badge>
                    )}
                    {!org.isPersonal && org.plan !== "free" && (
                      <Badge variant="default" className="text-xs flex-shrink-0">
                        {t(`plans.${org.plan}`)}
                      </Badge>
                    )}
                  </div>
                  {org._id === currentOrg?._id && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            {/* Link to My Organizations when no recents */}
            {!hasRecentOrgs && (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link
                  to="/settings/organizations"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("switcher.myOrganizations")}
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Empty state when no organizations at all */}
        {organizations.length === 0 && (
          <DropdownMenuItem disabled>
            {t("switcher.noOrganizations")}
          </DropdownMenuItem>
        )}

        {/* Create new org - always available for authenticated users */}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/settings/organizations" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("switcher.createNew")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

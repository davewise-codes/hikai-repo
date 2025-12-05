import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Badge,
  Building,
  Plus,
  Check,
  Settings,
} from "@hikai/ui";
import { useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { useTranslation } from "react-i18next";
import { useCurrentOrg } from "../hooks/use-current-org";
import { Link } from "@tanstack/react-router";

/**
 * OrgSwitcher - Componente compacto para cambiar de organización.
 *
 * Diseño: Avatar/icono que abre dropdown con lista de orgs.
 * Ubicación: Parte superior del sidebar (reemplaza logo "H").
 */
export function OrgSwitcher() {
  const { t } = useTranslation("common");
  const { currentOrg, organizations, isLoading, setCurrentOrg } =
    useCurrentOrg();

  const canCreateResult = useQuery(
    api.organizations.organizations.canCreateOrganization
  );

  // Obtener iniciales de la org para el avatar
  const getOrgInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="w-8 h-8 bg-muted rounded-md animate-pulse flex items-center justify-center">
        <Building className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-8 h-8 bg-primary rounded-md flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
          title={currentOrg?.name || t("organizations.switcher.title")}
        >
          {currentOrg ? (
            <span className="text-primary-foreground text-xs font-bold">
              {getOrgInitials(currentOrg.name)}
            </span>
          ) : (
            <Building className="w-4 h-4 text-primary-foreground" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-64">
        {/* Current org header */}
        {currentOrg && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {currentOrg.name}
                  </span>
                  {currentOrg.isPersonal && (
                    <Badge variant="secondary" className="text-xs">
                      {t("organizations.switcher.personal")}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {currentOrg.memberCount}{" "}
                  {currentOrg.memberCount === 1 ? "member" : "members"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                to="/organizations/$slug"
                params={{ slug: currentOrg.slug }}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {t("organizations.detail.manage")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Organization list */}
        {organizations.length > 0 ? (
          organizations.map((org) => (
            <DropdownMenuItem
              key={org._id}
              onClick={() => setCurrentOrg(org._id)}
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
                      {t("organizations.switcher.personal")}
                    </Badge>
                  )}
                  {!org.isPersonal && org.plan !== "free" && (
                    <Badge variant="default" className="text-xs flex-shrink-0">
                      {t(`organizations.plans.${org.plan}`)}
                    </Badge>
                  )}
                </div>
                {org._id === currentOrg?._id && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>
            {t("organizations.switcher.noOrganizations")}
          </DropdownMenuItem>
        )}

        {/* Create new org */}
        {canCreateResult?.canCreate && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/organizations" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {t("organizations.switcher.createNew")}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

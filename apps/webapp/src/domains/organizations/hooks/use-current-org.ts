import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@hikai/convex";
import { useStore } from "@/store";

/**
 * Hook para gestionar la organización actual del usuario.
 *
 * - Lee currentOrgId del store (persistido en localStorage)
 * - Auto-selecciona la primera org (personal) si ninguna está seleccionada
 * - Sincroniza entre pestañas automáticamente
 */
export function useCurrentOrg() {
  const currentOrgId = useStore((state) => state.currentOrgId);
  const setCurrentOrgId = useStore((state) => state.setCurrentOrgId);

  const organizations = useQuery(
    api.organizations.organizations.getUserOrganizationsWithDetails
  );

  // Auto-seleccionar primera org si ninguna está seleccionada
  useEffect(() => {
    if (!currentOrgId && organizations && organizations.length > 0) {
      // Preferir org personal si existe (debería ser la primera por el sort)
      const personal = organizations.find((o) => o.isPersonal);
      setCurrentOrgId(personal?._id ?? organizations[0]._id);
    }
  }, [currentOrgId, organizations, setCurrentOrgId]);

  // Encontrar la org actual basándose en el ID
  const currentOrg =
    organizations?.find((o) => o._id === currentOrgId) ?? null;

  return {
    currentOrg,
    organizations: organizations ?? [],
    isLoading: organizations === undefined,
    setCurrentOrg: (orgId: string) => setCurrentOrgId(orgId),
  };
}

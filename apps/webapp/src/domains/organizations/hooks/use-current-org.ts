import { useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { api } from "@hikai/convex";
import { useStore } from "@/store";

/**
 * Hook para gestionar la organización actual del usuario.
 *
 * - Lee currentOrgId del store (persistido en localStorage)
 * - Auto-selecciona la primera org (personal) si ninguna está seleccionada
 * - Sincroniza entre pestañas automáticamente
 * - Al cambiar de org en rutas de productos, navega a /products
 */
export function useCurrentOrg() {
  const currentOrgId = useStore((state) => state.currentOrgId);
  const setCurrentOrgId = useStore((state) => state.setCurrentOrgId);
  const navigate = useNavigate();
  const location = useLocation();

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

  // Cambiar org con navegación a /products si estamos en una ruta de productos
  const setCurrentOrg = useCallback(
    (orgId: string) => {
      setCurrentOrgId(orgId);
      // Si estamos en una ruta de productos, navegar a /products
      if (location.pathname.startsWith("/products")) {
        navigate({ to: "/products" });
      }
    },
    [setCurrentOrgId, navigate, location.pathname]
  );

  return {
    currentOrg,
    organizations: organizations ?? [],
    isLoading: organizations === undefined,
    setCurrentOrg,
  };
}

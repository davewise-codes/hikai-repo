import { useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { api } from "@hikai/convex";
import { useStore } from "@/store";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

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
  const setCurrentProductId = useStore((state) => state.setCurrentProductId);
  const navigate = useNavigate();
  const location = useLocation();

  const organizations = useQuery(
    api.organizations.organizations.getUserOrganizationsWithDetails
  );

  // Mutation para trackear acceso a org
  const updateLastOrgAccess = useMutation(
    api.userPreferences.updateLastOrgAccess
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

      // Limpiar producto actual al cambiar de org (productos son específicos de org)
      setCurrentProductId(null);

      // Trackear acceso a la org (no bloquea UX si falla)
      updateLastOrgAccess({
        organizationId: orgId as Id<"organizations">,
      }).catch((error) => {
        console.error("Error tracking org access:", error);
      });

      // Si estamos en una ruta de productos, navegar a /products
      if (location.pathname.startsWith("/products")) {
        navigate({ to: "/products" });
      }
    },
    [setCurrentOrgId, setCurrentProductId, updateLastOrgAccess, navigate, location.pathname]
  );

  return {
    currentOrg,
    organizations: organizations ?? [],
    isLoading: organizations === undefined,
    setCurrentOrg,
  };
}

import { useEffect, useCallback } from "react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useStore } from "@/store";
import { useGetProduct } from "./use-products";

/**
 * Hook para gestionar el producto actual del usuario.
 *
 * - Lee currentProductId del store (persistido en localStorage)
 * - Auto-clear: si el producto no pertenece a currentOrg, limpia currentProductId
 * - NO auto-selecciona (el usuario debe elegir conscientemente)
 */
export function useCurrentProduct() {
  const currentProductId = useStore((state) => state.currentProductId);
  const currentOrgId = useStore((state) => state.currentOrgId);
  const setCurrentProductId = useStore((state) => state.setCurrentProductId);

  // Mutation para trackear acceso a producto
  const updateLastProductAccess = useMutation(
    api.userPreferences.updateLastProductAccess
  );

  // Fetch del producto actual (skip si no hay ID)
  const product = useGetProduct(
    currentProductId ? (currentProductId as Id<"products">) : undefined
  );

  // Auto-clear: si el producto cargado no pertenece a la org actual, limpiar
  useEffect(() => {
    if (
      product &&
      currentOrgId &&
      product.organizationId !== currentOrgId
    ) {
      setCurrentProductId(null);
    }
  }, [product, currentOrgId, setCurrentProductId]);

  // Determinar producto actual válido
  const currentProduct =
    product && currentOrgId && product.organizationId === currentOrgId
      ? product
      : null;

  // Función para establecer producto actual
  const setCurrentProduct = useCallback(
    (productId: string | null) => {
      setCurrentProductId(productId);

      // Trackear acceso al producto (no bloquea UX si falla)
      if (productId) {
        updateLastProductAccess({
          productId: productId as Id<"products">,
        }).catch((error) => {
          console.error("Error tracking product access:", error);
        });
      }
    },
    [setCurrentProductId, updateLastProductAccess]
  );

  // Función para limpiar producto actual
  const clearCurrentProduct = useCallback(() => {
    setCurrentProductId(null);
  }, [setCurrentProductId]);

  return {
    currentProduct,
    currentProductId,
    isLoading: currentProductId !== null && product === undefined,
    setCurrentProduct,
    clearCurrentProduct,
  };
}

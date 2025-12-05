/**
 * Hooks para gestión de productos.
 * Wrappers sobre las queries/mutations de Convex.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Lista productos de una organización.
 */
export function useListProducts(organizationId: Id<"organizations"> | undefined) {
  return useQuery(
    api.products.products.listProducts,
    organizationId ? { organizationId } : "skip"
  );
}

/**
 * Obtiene un producto por ID.
 */
export function useGetProduct(productId: Id<"products"> | undefined) {
  return useQuery(
    api.products.products.getProduct,
    productId ? { productId } : "skip"
  );
}

/**
 * Obtiene un producto por slug dentro de una organización.
 */
export function useGetProductBySlug(
  organizationId: Id<"organizations"> | undefined,
  slug: string | undefined
) {
  return useQuery(
    api.products.products.getProductBySlug,
    organizationId && slug ? { organizationId, slug } : "skip"
  );
}

/**
 * Obtiene todos los productos donde el usuario es miembro.
 */
export function useUserProducts() {
  return useQuery(api.products.products.getUserProducts);
}

/**
 * Verifica si se puede crear un producto en la organización.
 */
export function useCanCreateProduct(organizationId: Id<"organizations"> | undefined) {
  return useQuery(
    api.products.products.canCreateProduct,
    organizationId ? { organizationId } : "skip"
  );
}

/**
 * Obtiene los miembros de un producto.
 */
export function useProductMembers(productId: Id<"products"> | undefined) {
  return useQuery(
    api.products.products.getProductMembers,
    productId ? { productId } : "skip"
  );
}

/**
 * Obtiene miembros de la org disponibles para añadir al producto.
 */
export function useAvailableOrgMembers(productId: Id<"products"> | undefined) {
  return useQuery(
    api.products.products.getAvailableOrgMembers,
    productId ? { productId } : "skip"
  );
}

/**
 * Obtiene los productos accedidos recientemente (cross-org).
 */
export function useRecentProducts() {
  return useQuery(api.products.products.getRecentProducts);
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Hook para crear un producto.
 */
export function useCreateProduct() {
  return useMutation(api.products.products.createProduct);
}

/**
 * Hook para actualizar un producto.
 */
export function useUpdateProduct() {
  return useMutation(api.products.products.updateProduct);
}

/**
 * Hook para eliminar un producto.
 */
export function useDeleteProduct() {
  return useMutation(api.products.products.deleteProduct);
}

/**
 * Hook para añadir un miembro al producto.
 */
export function useAddProductMember() {
  return useMutation(api.products.products.addProductMember);
}

/**
 * Hook para eliminar un miembro del producto.
 */
export function useRemoveProductMember() {
  return useMutation(api.products.products.removeProductMember);
}

/**
 * Hook para actualizar el rol de un miembro.
 */
export function useUpdateProductMemberRole() {
  return useMutation(api.products.products.updateProductMemberRole);
}

/**
 * Hook para trackear acceso a un producto.
 * Se llama al navegar a la página de detalle del producto.
 */
export function useUpdateLastProductAccess() {
  return useMutation(api.userPreferences.updateLastProductAccess);
}

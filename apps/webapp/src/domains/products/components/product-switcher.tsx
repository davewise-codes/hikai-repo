import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Badge,
  Button,
  Folder,
  Plus,
  Check,
  Settings,
  ChevronDown,
  toast,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useCurrentProduct, useListProducts } from "../hooks";

/**
 * ProductSwitcher - Componente para cambiar de producto.
 *
 * Diseño: Botón con icono + nombre + chevron que abre dropdown.
 * Ubicación: Header horizontal, después de OrgSwitcher.
 *
 * Incluye secciones:
 * - Current product header con gear de settings (admin)
 * - Otros productos de la org actual (máx 5)
 * - Link a Mis Productos
 * - Empty state + crear producto
 */
export function ProductSwitcher() {
  const { t } = useTranslation("products");
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrg, setCurrentOrg } = useCurrentOrg();
  const { currentProduct, setCurrentProduct, isLoading: isProductLoading } = useCurrentProduct();

  // Lista de productos de la org actual
  const products = useListProducts(currentOrg?._id);

  // Filtrar productos: excluir el actual y limitar a 5
  const otherProducts = (products ?? [])
    .filter((p) => p._id !== currentProduct?._id)
    .filter((p) => p.userRole !== null) // Solo productos donde el usuario es miembro
    .slice(0, 5);

  // Verificar si el usuario es admin del producto actual
  const isAdmin = currentProduct?.userRole === "admin";

  // Verificar si hay productos en la org
  const hasProducts = products && products.length > 0;
  const hasOtherProducts = otherProducts.length > 0;

  // Handler para seleccionar producto
  // Si estamos en /settings/product/$slug/*, redirige a la página equivalente del nuevo producto
  const handleSelectProduct = (productId: string, productName: string, productSlug: string) => {
    setCurrentProduct(productId);
    toast.success(t("switcher.switched", { name: productName }));

    // Check if we're on a product-specific settings page
    const productSettingsMatch = location.pathname.match(/^\/settings\/product\/([^/]+)\/(.+)$/);
    if (productSettingsMatch) {
      const subPage = productSettingsMatch[2]; // e.g., "general", "team"
      navigate({ to: `/settings/product/${productSlug}/${subPage}` });
      return;
    }

    // If we're inside an app route, switch org context (if needed) and go to the new product timeline
    if (currentOrg?._id) {
      setCurrentOrg(currentOrg._id);
      navigate({
        to: "/app/$orgSlug/$productSlug/timeline",
        params: { orgSlug: currentOrg.slug, productSlug },
      });
    }
  };

  // Estado de carga o sin org seleccionada
  if (!currentOrg) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-8 gap-2">
        <Folder className="w-4 h-4" />
        <span className="text-muted-foreground">{t("switcher.select")}</span>
        <ChevronDown className="w-3 h-3" />
      </Button>
    );
  }

  if (products === undefined || isProductLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-8 gap-2">
        <Folder className="w-4 h-4" />
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
          title={currentProduct?.name || t("switcher.select")}
        >
          {/* Icon */}
          <Folder className="w-4 h-4 flex-shrink-0" />
          {/* Name */}
          <span className="truncate">
            {currentProduct?.name || t("switcher.select")}
          </span>
          {/* Chevron */}
          <ChevronDown className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {/* Current product header */}
        {currentProduct && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-fontSize-sm font-medium truncate flex-1">
                    {currentProduct.name}
                  </span>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {t(`roles.${currentProduct.userRole}`)}
                  </Badge>
                  {isAdmin && (
                    <Link
                      to="/settings/product/$slug/general"
                      params={{ slug: currentProduct.slug }}
                      className="flex-shrink-0 p-1 rounded hover:bg-accent transition-colors"
                      title={t("switcher.settings")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </Link>
                  )}
                </div>
                {currentProduct.description && (
                  <span className="text-fontSize-xs text-muted-foreground truncate">
                    {currentProduct.description}
                  </span>
                )}
                <span className="text-fontSize-xs text-muted-foreground">
                  {currentProduct.memberCount}{" "}
                  {currentProduct.memberCount === 1
                    ? t("memberSingular")
                    : t("memberPlural")}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Other products section */}
        {hasOtherProducts && (
          <>
            <DropdownMenuLabel className="text-fontSize-sm text-muted-foreground font-normal">
              {t("switcher.other")}
            </DropdownMenuLabel>
            {otherProducts.map((product) => (
              <DropdownMenuItem
                key={product._id}
                onClick={() => handleSelectProduct(product._id, product.name, product.slug)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate">{product.name}</span>
                    {product.userRole && (
                      <Badge variant="outline" className="flex-shrink-0">
                        {t(`roles.${product.userRole}`)}
                      </Badge>
                    )}
                  </div>
                  {product._id === currentProduct?._id && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Link to My Products */}
        {hasProducts && (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link
              to="/settings/products"
              className="text-fontSize-sm text-muted-foreground hover:text-foreground"
            >
              {t("switcher.myProducts")}
            </Link>
          </DropdownMenuItem>
        )}

        {/* Empty state */}
        {!hasProducts && (
          <>
            <DropdownMenuItem disabled className="text-muted-foreground text-fontSize-sm">
              {t("switcher.empty")}
            </DropdownMenuItem>
          </>
        )}

        {/* Create product */}
        {currentOrg && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                to="/settings/org/$slug/products"
                params={{ slug: currentOrg.slug }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("switcher.create")}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

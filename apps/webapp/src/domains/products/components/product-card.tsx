import { useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
  Card,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Users,
  MoreHorizontal,
  ExternalLink,
  Settings,
  LogOut,
  Trash2,
  Check,
  toast,
} from "@hikai/ui";
import { useCurrentProduct } from "../hooks";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { LeaveProductDialog } from "./leave-product-dialog";
import { DeleteProductDialog } from "./delete-product-dialog";

interface ProductCardProps {
  product: {
    _id: Id<"products">;
    name: string;
    slug: string;
    description?: string;
    createdAt: number;
    memberCount?: number;
    // Optional: when showing in "My Products" context
    role?: "admin" | "member";
    userRole?: "admin" | "member" | null;
    organization?: {
      _id: Id<"organizations">;
      name: string;
      slug: string;
    };
  };
  /** Show delete action in dropdown (for admin users in org products page) */
  showDeleteAction?: boolean;
}

export function ProductCard({ product, showDeleteAction }: ProductCardProps) {
  const { t } = useTranslation("products");
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProduct, setCurrentProduct } = useCurrentProduct();
  const { currentOrg, setCurrentOrg } = useCurrentOrg();

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Support both role (from getUserProducts) and userRole (from listProducts)
  const userRole = product.role ?? product.userRole;
  const isAdmin = userRole === "admin";
  const isMember = userRole !== null && userRole !== undefined;
  const canDelete = showDeleteAction && isAdmin;

  const isCurrentProduct = currentProduct?._id === product._id;

  // Switch product (and org if needed) and navigate to settings
  const handleViewOrSettings = () => {
    // If product belongs to a different org, switch org first
    if (product.organization && product.organization._id !== currentOrg?._id) {
      setCurrentOrg(product.organization._id);
    }

    if (!isCurrentProduct) {
      setCurrentProduct(product._id);
      toast.success(t("switcher.switched", { name: product.name }));
    }
    navigate({ to: "/settings/product/$slug/general", params: { slug: product.slug } });
  };

  const handleSelectProduct = () => {
    if (isCurrentProduct) return;

    // If product belongs to a different org, switch org first
    if (product.organization && product.organization._id !== currentOrg?._id) {
      setCurrentOrg(product.organization._id);
    }

    setCurrentProduct(product._id);
    toast.success(t("switcher.switched", { name: product.name }));

    // If on a product settings page, redirect to the equivalent page for the new product
    const productSettingsMatch = location.pathname.match(/^\/settings\/product\/([^/]+)\/(.+)$/);
    if (productSettingsMatch) {
      const subPage = productSettingsMatch[2];
      navigate({ to: `/settings/product/${product.slug}/${subPage}` });
    }
  };

  return (
    <>
      <Card
        className={`h-[140px] flex flex-col ${
          isCurrentProduct ? "ring-2 ring-primary bg-primary/5" : ""
        }`}
      >
        {/* Row 1: Title + Badges */}
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <h3 className="font-medium truncate text-fontSize-base flex-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {userRole && (
              <Badge variant={userRole} className="text-fontSize-xs">
                {t(`roles.${userRole}`)}
              </Badge>
            )}
          </div>
        </div>

        {/* Row 2: Description */}
        <div className="px-4 pt-2 flex-1 min-h-0">
          {product.description ? (
            <p className="text-fontSize-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          ) : (
            <p className="text-fontSize-sm text-muted-foreground/50 italic">
              {t("noDescription")}
            </p>
          )}
        </div>

        {/* Row 3: Members + Actions */}
        <div className="flex items-center justify-between px-4 pb-4 mt-auto">
          <div className="flex items-center gap-1 text-fontSize-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>
              {product.memberCount ?? 0}{" "}
              {(product.memberCount ?? 0) === 1 ? t("memberSingular") : t("memberPlural")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Select button - disabled if not a member */}
            <Button
              variant={isCurrentProduct ? "secondary" : "outline"}
              size="sm"
              className="h-7 text-fontSize-xs"
              onClick={handleSelectProduct}
              disabled={isCurrentProduct || !isMember}
              title={!isMember ? t("actions.noAccess") : undefined}
            >
              {isCurrentProduct ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  {t("actions.selected")}
                </>
              ) : !isMember ? (
                t("actions.noAccess")
              ) : (
                t("actions.select")
              )}
            </Button>
            {/* More actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">{t("actions.menu")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isMember && (
                  <>
                    <DropdownMenuItem onClick={handleViewOrSettings}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t("actions.view")}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={handleViewOrSettings}>
                        <Settings className="mr-2 h-4 w-4" />
                        {t("actions.settings")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowLeaveDialog(true)}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("actions.leave")}
                    </DropdownMenuItem>
                  </>
                )}
                {!isMember && (
                  <DropdownMenuItem disabled>
                    {t("actions.notMember")}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    {isMember && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("actions.delete")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <LeaveProductDialog
        productId={product._id}
        productName={product.name}
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
      />

      <DeleteProductDialog
        productId={product._id}
        productName={product.name}
        onDeleted={() => setShowDeleteDialog(false)}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
}

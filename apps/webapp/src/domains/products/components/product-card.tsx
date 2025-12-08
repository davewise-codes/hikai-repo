import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Building2,
} from "@hikai/ui";
import { LeaveProductDialog } from "./leave-product-dialog";

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
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation("products");
  const navigate = useNavigate();

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Support both role (from getUserProducts) and userRole (from listProducts)
  const userRole = product.role ?? product.userRole;
  const isAdmin = userRole === "admin";
  const hasOrganization = !!product.organization;

  const handleCardClick = () => {
    navigate({ to: "/products/$slug", params: { slug: product.slug } });
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate({
      to: "/settings/product/$slug/general",
      params: { slug: product.slug },
    });
  };

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer h-full group"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-fontSize-base">
                {product.name}
              </CardTitle>
              <CardDescription className="truncate text-fontSize-sm">
                /{product.slug}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {userRole && (
                <Badge variant={userRole} className="text-fontSize-xs">
                  {t(`roles.${userRole}`)}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">{t("actions.menu")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={handleCardClick}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("actions.view")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={handleSettingsClick}>
                      <Settings className="mr-2 h-4 w-4" />
                      {t("actions.settings")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLeaveDialog(true);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("actions.leave")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {product.description && (
            <p className="text-fontSize-sm text-muted-foreground mb-3 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between text-fontSize-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {hasOrganization && (
                <div className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">
                    {product.organization!.name}
                  </span>
                </div>
              )}
              {product.memberCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>
                    {product.memberCount} {product.memberCount === 1 ? t("member") : t("members")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <LeaveProductDialog
        productId={product._id}
        productName={product.name}
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
      />
    </>
  );
}

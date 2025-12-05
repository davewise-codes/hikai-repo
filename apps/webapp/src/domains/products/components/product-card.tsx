import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Users,
} from "@hikai/ui";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    createdAt: number;
    memberCount: number;
  };
  userRole?: "admin" | "member";
}

export function ProductCard({ product, userRole }: ProductCardProps) {
  const { t } = useTranslation("common");

  return (
    <Link to="/products/$slug" params={{ slug: product.slug }}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{product.name}</CardTitle>
              <CardDescription className="truncate">
                /{product.slug}
              </CardDescription>
            </div>
            {userRole && (
              <Badge variant={userRole}>
                {t(`products.roles.${userRole}`)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {product.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>
                {product.memberCount}{" "}
                {product.memberCount === 1
                  ? t("products.member")
                  : t("products.members")}
              </span>
            </div>
            <span>
              {new Date(product.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

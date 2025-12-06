import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  LogOut,
  Sun,
  Moon,
  Settings,
  Folder,
} from "@hikai/ui";
import { useAuth } from "@/domains/auth/hooks";
import { useTheme } from "../hooks/use-theme";
import { useI18n } from "../hooks/use-i18n";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRecentProducts, useCurrentProduct } from "@/domains/products/hooks";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useStore } from "@/store";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useI18n();
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();

  // Hooks para productos recientes
  const recentProducts = useRecentProducts();
  const { currentOrg } = useCurrentOrg();
  const { setCurrentProduct } = useCurrentProduct();
  const setCurrentOrgId = useStore((state) => state.setCurrentOrgId);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // Silently handle logout errors
    }
  };

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale as "en" | "es");
    i18n.changeLanguage(newLocale);
  };

  // Navegar a producto reciente (manejando cambio de org si es necesario)
  const handleProductClick = (product: NonNullable<typeof recentProducts>[number]) => {
    // Si el producto es de otra org, cambiar org primero (sin navegar automáticamente)
    if (product.organization._id !== currentOrg?._id) {
      setCurrentOrgId(product.organization._id);
    }
    // Establecer producto actual
    setCurrentProduct(product._id);
    // Navegar al producto
    navigate({ to: "/products/$slug", params: { slug: product.slug } });
  };

  // Get user initials for fallback
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors cursor-pointer"
          title={user?.name || user?.email || t("userMenu.title")}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image || undefined} alt={user?.name || t("userMenu.user")} referrerPolicy="no-referrer" />
            <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-64">
        {/* User info header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.image || undefined} alt={user?.name || t("userMenu.user")} referrerPolicy="no-referrer" />
              <AvatarFallback className="text-sm">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none truncate flex-1">
                  {user?.name || t("userMenu.user")}
                </p>
                <button
                  type="button"
                  className="flex-shrink-0 p-1 rounded hover:bg-accent transition-colors"
                  title={t("userMenu.profile")}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: "/profile" });
                  }}
                >
                  <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Preferences: Theme */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <span className="flex-1">{t("settings.theme")}</span>
            <span className="flex items-center gap-1">
              {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "light" ? t("settings.light") : t("settings.dark")}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as "light" | "dark")}>
              <DropdownMenuRadioItem value="light" className="cursor-pointer">
                <Sun className="mr-2 h-4 w-4" />
                {t("settings.light")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="cursor-pointer">
                <Moon className="mr-2 h-4 w-4" />
                {t("settings.dark")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Preferences: Language */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <span className="flex-1">{t("settings.language")}</span>
            <span>
              {locale === "en" ? t("settings.english") : t("settings.spanish")}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={locale} onValueChange={handleLocaleChange}>
              <DropdownMenuRadioItem value="en" className="cursor-pointer">
                {t("settings.english")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="es" className="cursor-pointer">
                {t("settings.spanish")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />

        {/* Recent Products */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          {t("userMenu.recentProducts")}
        </DropdownMenuLabel>
        {recentProducts && recentProducts.length > 0 ? (
          <>
            {recentProducts.map((product) => (
              <DropdownMenuItem
                key={product._id}
                onClick={() => handleProductClick(product)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Folder className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm">{product.name}</span>
                    {product.organization._id !== currentOrg?._id && (
                      <span className="text-xs text-muted-foreground truncate">
                        {product.organization.name}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <DropdownMenuItem disabled className="text-muted-foreground">
            {t("userMenu.noRecentProducts")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            to="/products"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("userMenu.myProducts")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          {t("userMenu.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

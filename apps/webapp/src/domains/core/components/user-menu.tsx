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
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  LogOut,
  Settings,
  Folder,
  colorThemes,
  fontSizes,
  toast,
  type Theme,
  type ColorThemeId,
  type FontSize,
} from "@hikai/ui";
import { useAuth } from "@/domains/auth/hooks";
import { useTheme } from "../hooks/use-theme";
import { useColorTheme } from "../hooks/use-color-theme";
import { useFontSize } from "../hooks/use-density";
import { useI18n } from "../hooks/use-i18n";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRecentProducts, useCurrentProduct } from "@/domains/products/hooks";
import { useCurrentOrg } from "@/domains/organizations/hooks";
import { useStore } from "@/store";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const { fontSize, setFontSize } = useFontSize();
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

  // Seleccionar producto reciente (solo cambia contexto, no navega)
  const handleProductClick = (product: NonNullable<typeof recentProducts>[number]) => {
    // Si el producto es de otra org, cambiar org primero
    if (product.organization._id !== currentOrg?._id) {
      setCurrentOrgId(product.organization._id);
    }
    // Establecer producto actual
    setCurrentProduct(product._id);
    // Toast de confirmación
    toast.success(t("products:switcher.switched", { name: product.name }));
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
            <AvatarFallback className="text-fontSize-xs">{getInitials()}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-64">
        {/* User info header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.image || undefined} alt={user?.name || t("userMenu.user")} referrerPolicy="no-referrer" />
              <AvatarFallback className="text-fontSize-sm">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-fontSize-sm font-medium leading-none truncate flex-1">
                  {user?.name || t("userMenu.user")}
                </p>
                <button
                  type="button"
                  className="flex-shrink-0 p-1 rounded hover:bg-accent transition-colors"
                  title={t("userMenu.profile")}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: "/settings/profile" });
                  }}
                >
                  <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <p className="text-fontSize-xs leading-none text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Appearance Section */}
        <DropdownMenuLabel className="text-fontSize-sm text-muted-foreground font-normal">
          {t("userMenu.appearance")}
        </DropdownMenuLabel>

        {/* Mode (Light/Dark/System) */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <span className="flex-1">{t("settings.mode")}</span>
            <span className="text-muted-foreground">
              {theme === "light" && t("settings.light")}
              {theme === "dark" && t("settings.dark")}
              {theme === "system" && t("settings.system")}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
                <DropdownMenuRadioItem value="light" className="cursor-pointer">
                  {t("settings.light")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="cursor-pointer">
                  {t("settings.dark")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className="cursor-pointer">
                  {t("settings.system")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        {/* Color Theme */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <span className="flex-1">{t("settings.colorTheme")}</span>
            <span className="text-muted-foreground">
              {colorThemes[colorTheme]?.name}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={colorTheme} onValueChange={(value) => setColorTheme(value as ColorThemeId)}>
                {Object.values(colorThemes).map((theme) => (
                  <DropdownMenuRadioItem key={theme.id} value={theme.id} className="cursor-pointer">
                    {theme.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        {/* Language */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <span className="flex-1">{t("settings.language")}</span>
            <span className="text-muted-foreground">
              {locale === "en" ? t("settings.english") : t("settings.spanish")}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
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
          </DropdownMenuPortal>
        </DropdownMenuSub>

        {/* Font Size */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <span className="flex-1">{t("settings.fontSize")}</span>
            <span className="text-muted-foreground">
              {t(`settings.fontSize${fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}`)}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={fontSize} onValueChange={(value) => setFontSize(value as FontSize)}>
                {Object.values(fontSizes).map((fs) => (
                  <DropdownMenuRadioItem key={fs.name} value={fs.name} className="cursor-pointer">
                    <div className="flex flex-col">
                      <span>{t(`settings.fontSize${fs.name.charAt(0).toUpperCase() + fs.name.slice(1)}`)}</span>
                      <span className="text-fontSize-xs text-muted-foreground">
                        {t(`settings.fontSize${fs.name.charAt(0).toUpperCase() + fs.name.slice(1)}Desc`)}
                      </span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Recent Products */}
        <DropdownMenuLabel className="text-fontSize-sm text-muted-foreground font-normal">
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
                    <span className="truncate text-fontSize-sm">{product.name}</span>
                    {product.organization._id !== currentOrg?._id && (
                      <span className="text-fontSize-xs text-muted-foreground truncate">
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
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            to="/settings/products"
            className="text-fontSize-sm text-muted-foreground hover:text-foreground"
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

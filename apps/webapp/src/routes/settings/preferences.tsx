import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sun,
  Moon,
  Monitor,
  colorThemes,
  fontSizes,
  type Theme,
  type ColorThemeId,
  type FontSize,
} from "@hikai/ui";
import {
  SettingsLayout,
  SettingsHeader,
  SettingsSection,
  SettingsRow,
} from "@/domains/shared";
import { useTheme } from "@/domains/core/hooks/use-theme";
import { useColorTheme } from "@/domains/core/hooks/use-color-theme";
import { useFontSize } from "@/domains/core/hooks/use-density";
import { useI18n } from "@/domains/core/hooks/use-i18n";

export const Route = createFileRoute("/settings/preferences")({
  component: PreferencesPage,
});

/**
 * Página de preferencias del usuario.
 * Permite configurar tema, color, tamaño de fuente e idioma.
 */
function PreferencesPage() {
  const { t, i18n } = useTranslation("common");

  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const { fontSize, setFontSize } = useFontSize();
  const { locale, setLocale } = useI18n();

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale as "en" | "es");
    i18n.changeLanguage(newLocale);
  };

  return (
    <SettingsLayout>
      <SettingsHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      {/* Appearance Section */}
      <SettingsSection title={t("settings.appearance")}>
        {/* Mode (Light/Dark/System) */}
        <SettingsRow
          label={t("settings.mode")}
          control={
            <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    {t("settings.light")}
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {t("settings.dark")}
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    {t("settings.system")}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Color Theme */}
        <SettingsRow
          label={t("settings.colorTheme")}
          control={
            <Select
              value={colorTheme}
              onValueChange={(v) => setColorTheme(v as ColorThemeId)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(colorThemes).map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Font Size */}
        <SettingsRow
          label={t("settings.fontSize")}
          control={
            <Select
              value={fontSize}
              onValueChange={(v) => setFontSize(v as FontSize)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(fontSizes).map((fs) => (
                  <SelectItem key={fs.name} value={fs.name}>
                    <div className="flex flex-col">
                      <span>
                        {t(
                          `settings.fontSize${fs.name.charAt(0).toUpperCase() + fs.name.slice(1)}`
                        )}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </SettingsSection>

      {/* Preferences Section */}
      <SettingsSection title={t("settings.preferences")}>
        {/* Language */}
        <SettingsRow
          label={t("settings.language")}
          control={
            <Select value={locale} onValueChange={handleLocaleChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("settings.english")}</SelectItem>
                <SelectItem value="es">{t("settings.spanish")}</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </SettingsSection>
    </SettingsLayout>
  );
}

import { ThemeSwitcher } from "./theme-switcher";
import { LanguageSelector } from "./language-selector";
import { useTranslation } from "react-i18next";

export function SettingsPage() {
  const { t } = useTranslation('common');
  
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('settings.title', 'Settings')}</h1>
      
      <div className="space-y-8">
        {/* Appearance */}
        <section>
          <h2 className="text-xl font-semibold mb-4">{t('settings.appearance', 'Appearance')}</h2>
          <div className="flex items-center justify-between">
            <span>{t('settings.theme', 'Theme')}</span>
            <ThemeSwitcher />
          </div>
        </section>
        
        {/* Language */}
        <section>
          <h2 className="text-xl font-semibold mb-4">{t('settings.language', 'Language')}</h2>
          <div className="flex items-center justify-between">
            <span>{t('settings.selectLanguage', 'Select Language')}</span>
            <LanguageSelector />
          </div>
        </section>
      </div>
    </div>
  );
}
import { useTranslation } from 'react-i18next';
import { Button } from '@hikai/ui';
import { useI18n } from '../hooks/use-i18n';
import { Locale } from '../store/core-slice';

const languages = [
  { code: 'en' as Locale, name: 'English' },
  { code: 'es' as Locale, name: 'Español' },
] as const;

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const { locale, setLocale } = useI18n();

  const handleLanguageChange = (languageCode: Locale) => {
    // Update both the store and i18n
    setLocale(languageCode);
    i18n.changeLanguage(languageCode);
  };

  // Use store locale as source of truth, fallback to i18n current language
  const currentLanguage = locale || i18n.language;

  return (
    <div className="flex items-center gap-2">
      {languages.map((language) => (
        <Button
          key={language.code}
          variant={currentLanguage === language.code ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleLanguageChange(language.code)}
        >
          {language.name}
        </Button>
      ))}
    </div>
  );
}
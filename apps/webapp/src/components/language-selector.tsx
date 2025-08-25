import { useTranslation } from 'react-i18next';
import { Button } from '@hikai/ui';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
] as const;

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="flex items-center gap-2">
      {languages.map((language) => (
        <Button
          key={language.code}
          variant={i18n.language === language.code ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleLanguageChange(language.code)}
        >
          {language.name}
        </Button>
      ))}
    </div>
  );
}
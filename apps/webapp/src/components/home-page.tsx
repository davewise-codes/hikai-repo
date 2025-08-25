import { Button, Alert, AlertDescription } from "@hikai/ui";
import { ThemeSwitcher } from "./theme-switcher";
import { LanguageSelector } from "./language-selector";
import { useTranslation } from "react-i18next";

export function HomePage() {
  const { t } = useTranslation('common');
  
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          <ThemeSwitcher />
        </div>
      </div>

      {/* Hero section */}
      <div className="text-center mb-16">
        <h2 className="font-serif text-6xl font-bold mb-6 leading-tight">
          {t('hero.welcome')}{" "}
          <span className="text-primary">{t('hero.viteApp')}</span>
        </h2>
        <p className="font-sans text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('hero.description')}
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg">{t('buttons.getStarted')}</Button>
          <Button variant="outline" size="lg">{t('buttons.learnMore')}</Button>
        </div>
      </div>

      {/* Features section */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="text-center">
          <h3 className="font-serif text-2xl font-semibold mb-4">{t('features.centralizedUI.title')}</h3>
          <p className="text-muted-foreground">
            {t('features.centralizedUI.description')}
          </p>
        </div>
        <div className="text-center">
          <h3 className="font-serif text-2xl font-semibold mb-4">{t('features.vitePowered.title')}</h3>
          <p className="text-muted-foreground">
            {t('features.vitePowered.description')}
          </p>
        </div>
        <div className="text-center">
          <h3 className="font-serif text-2xl font-semibold mb-4">{t('features.routing.title')}</h3>
          <p className="text-muted-foreground">
            {t('features.routing.description')}
          </p>
        </div>
      </div>

      {/* Font demo */}
      <div className="mb-16">
        <h3 className="text-2xl font-bold mb-6">{t('fontDemo.title')}</h3>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-sans text-lg font-semibold mb-2">{t('fontDemo.sans.title')}</h4>
            <p className="font-sans">
              {t('fontDemo.sans.description')}
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-serif text-lg font-semibold mb-2">{t('fontDemo.serif.title')}</h4>
            <p className="font-serif">
              {t('fontDemo.serif.description')}
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-mono text-lg font-semibold mb-2">{t('fontDemo.mono.title')}</h4>
            <p className="font-mono">
              {t('fontDemo.mono.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Alert demo */}
      <Alert className="mb-8">
        <AlertDescription>
          {t('alert.message')}
        </AlertDescription>
      </Alert>
    </div>
  );
}
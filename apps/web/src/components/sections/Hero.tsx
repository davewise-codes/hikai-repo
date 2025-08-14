import { Button } from "@hikai/ui";
import { useTranslation } from "@hikai/i18n";

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="py-20 text-center">
      <h1 className="text-4xl font-bold mb-4">{t("hero.title")}</h1>
      <p className="mb-8">{t("hero.subtitle")}</p>
      <Button>{t("hero.cta")}</Button>
    </section>
  );
}


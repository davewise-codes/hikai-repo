import { Button } from "@hikai/ui";
import { useTranslation } from "@hikai/i18n";

export function Waitlist() {
  const { t } = useTranslation();

  return (
    <section id="waitlist" className="py-20 text-center">
      <h2 className="text-3xl font-semibold mb-6">{t("waitlist.title")}</h2>
      <Button asChild>
        <a href="https://example.com/waitlist" target="_blank" rel="noopener">
          {t("waitlist.cta")}
        </a>
      </Button>
    </section>
  );
}


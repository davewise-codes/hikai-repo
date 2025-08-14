import { useTranslation } from "@hikai/i18n";

export function Features() {
  const { t } = useTranslation();

  return (
    <section id="features" className="py-20">
      <h2 className="text-3xl font-semibold text-center mb-12">{t("features.title")}</h2>
      <div className="grid md:grid-cols-3 gap-8 px-4">
        <div className="border p-4 rounded-lg">{t("features.item1")}</div>
        <div className="border p-4 rounded-lg">{t("features.item2")}</div>
        <div className="border p-4 rounded-lg">{t("features.item3")}</div>
      </div>
    </section>
  );
}


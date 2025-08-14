import { useTranslation } from "@hikai/i18n";

export default function App() {
  const { t } = useTranslation();
  return <div>{t("placeholder")}</div>;
}

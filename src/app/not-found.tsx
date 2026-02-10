import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDisplayLanguage } from "@/actions/settings";
import { t } from "@/lib/i18n";

export default async function NotFound() {
  const locale = await getDisplayLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">{t(locale, "notFound.message")}</p>
      <Link href="/">
        <Button>{t(locale, "notFound.action")}</Button>
      </Link>
    </div>
  );
}

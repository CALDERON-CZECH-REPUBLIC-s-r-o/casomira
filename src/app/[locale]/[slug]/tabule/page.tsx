import { notFound } from "next/navigation";
import { nactiVerejnaData } from "@/lib/verejna-data";
import { nactiVitezeHistorie } from "@/lib/historie";
import { qrSvgDataUri } from "@/lib/qr";
import { verejnyOdkaz } from "@/lib/verejna-url";
import { Tabule } from "./tabule";

export const dynamic = "force-dynamic";

export default async function TabulePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dle?: string }>;
}) {
  const { slug } = await params;
  const { dle } = await searchParams;
  const data = await nactiVerejnaData(slug);
  if (!data) notFound();

  // Default = střídat všechny obrazovky; `?dle=` uzamkne jeden fixní režim.
  const mode =
    dle === "kategorie" ? "kategorie" : dle === "celkova" ? "celkova" : "vse";

  const [qr, historie] = await Promise.all([
    qrSvgDataUri(verejnyOdkaz(slug)),
    mode === "kategorie" || mode === "celkova"
      ? Promise.resolve([])
      : nactiVitezeHistorie(),
  ]);

  return (
    <Tabule
      slug={slug}
      initial={data}
      mode={mode}
      qr={qr}
      historie={historie}
    />
  );
}

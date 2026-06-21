import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { nactiVerejnaData } from "@/lib/verejna-data";
import { VerejnaAkce } from "./verejna-akce";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await nactiVerejnaData(slug);
  if (!data) return { title: "Akce nenalezena" };
  return {
    title: `${data.akce.nazev} — výsledky`,
    description: `Startovní listina a živé výsledky: ${data.akce.nazev}`,
  };
}

export default async function VerejnaAkcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await nactiVerejnaData(slug);
  if (!data) notFound();

  return <VerejnaAkce slug={slug} initial={data} />;
}

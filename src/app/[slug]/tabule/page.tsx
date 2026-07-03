import { notFound } from "next/navigation";
import { nactiVerejnaData } from "@/lib/verejna-data";
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

  const mode = dle === "kategorie" ? "kategorie" : "celkova";

  return <Tabule slug={slug} initial={data} mode={mode} />;
}

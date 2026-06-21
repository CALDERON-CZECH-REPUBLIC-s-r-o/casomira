import Link from "next/link";
import { vyzadujPrihlaseni } from "@/auth/guard";
import { vytvoritAkci } from "@/server/akce";
import { AkceFormFields } from "../../_components/akce-form";

export default async function NovaAkcePage() {
  await vyzadujPrihlaseni();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/admin" className="text-sm text-gray-500 hover:underline">
        ← Administrace
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold">Nová akce</h1>
      <form action={vytvoritAkci} className="flex flex-col gap-6">
        <AkceFormFields />
        <button
          type="submit"
          className="self-start rounded-md bg-black px-4 py-2 font-medium text-white"
        >
          Vytvořit akci
        </button>
      </form>
    </main>
  );
}

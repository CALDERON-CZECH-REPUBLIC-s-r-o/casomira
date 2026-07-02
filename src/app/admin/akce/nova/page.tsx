import { vyzadujPrihlaseni } from "@/auth/guard";
import { vytvoritAkci } from "@/server/akce";
import { AkceFormFields } from "../../_components/akce-form";
import { Btn, Card, PageHeader } from "../../_components/ui";

export default async function NovaAkcePage() {
  await vyzadujPrihlaseni();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <PageHeader
        back={{ href: "/admin", label: "Administrace" }}
        eyebrow="Nová akce"
        title="Založit akci"
      />
      <Card className="p-5">
        <form action={vytvoritAkci} className="flex flex-col gap-6">
          <AkceFormFields />
          <Btn type="submit" className="self-start">
            Vytvořit akci
          </Btn>
        </form>
      </Card>
    </main>
  );
}

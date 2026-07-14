import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth/nextauth";
import { turnstileSiteKey } from "@/lib/turnstile";
import { PoweredBy } from "../admin/_components/ui";
import { LangToggle } from "@/components/lang-toggle";
import { RegistraceForm } from "./registrace-form";

export const dynamic = "force-dynamic";

/**
 * Veřejná registrace pořadatele. Účet se založí ve stavu „čeká na schválení";
 * globální admin ho schválí v panelu zákazníků.
 */
export default async function RegistracePage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <main className="cal-dots-dark cal-glow-top font-brand flex min-h-screen flex-1 flex-col items-center justify-center bg-ink-950 p-6 text-ink-900">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image
            src="/casomir-logo-dark.png"
            alt="Časomír"
            width={1384}
            height={506}
            priority
            className="h-auto w-full max-w-[240px]"
          />
          <div className="cal-eyebrow text-teal-300">Pro pořadatele</div>
        </div>

        <RegistraceForm turnstileSiteKey={turnstileSiteKey()} />

        <div className="mt-8 flex flex-col items-center gap-4">
          <LangToggle variant="dark" />
          <PoweredBy variant="dark" />
        </div>
      </div>
    </main>
  );
}

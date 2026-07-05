import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth/nextauth";
import { Btn, PoweredBy } from "../admin/_components/ui";

/**
 * Přihlášení organizátora (Credentials). Po úspěchu redirect na callbackUrl nebo /admin.
 */
export default async function PrihlaseniPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; chyba?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (session?.user) redirect(sp.callbackUrl ?? "/admin");

  async function prihlasit(formData: FormData) {
    "use server";
    const callbackUrl =
      (formData.get("callbackUrl") as string | null) ?? "/admin";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        heslo: formData.get("heslo"),
        redirectTo: callbackUrl,
      });
    } catch (e) {
      if (e instanceof AuthError) {
        redirect(`/prihlaseni?chyba=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
      throw e;
    }
  }

  return (
    <main className="cal-dots-dark cal-glow-top font-brand flex min-h-screen flex-1 flex-col items-center justify-center bg-ink-950 p-6 text-ink-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image
            src="/casomir-teal-dark.png"
            alt="Časomír"
            width={340}
            height={255}
            priority
            className="h-auto w-full max-w-[260px]"
          />
          <div className="cal-eyebrow text-teal-300">Administrace závodů</div>
        </div>

        <div className="cal-card rounded-[22px] p-6 shadow-xl">
          <h1 className="mb-5 text-center text-[15px] font-semibold text-ink-500">
            Přihlášení organizátora
          </h1>
          {sp.chyba && (
            <p className="mb-4 rounded-[10px] bg-error-bg p-3 text-sm font-medium text-error">
              Nesprávný e-mail nebo heslo.
            </p>
          )}
          <form action={prihlasit} className="flex flex-col gap-4">
            <input
              type="hidden"
              name="callbackUrl"
              value={sp.callbackUrl ?? "/admin"}
            />
            <label className="cal-label">
              E-mail
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="cal-input"
              />
            </label>
            <label className="cal-label">
              Heslo
              <input
                name="heslo"
                type="password"
                required
                autoComplete="current-password"
                className="cal-input"
              />
            </label>
            <Btn type="submit" className="mt-1 w-full">
              Přihlásit se
            </Btn>
          </form>
        </div>

        <div className="mt-8 flex justify-center">
          <PoweredBy variant="dark" />
        </div>
      </div>
    </main>
  );
}

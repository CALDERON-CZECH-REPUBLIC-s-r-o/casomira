import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth/nextauth";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Přihlášení organizátora</h1>
      {sp.chyba && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Nesprávný e-mail nebo heslo.
        </p>
      )}
      <form action={prihlasit} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={sp.callbackUrl ?? "/admin"} />
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Heslo
          <input
            name="heslo"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 font-medium text-white"
        >
          Přihlásit se
        </button>
      </form>
    </main>
  );
}

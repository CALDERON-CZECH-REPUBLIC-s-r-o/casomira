CREATE TABLE "historicky_vysledek" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prijmeni" text NOT NULL,
	"jmeno" text NOT NULL,
	"rok_narozeni" integer,
	"pohlavi" "pohlavi",
	"rok" integer NOT NULL,
	"akce_nazev" text NOT NULL,
	"kategorie" text,
	"oddil" text,
	"poradi" integer,
	"cas_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "historicky_osoba_idx" ON "historicky_vysledek" USING btree ("prijmeni","jmeno","rok_narozeni");--> statement-breakpoint
CREATE INDEX "historicky_rok_idx" ON "historicky_vysledek" USING btree ("rok");
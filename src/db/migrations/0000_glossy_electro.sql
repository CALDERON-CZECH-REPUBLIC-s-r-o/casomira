CREATE TYPE "public"."cilovy_stav" AS ENUM('platny', 'neprirazeno', 'smazany', 'DNF');--> statement-breakpoint
CREATE TYPE "public"."pohlavi" AS ENUM('M', 'Z');--> statement-breakpoint
CREATE TYPE "public"."pohlavi_kategorie" AS ENUM('M', 'Z', 'smisene');--> statement-breakpoint
CREATE TYPE "public"."zavodnik_stav" AS ENUM('prihlasen', 'nenastoupil_DNS', 'diskvalifikovan_DSQ');--> statement-breakpoint
CREATE TABLE "akce" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nazev" text NOT NULL,
	"datum" date NOT NULL,
	"misto" text,
	"rok" integer NOT NULL,
	"slug" text NOT NULL,
	"cas_startu" timestamp with time zone,
	"poznamka" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "akce_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "kategorie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"akce_id" uuid NOT NULL,
	"nazev" text NOT NULL,
	"pohlavi" "pohlavi_kategorie" NOT NULL,
	"rok_narozeni_od" integer,
	"rok_narozeni_do" integer,
	"poradi" integer DEFAULT 0 NOT NULL,
	"cas_startu" timestamp with time zone,
	"poznamka" text
);
--> statement-breakpoint
CREATE TABLE "zavodnik" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"akce_id" uuid NOT NULL,
	"jmeno" text NOT NULL,
	"prijmeni" text NOT NULL,
	"rok_narozeni" integer,
	"pohlavi" "pohlavi",
	"startovni_cislo" integer,
	"oddil" text,
	"kategorie_id" uuid,
	"stav" "zavodnik_stav" DEFAULT 'prihlasen' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zavodnik_akce_cislo_uq" UNIQUE("akce_id","startovni_cislo")
);
--> statement-breakpoint
CREATE TABLE "cilovy_zaznam" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"akce_id" uuid NOT NULL,
	"cas_cile" timestamp (3) with time zone NOT NULL,
	"startovni_cislo" integer,
	"zavodnik_id" uuid,
	"stav" "cilovy_stav" DEFAULT 'neprirazeno' NOT NULL,
	"poradi_doteku" integer,
	"poznamka" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	CONSTRAINT "cilovy_zaznam_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
ALTER TABLE "kategorie" ADD CONSTRAINT "kategorie_akce_id_akce_id_fk" FOREIGN KEY ("akce_id") REFERENCES "public"."akce"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zavodnik" ADD CONSTRAINT "zavodnik_akce_id_akce_id_fk" FOREIGN KEY ("akce_id") REFERENCES "public"."akce"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zavodnik" ADD CONSTRAINT "zavodnik_kategorie_id_kategorie_id_fk" FOREIGN KEY ("kategorie_id") REFERENCES "public"."kategorie"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cilovy_zaznam" ADD CONSTRAINT "cilovy_zaznam_akce_id_akce_id_fk" FOREIGN KEY ("akce_id") REFERENCES "public"."akce"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cilovy_zaznam" ADD CONSTRAINT "cilovy_zaznam_zavodnik_id_zavodnik_id_fk" FOREIGN KEY ("zavodnik_id") REFERENCES "public"."zavodnik"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kategorie_akce_idx" ON "kategorie" USING btree ("akce_id");--> statement-breakpoint
CREATE INDEX "zavodnik_akce_idx" ON "zavodnik" USING btree ("akce_id");--> statement-breakpoint
CREATE INDEX "zavodnik_kategorie_idx" ON "zavodnik" USING btree ("kategorie_id");--> statement-breakpoint
CREATE INDEX "cilovy_akce_cas_idx" ON "cilovy_zaznam" USING btree ("akce_id","cas_cile");--> statement-breakpoint
CREATE INDEX "cilovy_zavodnik_idx" ON "cilovy_zaznam" USING btree ("zavodnik_id");
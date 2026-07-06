CREATE TYPE "public"."prihlaska_stav" AS ENUM('nova', 'schvalena', 'zamitnuta');--> statement-breakpoint
CREATE TABLE "prihlaska" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"akce_id" uuid NOT NULL,
	"jmeno" text NOT NULL,
	"prijmeni" text NOT NULL,
	"rok_narozeni" integer,
	"oddil" text,
	"telefon" text,
	"email" text,
	"pohlavi" "pohlavi",
	"stav" "prihlaska_stav" DEFAULT 'nova' NOT NULL,
	"zaplaceno" boolean DEFAULT false NOT NULL,
	"variabilni_symbol" text NOT NULL,
	"zavodnik_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "registrace_otevrena" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "registrace_schvalovani" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "ucet" text;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "startovne" integer;--> statement-breakpoint
ALTER TABLE "prihlaska" ADD CONSTRAINT "prihlaska_akce_id_akce_id_fk" FOREIGN KEY ("akce_id") REFERENCES "public"."akce"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prihlaska" ADD CONSTRAINT "prihlaska_zavodnik_id_zavodnik_id_fk" FOREIGN KEY ("zavodnik_id") REFERENCES "public"."zavodnik"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prihlaska_akce_idx" ON "prihlaska" USING btree ("akce_id");
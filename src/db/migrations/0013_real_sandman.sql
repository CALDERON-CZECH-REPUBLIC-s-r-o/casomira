CREATE TYPE "public"."uzivatel_role" AS ENUM('organizator', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."uzivatel_stav" AS ENUM('ceka', 'schvalen', 'zamitnut');--> statement-breakpoint
ALTER TABLE "uzivatel" ADD COLUMN "role" "uzivatel_role" DEFAULT 'organizator' NOT NULL;--> statement-breakpoint
ALTER TABLE "uzivatel" ADD COLUMN "stav" "uzivatel_stav" DEFAULT 'ceka' NOT NULL;--> statement-breakpoint
ALTER TABLE "uzivatel" ADD COLUMN "firma" text;--> statement-breakpoint
ALTER TABLE "uzivatel" ADD COLUMN "ico" text;--> statement-breakpoint
ALTER TABLE "uzivatel" ADD COLUMN "dic" text;--> statement-breakpoint
ALTER TABLE "uzivatel" ADD COLUMN "telefon" text;--> statement-breakpoint
ALTER TABLE "uzivatel" ADD COLUMN "schvaleno_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "uzivatel_id" uuid;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "fakturace_uhrazeno" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "akce" ADD CONSTRAINT "akce_uzivatel_id_uzivatel_id_fk" FOREIGN KEY ("uzivatel_id") REFERENCES "public"."uzivatel"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Existující účty (zakládané jen přes CLI) jsou důvěryhodné → rovnou schválené.
UPDATE "uzivatel" SET "stav" = 'schvalen' WHERE "stav" = 'ceka';
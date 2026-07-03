CREATE TABLE "merici_bod" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"akce_id" uuid NOT NULL,
	"nazev" text NOT NULL,
	"poradi" integer DEFAULT 0 NOT NULL,
	"vzdalenost_m" integer,
	"typ" text DEFAULT 'prubezna' NOT NULL,
	"je_cil" boolean DEFAULT false NOT NULL,
	"zarizeni" text
);
--> statement-breakpoint
ALTER TABLE "cilovy_zaznam" ADD COLUMN "bod_id" uuid;--> statement-breakpoint
ALTER TABLE "merici_bod" ADD CONSTRAINT "merici_bod_akce_id_akce_id_fk" FOREIGN KEY ("akce_id") REFERENCES "public"."akce"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "merici_bod_akce_idx" ON "merici_bod" USING btree ("akce_id","poradi");--> statement-breakpoint
ALTER TABLE "cilovy_zaznam" ADD CONSTRAINT "cilovy_zaznam_bod_id_merici_bod_id_fk" FOREIGN KEY ("bod_id") REFERENCES "public"."merici_bod"("id") ON DELETE set null ON UPDATE no action;
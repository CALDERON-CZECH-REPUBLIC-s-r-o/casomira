CREATE TABLE "uprava_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"akce_id" uuid NOT NULL,
	"zaznam_id" uuid,
	"popis" text NOT NULL,
	"kdy" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uprava_log" ADD CONSTRAINT "uprava_log_akce_id_akce_id_fk" FOREIGN KEY ("akce_id") REFERENCES "public"."akce"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uprava_log_akce_idx" ON "uprava_log" USING btree ("akce_id","kdy");
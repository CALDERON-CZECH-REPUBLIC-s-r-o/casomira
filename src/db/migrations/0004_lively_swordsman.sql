ALTER TABLE "uzivatel" ADD COLUMN "onboarding_hotovo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "verejna" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "auto_publikace" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "presnost_casu" text DEFAULT 'desetiny' NOT NULL;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "delka_m" integer;
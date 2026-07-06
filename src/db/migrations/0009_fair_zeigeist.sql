ALTER TABLE "akce" ADD COLUMN "vysledky_uzavreny" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "akce" ADD COLUMN "uzavreno_at" timestamp with time zone;
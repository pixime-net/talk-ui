import { z } from "zod/v4";

const envSchema = z.object({
  VITE_AGENT_URL: z.url("VITE_AGENT_URL must be a valid URL"),
});

const parsed = envSchema.safeParse({
  VITE_AGENT_URL:
    (import.meta.env.VITE_AGENT_URL as string | undefined) ??
    "http://localhost:8090",
});

if (!parsed.success) {
  throw new Error(
    `Environment validation failed:\n${parsed.error.issues.map((i) => `  - ${i.message}`).join("\n")}`,
  );
}

export const config = parsed.data;

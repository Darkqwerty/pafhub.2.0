import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:8080'),
  RAWG_API_KEY: z.string().optional(),
  STEAM_API_KEY: z.string().optional(),
  F95_USERNAME: z.string().optional(),
  F95_PASSWORD: z.string().optional(),
});

export const config = envSchema.parse(process.env);

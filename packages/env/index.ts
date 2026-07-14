import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    APP_URL: z.url().default('http://localhost:3001'),

    // Database — optional at build time, validated at runtime in lib/db.ts
    DATABASE_URL: z.url().optional(),
    DIRECT_URL: z.url().optional(),

    // JWT — optional at build time, asserted at call site in lib/auth.ts
    JWT_SECRET: z.string().min(32).optional(),

    // Email (Resend) — optional in dev (falls back to console), required in prod
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.email().default('no-reply@movux.app'),

    // Supabase Storage — optional at build time, asserted at runtime in lib/storage/supabase.ts
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_STORAGE_BUCKET: z.string().default('request-attachments'),
  },
  client: {
    // URL is not secret; prefixed for consistency with the pronai project pattern
    NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  },
  shared: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
  },
  emptyStringAsUndefined: true,
})

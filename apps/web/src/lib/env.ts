const SUPABASE_URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function getEnv(): Env {
  const supabaseUrl = process.env[SUPABASE_URL_KEY];
  const supabaseAnonKey = process.env[SUPABASE_ANON_KEY];

  if (!supabaseUrl) {
    throw new Error(
      `Missing required environment variable: ${SUPABASE_URL_KEY}. ` +
        `Please set it in your .env.local file or Vercel dashboard.`,
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      `Missing required environment variable: ${SUPABASE_ANON_KEY}. ` +
        `Please set it in your .env.local file or Vercel dashboard.`,
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export { getEnv };
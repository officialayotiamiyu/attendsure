const requiredEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

type RequiredKey = (typeof requiredEnv)[number];

function readEnv(key: RequiredKey): string {
  const value = import.meta.env[key];
  if (!value) {
    // Provide helpful error message during development
    if (import.meta.env.DEV) {
      console.warn(`Missing environment variable: ${key}. Create a .env.local file with ${key}=...`);
      return '';
    }
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY'),
  appName: import.meta.env.VITE_APP_NAME ?? 'AttendSure'
};

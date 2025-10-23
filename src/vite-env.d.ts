/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // adicione outras variáveis aqui se precisar
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

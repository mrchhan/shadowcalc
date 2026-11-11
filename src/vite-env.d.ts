/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional URL of the server-side rates endpoint, e.g. "/api/rates". */
  readonly VITE_RATES_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** * The base URL for the AESA Django Backend API 
   * Example: http://localhost:8000/api
   */
  readonly VITE_API_BASE_URL: string;

  /**
   * Optional: Add other environment variables here as you scale
   * (e.g., VITE_APP_TITLE, VITE_ENABLE_ANALYTICS)
   */
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
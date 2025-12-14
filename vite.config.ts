import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
  define: {
    'import.meta.env.VITE_FACEBOOK_APP_ID': JSON.stringify('1165354375707892'),
    'import.meta.env.VITE_FACEBOOK_AUTH_ENDPOINT': JSON.stringify('/auth/facebook'),
  },
});

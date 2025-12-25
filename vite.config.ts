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
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify('290138074368-14j6m3qbb6h2nv6rp317jo0qasag5u3u.apps.googleusercontent.com'),
  },
});

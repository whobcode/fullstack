import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { NavBar } from "./components/NavBar";
import { VoiceAssistant } from "./components/VoiceAssistant";
import { AuthProvider } from "./lib/AuthContext";
import { VoiceAssistantProvider } from "./lib/VoiceAssistantContext";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-black text-shade-red-100">
        <AuthProvider>
          <VoiceAssistantProvider>
            <NavBar />
            <main className="container mx-auto p-4">
              {children}
            </main>
            <VoiceAssistant />
          </VoiceAssistantProvider>
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1 className="neon-text-strong text-4xl font-bold mb-4">{message}</h1>
      <p className="text-shade-red-200 mb-4">{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto neon-border bg-shade-black-600 text-shade-red-300">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

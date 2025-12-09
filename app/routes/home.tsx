import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "me.shade - Everyone has a shade. This is where yours lives." },
    { name: "description", content: "A mysterious, neon-lit social RPG platform where everyone's shade can thrive." },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: { VALUE_FROM_CLOUDFLARE: string } } }).cloudflare.env;
  return { message: env.VALUE_FROM_CLOUDFLARE };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome message={loaderData.message} />;
}

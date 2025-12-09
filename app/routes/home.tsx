import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "hwmnbn - Connect. Share. Belong." },
    { name: "description", content: "A social platform to connect with friends, share updates, and build community." },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: { VALUE_FROM_CLOUDFLARE: string } } }).cloudflare.env;
  return { message: env.VALUE_FROM_CLOUDFLARE };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome message={loaderData.message} />;
}

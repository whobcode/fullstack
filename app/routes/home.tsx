import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "me - Connect with friends and the world around you" },
    { name: "description", content: "me helps you connect and share with the people in your life." },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  const env = (context as { cloudflare: { env: { VALUE_FROM_CLOUDFLARE: string } } }).cloudflare.env;
  return { message: env.VALUE_FROM_CLOUDFLARE };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome message={loaderData.message} />;
}

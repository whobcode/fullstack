import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "me - Connect with friends and the world around you" },
    { name: "description", content: "me helps you connect and share with the people in your life." },
  ];
}

export function loader() {
  return { message: '' };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome message={loaderData.message} />;
}

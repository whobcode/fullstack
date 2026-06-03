import { redirect, type LoaderFunctionArgs } from "react-router";

// Backwards-compatibility: the game section moved from /game/* to /shade/*.
// Permanently redirect any old /game or /game/<rest> URL (bookmarks, external
// links, search results) to the matching /shade path so they no longer 404.
export function loader({ request, params }: LoaderFunctionArgs) {
  const splat = params["*"] ?? "";
  const url = new URL(request.url);
  const target = (splat ? `/shade/${splat}` : "/shade") + url.search + url.hash;
  return redirect(target, 301);
}

export default function GameRedirect() {
  return null;
}

import { Navigate } from "react-router-dom";

/**
 * Find Players was merged into the battle tab: the target list (bounties on
 * top, then everyone attackable) is the battle screen now. Kept as a redirect
 * so existing links and bookmarks still land somewhere useful.
 */
export default function PlayersRedirect() {
  return <Navigate to="/shade/battle" replace />;
}

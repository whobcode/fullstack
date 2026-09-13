import { Outlet } from "react-router";

/**
 * Layout for the `.shade` game routes.
 *
 * Its only job is to put every game page inside `.shade-dark-bg`, which is
 * where the game's readability overrides live (see app.css). Scoping them to a
 * wrapper keeps the social side — and the shared NavBar, which sits outside
 * this tree — on their own theme, mirroring how `.social-dark-bg` works.
 */
export default function ShadeLayout() {
  return (
    <div className="shade-dark-bg">
      <Outlet />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../lib/api";

// Public social profile (read-only). Combat stats stay private — for those,
// link out to the game/gamer profile (which shows trophies only).
type SocialProfile = {
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  cover_photo_url?: string | null;
  created_at?: string | null;
};

export default function PublicSocialProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient.get<{ data: SocialProfile }>(`/users/${encodeURIComponent(id)}/profile`)
      .then((r) => setProfile(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-center text-social-green-600">Loading profile…</div>;
  if (error || !profile) return <div className="p-6 text-center text-red-600">{error || "Profile not found"}</div>;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cover */}
      <div className="h-40 sm:h-52 rounded-b-2xl overflow-hidden bg-gradient-to-r from-social-green-600 to-social-green-400">
        {profile.cover_photo_url && (
          <img src={profile.cover_photo_url} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="px-4 -mt-12">
        <div className="flex items-end gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="w-24 h-24 rounded-full ring-4 ring-white object-cover bg-white" />
          ) : (
            <div className="w-24 h-24 rounded-full ring-4 ring-white bg-gradient-to-br from-social-green-400 to-social-green-600 flex items-center justify-center text-white text-3xl font-bold">
              {profile.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="pb-2">
            <h1 className="text-2xl font-bold text-social-forest-700">{profile.username}</h1>
            {profile.created_at && (
              <p className="text-xs text-social-forest-400">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-social-forest-600 whitespace-pre-wrap">{profile.bio}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/shade/u/${encodeURIComponent(profile.username)}`}
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-shade-red-700 to-fuchsia-600 hover:from-shade-red-600 hover:to-fuchsia-500 transition-all shadow-lg shadow-fuchsia-900/30"
          >
            ⚔ Game profile
          </Link>
          <Link
            to="/feed"
            className="px-5 py-2.5 rounded-xl font-semibold bg-social-cream-200 text-social-forest-700 hover:bg-social-cream-300 transition-all"
          >
            ← Back to me
          </Link>
        </div>
      </div>
    </div>
  );
}

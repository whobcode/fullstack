import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type ProfileData = {
  username: string;
  avatar_url?: string;
  bio?: string;
  cover_photo_url?: string;
  fb_about?: string;
  fb_location?: string;
  fb_data_synced_at?: string;
};

export default function MyProfilePage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [fbAbout, setFbAbout] = useState("");
  const [fbLocation, setFbLocation] = useState("");
  const [fbSyncedAt, setFbSyncedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get<{ data: ProfileData }>("/users/me");
        setUsername(res.data.username);
        setAvatarUrl(res.data.avatar_url ?? "");
        setBio(res.data.bio ?? "");
        setCoverPhotoUrl(res.data.cover_photo_url ?? "");
        setFbAbout(res.data.fb_about ?? "");
        setFbLocation(res.data.fb_location ?? "");
        setFbSyncedAt(res.data.fb_data_synced_at ?? null);
      } catch (err: any) {
        setError(err.message);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    try {
      await apiClient.put("/users/me", { username, bio, avatar_url: avatarUrl });
      if (user) {
        login({ ...user, username });
      }
      setStatus("Saved");
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const needsUsername = username.startsWith("fb_");

  return (
    <div className="min-h-screen bg-social-cream-100">
      {/* Cover Photo Section - Facebook style */}
      <div className="relative">
        <div
          className="h-64 md:h-80 w-full bg-gradient-to-r from-social-blue-500 to-social-blue-600"
          style={coverPhotoUrl ? {
            backgroundImage: `url(${coverPhotoUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          {!coverPhotoUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-social-blue-200">
              <span className="text-lg">No cover photo</span>
            </div>
          )}
        </div>

        {/* Profile Info Overlay */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative -mt-20 flex flex-col md:flex-row items-center md:items-end gap-4">
            {/* Profile Picture */}
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-40 h-40 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                />
              ) : (
                <div className="w-40 h-40 rounded-full border-4 border-white shadow-lg bg-social-blue-100 flex items-center justify-center">
                  <span className="text-5xl font-bold text-social-blue-600">
                    {username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name and Actions */}
            <div className="flex-1 text-center md:text-left pb-4">
              <h1 className="text-3xl font-bold text-social-navy-700">{username}</h1>
              {fbLocation && (
                <p className="text-social-navy-500 flex items-center justify-center md:justify-start gap-1 mt-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  {fbLocation}
                </p>
              )}
              {fbSyncedAt && (
                <p className="text-xs text-social-navy-400 mt-1">
                  Synced from Facebook
                </p>
              )}
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-social-cream-200 hover:bg-social-cream-300 text-social-navy-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Intro */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-bold text-social-navy-700 mb-3">Intro</h2>

              {(fbAbout || bio) && (
                <p className="text-social-navy-600 text-center mb-3">{bio || fbAbout}</p>
              )}

              {fbLocation && (
                <div className="flex items-center gap-2 text-social-navy-600 py-2">
                  <svg className="w-5 h-5 text-social-navy-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  <span>Lives in <strong>{fbLocation}</strong></span>
                </div>
              )}

              {fbSyncedAt && (
                <div className="flex items-center gap-2 text-social-navy-600 py-2">
                  <svg className="w-5 h-5 text-social-navy-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Connected with Facebook</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Edit Form or Posts */}
          <div className="md:col-span-2">
            {needsUsername && (
              <div className="bg-social-gold-50 border border-social-gold-200 rounded-lg p-4 mb-4">
                <p className="text-social-gold-800 font-medium">
                  Choose a custom username to replace the temporary Facebook one.
                </p>
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-xl font-bold text-social-navy-700">Edit Profile</h2>

                <div>
                  <label className="block text-sm font-medium text-social-navy-600 mb-1">Username</label>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-social-blue-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-social-navy-600 mb-1">Avatar URL</label>
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-social-blue-500"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-social-navy-600 mb-1">Bio</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-social-blue-500"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                {status && <p className="text-sm text-green-600">{status}</p>}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-social-blue-600 hover:bg-social-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-social-navy-700 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-social-navy-700 mb-4">Posts</h2>
                <p className="text-social-navy-500 text-center py-8">No posts yet. Share something with your friends!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

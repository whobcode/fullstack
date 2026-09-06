import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { apiClient } from "../lib/api";

type DiscoverySettings = {
  phone: string | null;
  phone_verified: boolean;
  discoverable_by_phone: boolean;
  discoverable_by_location: boolean;
};

/** Controls who can find this account by phone number or approximate location. */
function DiscoverySettingsSection() {
  const [settings, setSettings] = useState<DiscoverySettings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<{ data: DiscoverySettings }>("/users/me/discovery")
      .then((res) => setSettings(res.data))
      .catch(() => setError("Could not load discovery settings"));
  }, []);

  const update = async (key: keyof DiscoverySettings, value: boolean) => {
    if (!settings) return;
    const previous = settings;

    setSettings({ ...settings, [key]: value });
    setSaving(key);
    setError(null);

    try {
      await apiClient.put("/users/me/discovery", { [key]: value });
    } catch {
      setSettings(previous); // Roll the toggle back if the save failed.
      setError("Could not save that change");
    } finally {
      setSaving(null);
    }
  };

  if (!settings) {
    return <p className="text-sm text-social-forest-500">{error ?? "Loading…"}</p>;
  }

  const toggles: { key: keyof DiscoverySettings; label: string; hint: string }[] = [
    {
      key: "discoverable_by_phone",
      label: "Let people find me by phone number",
      hint: settings.phone_verified
        ? "People who have your number in their contacts can be suggested you."
        : "Add and verify a phone number to use this.",
    },
    {
      key: "discoverable_by_location",
      label: "Suggest me to people nearby",
      hint: "Uses a rough area only — never your exact location.",
    },
  ];

  return (
    <div className="space-y-4">
      {toggles.map(({ key, label, hint }) => (
        <div key={key} className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-social-forest-700">{label}</p>
            <p className="text-xs text-social-forest-400 mt-0.5">{hint}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(settings[key])}
            aria-label={label}
            disabled={saving === key}
            onClick={() => update(key, !settings[key])}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              settings[key] ? "bg-social-green-600" : "bg-social-cream-400"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform mt-0.5 ${
                settings[key] ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      ))}
      {error && <p className="text-xs text-social-orange-700">{error}</p>}
    </div>
  );
}

function DeleteAccountSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await apiClient.delete("/users/me");
      // Account (and its data) is gone — clear local session and leave.
      await logout();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  };

  return (
    <section className="social-panel rounded-2xl p-5 shadow border border-red-300">
      <h2 className="text-xl font-semibold text-red-700 mb-1">Delete Account</h2>
      <p className="text-sm text-social-forest-500 mb-4">
        Permanently delete your account and all associated data — your profile, posts, friends,
        game characters, uploaded images, and your saved voice assistant conversations. This cannot
        be undone.
      </p>
      <label className="block text-sm text-social-forest-500 mb-1" htmlFor="delete-confirm">
        Type <span className="font-semibold text-red-700">DELETE</span> to confirm
      </label>
      <input
        id="delete-confirm"
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-social-cream-100 border border-red-200 text-social-forest-700 focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
        placeholder="DELETE"
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={confirmText !== "DELETE" || deleting}
        className="w-full bg-red-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deleting ? "Deleting…" : "Delete My Account"}
      </button>
    </section>
  );
}

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/auth/password/change", {
        ...(hasPassword ? { currentPassword } : {}),
        newPassword,
      });
      setMessage({
        type: "success",
        text: hasPassword ? "Password changed successfully." : "Password created successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-social-cream-100 border border-social-cream-300 text-social-forest-700 focus:outline-none focus:ring-2 focus:ring-social-gold-400";

  return (
    <section className="social-panel rounded-2xl p-5 shadow">
      <h2 className="text-xl font-semibold text-social-forest-700 mb-1">
        {hasPassword ? "Change Password" : "Create Password"}
      </h2>
      <p className="text-sm text-social-forest-500 mb-4">
        {hasPassword
          ? "Update the password you use to sign in."
          : "Your account currently signs in with Google or a magic link. Set a password to also sign in with email and password."}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {hasPassword && (
          <div>
            <label className="block text-sm text-social-forest-500 mb-1" htmlFor="current-password">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              required
            />
          </div>
        )}
        <div>
          <label className="block text-sm text-social-forest-500 mb-1" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            minLength={8}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-social-forest-500 mb-1" htmlFor="confirm-password">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            minLength={8}
            required
          />
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-social-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-social-forest-600 to-social-forest-800 text-social-cream-100 px-6 py-2.5 rounded-lg font-semibold hover:from-social-forest-700 hover:to-social-forest-900 transition-all shadow disabled:opacity-60"
        >
          {submitting ? "Saving…" : hasPassword ? "Change Password" : "Create Password"}
        </button>
      </form>
    </section>
  );
}

export default function SettingsPage() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="social-panel rounded-2xl p-6 text-center">
          <p className="text-social-forest-600">Please log in to access settings.</p>
          <Link to="/login" className="social-button mt-4 inline-block px-6 py-2 rounded-lg">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen social-dark-bg py-6">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
      {/* Header */}
      <header className="social-panel rounded-3xl p-6 shadow-xl">
        <p className="text-xs uppercase tracking-[0.25rem] text-social-gold-600">Account</p>
        <h1 className="text-3xl font-bold text-social-forest-700">Settings</h1>
        <p className="mt-2 text-social-forest-500">Manage your account and preferences</p>
      </header>

      {/* Profile Settings */}
      <section className="social-panel rounded-2xl p-5 shadow">
        <h2 className="text-xl font-semibold text-social-forest-700 mb-4">Profile</h2>
        <div className="space-y-3">
          <Link
            to="/profile/me"
            className="flex items-center justify-between p-3 rounded-lg bg-social-cream-200 hover:bg-social-cream-300 transition-colors"
          >
            <span className="text-social-forest-600">Edit Profile</span>
            <span className="text-social-gold-600">→</span>
          </Link>
        </div>
      </section>

      {/* Account Settings */}
      <section className="social-panel rounded-2xl p-5 shadow">
        <h2 className="text-xl font-semibold text-social-forest-700 mb-4">Account</h2>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-social-cream-200">
            <p className="text-sm text-social-forest-500">Email</p>
            <p className="text-social-forest-700">{user?.email || 'Not set'}</p>
          </div>
          <div className="p-3 rounded-lg bg-social-cream-200">
            <p className="text-sm text-social-forest-500">Username</p>
            <p className="text-social-forest-700">{user?.username}</p>
          </div>
        </div>
      </section>

      {/* Password - create or change */}
      <PasswordSection hasPassword={!!user?.has_password} />

      {/* Game Access - Hidden gateway to the game */}
      <section className="social-panel rounded-2xl p-5 shadow border-2 border-social-gold-400">
        <h2 className="text-xl font-semibold text-social-forest-700 mb-2">Shade RPG</h2>
        <p className="text-sm text-social-forest-500 mb-4">
          Access the shadow realm - an RPG experience hidden within.
        </p>
        <Link
          to="/shade"
          className="block w-full text-center bg-gradient-to-r from-social-forest-600 to-social-forest-800 text-social-cream-100 px-6 py-3 rounded-lg font-semibold hover:from-social-forest-700 hover:to-social-forest-900 transition-all shadow-lg"
        >
          Enter the Shade →
        </Link>
      </section>

      {/* Privacy */}
      <section className="social-panel rounded-2xl p-5 shadow">
        <h2 className="text-xl font-semibold text-social-forest-700 mb-4">Privacy</h2>
        <DiscoverySettingsSection />
        <div className="space-y-3 text-sm text-social-forest-500 mt-5 pt-5 border-t border-social-cream-400">
          <p>Your data is handled according to our privacy policy.</p>
          <Link to="/privacy" className="text-social-green-600 hover:underline">View Privacy Policy</Link>
        </div>
      </section>

      {/* Danger zone */}
      <DeleteAccountSection />
      </div>
    </div>
  );
}

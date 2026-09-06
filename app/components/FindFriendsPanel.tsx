import { useState } from "react";
import { apiClient } from "../lib/api";

type FindFriendsPanelProps = {
  /** Called after a match or location update so the caller can refresh suggestions. */
  onDiscovered?: () => void;
};

type ContactPickerNavigator = Navigator & {
  contacts?: {
    select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ tel?: string[] }[]>;
  };
};

export function FindFriendsPanel({ onDiscovered }: FindFriendsPanelProps) {
  const [busy, setBusy] = useState<"contacts" | "location" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNumbers, setManualNumbers] = useState("");

  const submitPhones = async (phones: string[]) => {
    if (phones.length === 0) {
      setError("No phone numbers to check");
      return;
    }

    setBusy("contacts");
    setError(null);
    setStatus(null);

    try {
      const res = await apiClient.post<{ matched: number }>("/users/contacts/match", { phones });
      setStatus(
        res.matched > 0
          ? `Found ${res.matched} ${res.matched === 1 ? "person" : "people"} you know`
          : "None of those contacts are here yet"
      );
      setManualOpen(false);
      setManualNumbers("");
      onDiscovered?.();
    } catch (err: any) {
      setError(err?.message ?? "Could not check contacts");
    } finally {
      setBusy(null);
    }
  };

  const importFromDevice = async () => {
    const nav = navigator as ContactPickerNavigator;

    // The Contact Picker API is only available in some mobile browsers; the
    // manual entry box is the fallback everywhere else.
    if (!nav.contacts?.select) {
      setManualOpen(true);
      setStatus(null);
      setError(null);
      return;
    }

    try {
      const picked = await nav.contacts.select(["tel"], { multiple: true });
      const phones = picked.flatMap((p) => p.tel ?? []).filter(Boolean);
      await submitPhones(phones);
    } catch {
      // The user dismissed the picker, or it is unavailable in this context.
      setManualOpen(true);
    }
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setError("This browser can't share location");
      return;
    }

    setBusy("location");
    setError(null);
    setStatus(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await apiClient.put("/users/me/location", {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setStatus("Location saved — we'll suggest people in your area");
          onDiscovered?.();
        } catch (err: any) {
          setError(err?.message ?? "Could not save location");
        } finally {
          setBusy(null);
        }
      },
      () => {
        setError("Location permission denied");
        setBusy(null);
      },
      { maximumAge: 600000, timeout: 10000 }
    );
  };

  return (
    <div className="social-panel rounded-2xl p-6">
      <span className="text-xs font-semibold tracking-wider text-social-gold-600 uppercase">Discover</span>
      <h2 className="text-xl font-bold text-gray-900 mt-1 mb-1">Find people you know</h2>
      <p className="text-sm text-gray-500 mb-4">
        Match your contacts or find people nearby. Your contacts are checked and discarded —
        we never store your address book.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={importFromDevice}
          disabled={busy !== null}
          className="social-button rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {busy === "contacts" ? "Checking..." : "Find from contacts"}
        </button>
        <button
          onClick={shareLocation}
          disabled={busy !== null}
          className="social-button-outline rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {busy === "location" ? "Locating..." : "Find people nearby"}
        </button>
      </div>

      {manualOpen && (
        <div className="mt-4 space-y-2">
          <label htmlFor="manual-numbers" className="text-sm text-gray-500">
            Paste phone numbers, one per line:
          </label>
          <textarea
            id="manual-numbers"
            value={manualNumbers}
            onChange={(e) => setManualNumbers(e.target.value)}
            rows={4}
            placeholder={"+1 415 555 0123\n+1 415 555 0124"}
            className="w-full px-4 py-2 border border-social-cream-400 rounded-xl text-sm focus:outline-none focus:border-social-green-500 bg-white text-social-forest-700 placeholder-gray-400"
          />
          <button
            onClick={() =>
              submitPhones(
                manualNumbers
                  .split(/[\n,]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            disabled={busy !== null || !manualNumbers.trim()}
            className="social-button rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
          >
            Check these numbers
          </button>
        </div>
      )}

      {status && <p className="mt-3 text-sm text-social-green-600">{status}</p>}
      {error && <p className="mt-3 text-sm text-social-orange-700">{error}</p>}
    </div>
  );
}

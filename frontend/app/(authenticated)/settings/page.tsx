'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Bell, Lock, Volume2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Settings {
  notifications?: boolean;
  soundEnabled?: boolean;
  emailDigest?: boolean;
  [key: string]: any;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    soundEnabled: true,
    emailDigest: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data || settings);
      } catch (err: any) {
        // Settings endpoint may not exist, use defaults
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = (key: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-[#a1a1aa] mt-1">Manage your account preferences and notification settings.</p>
      </div>

      {/* Notifications Section */}
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-8 space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold mb-1">Notifications</h2>
          <p className="text-sm text-[#a1a1aa]">Control how you receive updates about your interviews and reports.</p>
        </div>

        <div className="space-y-4 border-t border-[#27272a] pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">Interview Notifications</p>
                <p className="text-xs text-[#71717a] mt-0.5">Get notified when your interview scores are ready</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('notifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notifications ? 'bg-purple-600' : 'bg-[#27272a]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">Sound Effects</p>
                <p className="text-xs text-[#71717a] mt-0.5">Play sounds during interview sessions</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('soundEnabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.soundEnabled ? 'bg-purple-600' : 'bg-[#27272a]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">Email Digest</p>
                <p className="text-xs text-[#71717a] mt-0.5">Receive weekly summary emails</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('emailDigest')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailDigest ? 'bg-purple-600' : 'bg-[#27272a]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailDigest ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-8">
        <div>
          <h2 className="font-display text-xl font-bold mb-1">Security</h2>
          <p className="text-sm text-[#a1a1aa] mb-6">Protect your account with strong security practices.</p>
        </div>
        <div className="space-y-3 border-t border-[#27272a] pt-6">
          <button className="w-full text-left px-4 py-3 rounded-xl border border-[#27272a] hover:border-purple-500/50 text-white font-medium transition-colors hover:bg-[#09090b]">
            Change Password
          </button>
          <button className="w-full text-left px-4 py-3 rounded-xl border border-[#27272a] hover:border-purple-500/50 text-white font-medium transition-colors hover:bg-[#09090b]">
            Two-Factor Authentication
          </button>
          <button className="w-full text-left px-4 py-3 rounded-xl border border-[#27272a] hover:border-purple-500/50 text-white font-medium transition-colors hover:bg-[#09090b]">
            View Active Sessions
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        {saved && (
          <p className="text-sm text-emerald-400 font-medium">Settings saved successfully</p>
        )}
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-purple-600/25"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

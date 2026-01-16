import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { updateAccount } from '../api';

export function EditAccountModal() {
  const { editingAccount, setEditingAccount, updateAccount: updateLocalAccount } = useStore();
  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');
  const [lastTopup, setLastTopup] = useState('');
  const [keepAliveEnabled, setKeepAliveEnabled] = useState(true);
  const [keepAliveInterval, setKeepAliveInterval] = useState(86400);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingAccount) {
      setDisplayName(editingAccount.display_name || '');
      setNotes(editingAccount.notes || '');
      setLastTopup(editingAccount.last_topup || '');
      setKeepAliveEnabled(editingAccount.keep_alive_enabled);
      setKeepAliveInterval(editingAccount.keep_alive_interval);
    }
  }, [editingAccount]);

  const handleClose = () => {
    setEditingAccount(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editingAccount) return;

    setLoading(true);
    setError(null);

    try {
      const updates = {
        display_name: displayName || null,
        notes: notes || null,
        last_topup: lastTopup || null,
        keep_alive_enabled: keepAliveEnabled,
        keep_alive_interval: keepAliveInterval,
      };

      await updateAccount(editingAccount.id, updates);
      updateLocalAccount(editingAccount.id, updates);
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  if (!editingAccount) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Account
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Account Info (Read-only) */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
            <p className="text-gray-900 dark:text-white font-medium">
              {editingAccount.phone_number} ({editingAccount.country_code})
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Platform</p>
            <p className="text-gray-900 dark:text-white font-medium capitalize">
              {editingAccount.platform}
            </p>
          </div>

          {/* Editable Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., US Business Line"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes about this account..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Topup Date
            </label>
            <input
              type="date"
              value={lastTopup}
              onChange={(e) => setLastTopup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Keep Alive
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically keep session active
              </p>
            </div>
            <button
              type="button"
              onClick={() => setKeepAliveEnabled(!keepAliveEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                keepAliveEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  keepAliveEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {keepAliveEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Keep Alive Interval
              </label>
              <select
                value={keepAliveInterval}
                onChange={(e) => setKeepAliveInterval(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={3600}>Every hour</option>
                <option value={21600}>Every 6 hours</option>
                <option value={43200}>Every 12 hours</option>
                <option value={86400}>Every 24 hours</option>
                <option value={172800}>Every 48 hours</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

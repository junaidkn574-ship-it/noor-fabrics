import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  KeyRound,
  RotateCcw,
  Store,
  Upload,
} from 'lucide-react';
import { buildBackupPayload, parseBackupPayload, PosDatabaseState } from '../db/localDb';
import { ShopSettings } from '../types/pos';
import { getTodayDateKey } from '../utils/format';

interface BackupSettingsViewProps {
  dbState: PosDatabaseState;
  onUpdateSettings: (settings: ShopSettings) => void;
  onRestoreBackup: (restored: PosDatabaseState) => void;
  onResetSampleData: () => void;
}

export const BackupSettingsView: React.FC<BackupSettingsViewProps> = ({
  dbState,
  onUpdateSettings,
  onRestoreBackup,
  onResetSampleData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [shopForm, setShopForm] = useState<ShopSettings>(dbState.settings);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const [pendingRestore, setPendingRestore] = useState<PosDatabaseState | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [confirmReset, setConfirmReset] = useState(false);

  const handleDownloadBackup = () => {
    const payload = buildBackupPayload(dbState);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gents-pos-backup-${getTodayDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreMsg(null);
    try {
      const text = await file.text();
      const parsed = parseBackupPayload(text);
      setPendingRestore(parsed);
    } catch (err) {
      setPendingRestore(null);
      setRestoreMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Could not parse JSON backup file.',
      });
    }
    e.target.value = '';
  };

  const applyRestore = () => {
    if (!pendingRestore) return;
    onRestoreBackup(pendingRestore);
    setShopForm(pendingRestore.settings);
    setPendingRestore(null);
    setRestoreMsg({
      type: 'ok',
      text: 'Backup restored successfully to IndexedDB & LocalStorage.',
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...dbState.settings,
      shopName: shopForm.shopName.trim() || 'Al-Noor Fabrics & Menswear',
      shopAddress: shopForm.shopAddress.trim(),
      shopPhone: shopForm.shopPhone.trim(),
      receiptFooter: shopForm.receiptFooter.trim(),
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handlePinChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);
    if (currentPin !== dbState.settings.adminPin) {
      setPinMessage({ type: 'err', text: 'Current PIN is incorrect.' });
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinMessage({ type: 'err', text: 'New PIN must be exactly 4 digits.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ type: 'err', text: 'New PIN and confirmation do not match.' });
      return;
    }

    onUpdateSettings({
      ...dbState.settings,
      adminPin: newPin,
    });
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMessage({ type: 'ok', text: 'Admin PIN updated successfully.' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
          Backup, Restore &amp; Shop Settings
        </h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          All data is stored offline in your browser. Export JSON backups regularly or configure receipt details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Backup & Restore Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Local Database Backup &amp; Restore</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Includes {dbState.products.length} products, {dbState.invoices.length} invoices,{' '}
              {dbState.expenses.length} expenses, and shop settings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="min-h-[52px] px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Backup (.json)
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[52px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0F172A] text-sm font-bold flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Restore from File (.json)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {pendingRestore && (
            <div className="p-4 rounded-xl bg-[#F1F5F9] border border-slate-300 space-y-3">
              <div className="text-sm font-bold text-[#0F172A]">Ready to Restore Backup</div>
              <div className="text-xs text-[#64748B] tabular-nums">
                Found {pendingRestore.products.length} products, {pendingRestore.invoices.length}{' '}
                invoices, and {pendingRestore.expenses.length} expenses. Restoring will replace current browser data.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyRestore}
                  className="min-h-[44px] px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold"
                >
                  Confirm &amp; Restore
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  className="min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white text-xs font-bold text-[#0F172A]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {restoreMsg && (
            <div
              className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                restoreMsg.type === 'ok'
                  ? 'bg-emerald-50 border border-emerald-200 text-[#006c49]'
                  : 'bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {restoreMsg.text}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-[#0F172A]">Reset Sample Catalog</div>
              <div className="text-xs text-[#64748B]">
                Restore the 6 pre-loaded gents clothing items &amp; clear invoices.
              </div>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onResetSampleData();
                    setConfirmReset(false);
                  }}
                  className="min-h-[44px] px-3.5 rounded-lg bg-[#EF4444] text-white text-xs font-bold"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[44px] px-3 rounded-lg border border-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="min-h-[44px] px-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444] text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Demo
              </button>
            )}
          </div>
        </div>

        {/* Admin PIN Security Card */}
        <form
          onSubmit={handlePinChange}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-[#0F172A]" />
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Admin 4-Digit PIN Security</h2>
              <p className="text-xs text-[#64748B]">
                Protects Profit &amp; Reports, Inventory Cost, Expenses, and Backup views.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Current PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">New 4-Digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
            </div>
          </div>

          {pinMessage && (
            <div
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                pinMessage.type === 'ok'
                  ? 'bg-emerald-50 border border-emerald-200 text-[#006c49]'
                  : 'bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444]'
              }`}
            >
              {pinMessage.text}
            </div>
          )}

          <button
            type="submit"
            className="min-h-[48px] px-5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-bold"
          >
            Update Admin PIN
          </button>
        </form>
      </div>

      {/* Shop Receipt Details */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <Store className="w-5 h-5 text-[#0F172A]" />
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">80mm Thermal Receipt Shop Header</h2>
            <p className="text-xs text-[#64748B]">
              Printed at the top and bottom of every customer thermal receipt.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Shop Name</label>
            <input
              type="text"
              required
              value={shopForm.shopName}
              onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })}
              className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Phone Number</label>
            <input
              type="text"
              value={shopForm.shopPhone}
              onChange={(e) => setShopForm({ ...shopForm, shopPhone: e.target.value })}
              className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Shop Address</label>
            <input
              type="text"
              value={shopForm.shopAddress}
              onChange={(e) => setShopForm({ ...shopForm, shopAddress: e.target.value })}
              className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
            Receipt Footer Message
          </label>
          <input
            type="text"
            value={shopForm.receiptFooter}
            onChange={(e) => setShopForm({ ...shopForm, receiptFooter: e.target.value })}
            className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="min-h-[48px] px-6 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold"
          >
            Save Shop Profile
          </button>
          {profileSaved && (
            <span className="text-xs font-bold text-[#10B981] inline-flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Saved to local database
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

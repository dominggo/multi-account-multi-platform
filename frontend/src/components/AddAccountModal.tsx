import { useState } from 'react';
import { X, Send, MessageCircle, Phone, Loader2, QrCode } from 'lucide-react';
import { useStore } from '../store';
import { Platform } from '../types';
import { telegramRequestCode, telegramVerifyCode, whatsappStartAuth } from '../api';

type Step = 'select-platform' | 'enter-phone' | 'verify-telegram' | 'verify-whatsapp';

export function AddAccountModal() {
  const { showAddAccountModal, setShowAddAccountModal, addAccount } = useStore();
  const [step, setStep] = useState<Step>('select-platform');
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetModal = () => {
    setStep('select-platform');
    setPlatform(null);
    setPhoneNumber('');
    setCountryCode('US');
    setDisplayName('');
    setNotes('');
    setVerificationCode('');
    setPhoneCodeHash('');
    setQrCode(null);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    setShowAddAccountModal(false);
  };

  const handleSelectPlatform = (p: Platform) => {
    setPlatform(p);
    setStep('enter-phone');
  };

  const handleSubmitPhone = async () => {
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (platform === 'telegram') {
        const result = await telegramRequestCode(phoneNumber);
        if (result.phone_code_hash) {
          setPhoneCodeHash(result.phone_code_hash);
          setStep('verify-telegram');
        } else if (result.already_connected) {
          // Already connected
          addAccount({
            id: Date.now(),
            phone_number: phoneNumber,
            country_code: countryCode,
            platform: 'telegram',
            display_name: displayName || null,
            status: 'active',
            registered_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            keep_alive_enabled: true,
            keep_alive_interval: 86400,
            notes: notes || null,
            last_topup: null,
            last_message_at: null,
          });
          handleClose();
        }
      } else if (platform === 'whatsapp') {
        const result = await whatsappStartAuth(phoneNumber);
        if (result.qr_code) {
          setQrCode(result.qr_code);
          setStep('verify-whatsapp');
        } else if (result.status === 'connected') {
          addAccount({
            id: Date.now(),
            phone_number: phoneNumber,
            country_code: countryCode,
            platform: 'whatsapp',
            display_name: displayName || null,
            status: 'active',
            registered_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            keep_alive_enabled: true,
            keep_alive_interval: 86400,
            notes: notes || null,
            last_topup: null,
            last_message_at: null,
          });
          handleClose();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate verification');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTelegram = async () => {
    if (!verificationCode.trim()) {
      setError('Verification code is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await telegramVerifyCode(phoneNumber, verificationCode, phoneCodeHash);
      if (result.success || result.is_connected) {
        addAccount({
          id: Date.now(),
          phone_number: phoneNumber,
          country_code: countryCode,
          platform: 'telegram',
          display_name: displayName || result.user_info?.first_name || null,
          status: 'active',
          registered_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
          keep_alive_enabled: true,
          keep_alive_interval: 86400,
          notes: notes || null,
          last_topup: null,
          last_message_at: null,
        });
        handleClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  if (!showAddAccountModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {step === 'select-platform' && 'Add New Account'}
            {step === 'enter-phone' && `Add ${platform === 'telegram' ? 'Telegram' : 'WhatsApp'} Account`}
            {step === 'verify-telegram' && 'Verify Telegram'}
            {step === 'verify-whatsapp' && 'Scan QR Code'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: Select Platform */}
          {step === 'select-platform' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Select the messaging platform for your new account:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSelectPlatform('telegram')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl transition-colors"
                >
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Send className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">Telegram</span>
                </button>
                <button
                  onClick={() => handleSelectPlatform('whatsapp')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 rounded-xl transition-colors"
                >
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Enter Phone */}
          {step === 'enter-phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="US">US +1</option>
                    <option value="GB">UK +44</option>
                    <option value="ID">ID +62</option>
                    <option value="MY">MY +60</option>
                    <option value="SG">SG +65</option>
                    <option value="AU">AU +61</option>
                    <option value="DE">DE +49</option>
                    <option value="FR">FR +33</option>
                    <option value="JP">JP +81</option>
                    <option value="KR">KR +82</option>
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

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
                  placeholder="Optional notes about this account..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('select-platform')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitPhone}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      Send Code
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Verify Telegram */}
          {step === 'verify-telegram' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Enter the verification code sent to your Telegram app for {phoneNumber}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="12345"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl tracking-widest"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('enter-phone')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyTelegram}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Verify WhatsApp (QR Code) */}
          {step === 'verify-whatsapp' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
                Scan this QR code with WhatsApp on your phone
              </p>

              <div className="flex justify-center">
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64 rounded-lg"
                  />
                ) : (
                  <div className="w-64 h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                1. Open WhatsApp on your phone<br />
                2. Tap Menu or Settings &gt; Linked Devices<br />
                3. Tap Link a Device<br />
                4. Point your phone at this screen
              </p>

              <button
                onClick={() => setStep('enter-phone')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Phone, Loader2, Lock, RefreshCw, Wifi, WifiOff, QrCode, Hash } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { Platform } from '../types';
import { telegramRequestCode, telegramVerifyCode, telegramVerifyPassword, whatsappStartAuth, whatsappGetQR, whatsappRequestPairingCode, createAccount } from '../api';

type Step = 'select-platform' | 'enter-phone' | 'verify-telegram' | 'verify-telegram-2fa' | 'select-whatsapp-method' | 'verify-whatsapp' | 'verify-whatsapp-pairing';
type WhatsAppAuthMethod = 'qr' | 'pairing';

const WHATSAPP_SOCKET_URL = import.meta.env.VITE_WHATSAPP_URL || 'http://localhost:8002';

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
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [whatsappAuthMethod, setWhatsappAuthMethod] = useState<WhatsAppAuthMethod>('qr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'scanning' | 'connected' | 'error'>('waiting');
  const [qrGenerationFailed, setQrGenerationFailed] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Cleanup socket on unmount or modal close
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Setup Socket.io for WhatsApp when entering verify-whatsapp or verify-whatsapp-pairing step
  useEffect(() => {
    const isWhatsAppStep = step === 'verify-whatsapp' || step === 'verify-whatsapp-pairing';

    if (isWhatsAppStep && !socketRef.current) {
      const socket = io(WHATSAPP_SOCKET_URL, {
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('Socket connected');
        // Request status for this phone number
        socket.emit('get-status', phoneNumber);
      });

      socket.on('qr-code', (data: { phoneNumber: string; qrCode: string }) => {
        if (data.phoneNumber === phoneNumber) {
          setQrCode(data.qrCode);
          setQrGenerationFailed(false);
          setConnectionStatus('waiting');
        }
      });

      socket.on('pairing-code', (data: { phoneNumber: string; pairingCode: string }) => {
        if (data.phoneNumber === phoneNumber) {
          setPairingCode(data.pairingCode);
          setConnectionStatus('waiting');
        }
      });

      socket.on('connection-status', async (data: { phoneNumber: string; status?: string; isConnected?: boolean; qrCode?: string; user_info?: { id?: string; name?: string } }) => {
        if (data.phoneNumber === phoneNumber) {
          if (data.status === 'connected' || data.isConnected) {
            setConnectionStatus('connected');
            // Save account to database and close modal
            await saveAccount('whatsapp', data.user_info);
            setTimeout(() => handleClose(), 1500);
          } else if (data.qrCode) {
            setQrCode(data.qrCode);
          }
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socketRef.current = socket;
    }

    return () => {
      if (!isWhatsAppStep && socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [step, phoneNumber]);

  const resetModal = () => {
    setStep('select-platform');
    setPlatform(null);
    setPhoneNumber('');
    setCountryCode('US');
    setDisplayName('');
    setNotes('');
    setVerificationCode('');
    setPhoneCodeHash('');
    setTwoFaPassword('');
    setQrCode(null);
    setPairingCode(null);
    setWhatsappAuthMethod('qr');
    setError(null);
    setConnectionStatus('waiting');
    setQrGenerationFailed(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const handleClose = () => {
    resetModal();
    setShowAddAccountModal(false);
  };

  // Helper to save account to database and local store
  const saveAccount = async (accountPlatform: Platform, userInfo?: { first_name?: string; name?: string }) => {
    try {
      // Save to database via API
      const savedAccount = await createAccount({
        phone_number: phoneNumber,
        country_code: countryCode,
        platform: accountPlatform,
        display_name: displayName || userInfo?.first_name || userInfo?.name || undefined,
        notes: notes || undefined,
      });
      // Add to local store
      addAccount(savedAccount);
    } catch (err: any) {
      // If 409 conflict (already exists), just add to local store with temp data
      if (err.response?.status === 409) {
        addAccount({
          id: Date.now(),
          phone_number: phoneNumber,
          country_code: countryCode,
          platform: accountPlatform,
          display_name: displayName || userInfo?.first_name || userInfo?.name || null,
          status: 'active',
          registered_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
          keep_alive_enabled: true,
          keep_alive_interval: 86400,
          notes: notes || null,
          last_topup: null,
          last_message_at: null,
        });
      } else {
        console.error('Failed to save account:', err);
        // Still add to local store as fallback
        addAccount({
          id: Date.now(),
          phone_number: phoneNumber,
          country_code: countryCode,
          platform: accountPlatform,
          display_name: displayName || userInfo?.first_name || userInfo?.name || null,
          status: 'active',
          registered_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
          keep_alive_enabled: true,
          keep_alive_interval: 86400,
          notes: notes || null,
          last_topup: null,
          last_message_at: null,
        });
      }
    }
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
          // Already connected - save to database
          await saveAccount('telegram');
          handleClose();
        }
      } else if (platform === 'whatsapp') {
        // Go to WhatsApp auth method selection
        setStep('select-whatsapp-method');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate verification');
    } finally {
      setLoading(false);
    }
  };

  // Start WhatsApp auth with selected method
  const handleStartWhatsAppAuth = async (method: WhatsAppAuthMethod) => {
    setWhatsappAuthMethod(method);
    setLoading(true);
    setError(null);
    setQrGenerationFailed(false);

    try {
      if (method === 'qr') {
        const result = await whatsappStartAuth(phoneNumber);
        if (result.status === 'connected') {
          await saveAccount('whatsapp');
          handleClose();
          return;
        }
        if (result.qr_code) {
          setQrCode(result.qr_code);
        }
        setStep('verify-whatsapp');

        // Set timeout to detect QR generation failure
        setTimeout(() => {
          if (!qrCode) {
            setQrGenerationFailed(true);
          }
        }, 10000);
      } else {
        // Pairing code method
        const result = await whatsappRequestPairingCode(phoneNumber);
        if (result.status === 'connected') {
          await saveAccount('whatsapp');
          handleClose();
          return;
        }
        if (result.pairing_code) {
          setPairingCode(result.pairing_code);
        }
        setStep('verify-whatsapp-pairing');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to start authentication';
      setError(errorMessage);

      // If QR method failed, suggest pairing code
      if (method === 'qr') {
        setQrGenerationFailed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Switch from QR to pairing code method
  const handleSwitchToPairingCode = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await whatsappRequestPairingCode(phoneNumber);
      if (result.pairing_code) {
        setPairingCode(result.pairing_code);
        setStep('verify-whatsapp-pairing');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to get pairing code');
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

      if (result.requires_password) {
        // 2FA is enabled, move to password step
        setStep('verify-telegram-2fa');
        return;
      }

      if (result.success || result.is_connected) {
        await saveAccount('telegram', result.user_info);
        handleClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTelegram2FA = async () => {
    if (!twoFaPassword.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await telegramVerifyPassword(phoneNumber, twoFaPassword);

      if (result.success) {
        await saveAccount('telegram', result.user_info);
        handleClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await whatsappGetQR(phoneNumber);
      if (result.qr_code) {
        setQrCode(result.qr_code);
      }
    } catch (err: any) {
      // Try restarting auth
      try {
        const result = await whatsappStartAuth(phoneNumber);
        if (result.qr_code) {
          setQrCode(result.qr_code);
        }
      } catch {
        setError('Failed to refresh QR code');
      }
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
            {step === 'verify-telegram-2fa' && 'Two-Factor Authentication'}
            {step === 'select-whatsapp-method' && 'Link WhatsApp'}
            {step === 'verify-whatsapp' && 'Scan QR Code'}
            {step === 'verify-whatsapp-pairing' && 'Link with Phone Number'}
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
                      {platform === 'telegram' ? 'Send Code' : 'Get QR Code'}
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

          {/* Step 3b: Telegram 2FA */}
          {step === 'verify-telegram-2fa' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Two-factor authentication is enabled on this account
                </p>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Enter your 2FA password to complete authentication for {phoneNumber}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  2FA Password
                </label>
                <input
                  type="password"
                  value={twoFaPassword}
                  onChange={(e) => setTwoFaPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setTwoFaPassword('');
                    setStep('verify-telegram');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyTelegram2FA}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Verify Password
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4a: Select WhatsApp Auth Method */}
          {step === 'select-whatsapp-method' && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Choose how to link your WhatsApp account for {phoneNumber}:
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleStartWhatsAppAuth('qr')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 rounded-xl transition-colors text-left"
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">Scan QR Code</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Scan a QR code with your phone camera
                    </p>
                  </div>
                  {loading && whatsappAuthMethod === 'qr' && (
                    <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                  )}
                </button>

                <button
                  onClick={() => handleStartWhatsAppAuth('pairing')}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl transition-colors text-left"
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Hash className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">Link with Phone Number</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enter a code on your WhatsApp phone
                    </p>
                  </div>
                  {loading && whatsappAuthMethod === 'pairing' && (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  )}
                </button>
              </div>

              <button
                onClick={() => setStep('enter-phone')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 4b: Verify WhatsApp (QR Code) */}
          {step === 'verify-whatsapp' && (
            <div className="space-y-4">
              {/* Connection Status */}
              {connectionStatus === 'connected' ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Connected successfully! Closing...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
                    Scan this QR code with WhatsApp on your phone
                  </p>

                  <div className="flex justify-center">
                    {qrCode ? (
                      <div className="relative">
                        <img
                          src={qrCode}
                          alt="WhatsApp QR Code"
                          className="w-64 h-64 rounded-lg"
                        />
                        <button
                          onClick={handleRefreshQR}
                          disabled={loading}
                          className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                          title="Refresh QR Code"
                        >
                          <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-64 h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        <p className="text-sm text-gray-500">Generating QR code...</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm">
                    {connectionStatus === 'waiting' ? (
                      <>
                        <WifiOff className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-600 dark:text-yellow-400">Waiting for scan...</span>
                      </>
                    ) : connectionStatus === 'scanning' ? (
                      <>
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        <span className="text-blue-600 dark:text-blue-400">Connecting...</span>
                      </>
                    ) : null}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    1. Open WhatsApp on your phone<br />
                    2. Tap Menu or Settings &gt; Linked Devices<br />
                    3. Tap Link a Device<br />
                    4. Point your phone at this screen
                  </p>

                  {/* Fallback option when QR fails */}
                  {(qrGenerationFailed || !qrCode) && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                        QR code not loading? Try linking with your phone number instead.
                      </p>
                      <button
                        onClick={handleSwitchToPairingCode}
                        disabled={loading}
                        className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Hash className="w-4 h-4" />
                        )}
                        Use Phone Number Instead
                      </button>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => setStep('select-whatsapp-method')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 4c: Verify WhatsApp (Pairing Code) */}
          {step === 'verify-whatsapp-pairing' && (
            <div className="space-y-4">
              {/* Connection Status */}
              {connectionStatus === 'connected' ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Connected successfully! Closing...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
                    Enter this code on your WhatsApp phone for {phoneNumber}
                  </p>

                  <div className="flex justify-center">
                    {pairingCode ? (
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-6 text-center">
                        <p className="text-4xl font-mono font-bold tracking-widest text-gray-900 dark:text-white">
                          {pairingCode.slice(0, 4)}-{pairingCode.slice(4)}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Code expires in 60 seconds
                        </p>
                      </div>
                    ) : (
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl p-6 flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        <p className="text-sm text-gray-500">Generating pairing code...</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm">
                    <WifiOff className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600 dark:text-yellow-400">Waiting for connection...</span>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>How to link:</strong><br />
                      1. Open WhatsApp on your phone<br />
                      2. Tap Menu or Settings &gt; Linked Devices<br />
                      3. Tap <strong>Link a Device</strong><br />
                      4. Tap <strong>Link with Phone Number Instead</strong><br />
                      5. Enter the code shown above
                    </p>
                  </div>

                  {/* Option to switch to QR */}
                  <button
                    onClick={() => {
                      setPairingCode(null);
                      handleStartWhatsAppAuth('qr');
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Try QR code instead
                  </button>
                </>
              )}

              <button
                onClick={() => setStep('select-whatsapp-method')}
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

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ScanLine,
  Calendar,
  RefreshCw,
  Keyboard,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Vibrate,
  ShieldCheck,
  Timer,
  Layers,
  Repeat,
  QrCode,
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface ValidationResult {
  success: boolean;
  message: string;
  ticket?: {
    ticketId: string;
    ticketName: string;
    price?: number;
    usedAt?: string;
    validatedBy?: string;
  };
  event?: {
    title: string;
    date: string;
    venue: string;
    location: string;
  };
  customer?: {
    userId: string;
  };
  error?: string;
  status?: string;
  eventDate?: string;
  usedAt?: string;
  validatedBy?: string;
}

interface ValidationSettings {
  qrCodeEnabled: boolean;
  scannerEnabled: boolean;
  multipleScansAllowed: boolean;
  scanTimeWindow: number;
  requireValidatorRole: boolean;
  logValidations: boolean;
  validationTimeout: number;
  antiReplayEnabled: boolean;
  maxValidationsPerTicket: number;
  validationSoundEnabled: boolean;
  vibrationEnabled: boolean;
}

interface ValidationLog {
  _id: string;
  validatorId: string;
  validatorName: string;
  bookingId: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  validationType: string;
  status: 'validated' | 'rejected' | 'flagged';
  notes?: string;
  metadata?: {
    ticketType?: string;
    ticketQuantity?: number;
    scanMethod?: string;
  };
  createdAt: string;
}

interface Toast {
  id: number;
  kind: 'success' | 'error' | 'warn' | 'info';
  text: string;
}

const DEFAULT_SETTINGS: ValidationSettings = {
  qrCodeEnabled: true,
  scannerEnabled: true,
  multipleScansAllowed: false,
  scanTimeWindow: 5,
  requireValidatorRole: true,
  logValidations: true,
  validationTimeout: 30,
  antiReplayEnabled: true,
  maxValidationsPerTicket: 1,
  validationSoundEnabled: true,
  vibrationEnabled: true,
};

export default function MobileValidatorPage() {
  const { user, isLoaded } = useUser();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [settings, setSettings] = useState<ValidationSettings>(DEFAULT_SETTINGS);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validatedAt, setValidatedAt] = useState<string | null>(null);

  const [eventDates, setEventDates] = useState<string[]>([]);
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);

  const [logs, setLogs] = useState<ValidationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);


  // Tab state: 0 = Camera, 1 = Barcode Scanner
  const [tab, setTab] = useState<0 | 1>(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Barcode scanner input
  const [barcodeValue, setBarcodeValue] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  // Manual entry
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  // Barcode scanner: always focus input when tab is active
  useEffect(() => {
    if (tab === 1 && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [tab]);

  // Barcode scanner: auto-refocus on blur
  useEffect(() => {
    if (tab !== 1) return;
    const handler = () => {
      setTimeout(() => {
        if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 100);
    };
    window.addEventListener('blur', handler, true);
    return () => window.removeEventListener('blur', handler, true);
  }, [tab]);

  // Barcode scanner: handle Enter key
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = barcodeValue.trim();
      if (code) {
        validateTicket(code);
        setBarcodeValue('');
      }
      e.preventDefault();
    }
  };

  const [toasts, setToasts] = useState<Toast[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScanRef = useRef<{ data: string; ts: number } | null>(null);
  const isProcessingRef = useRef(false);
  const selectedDateRef = useRef<string | null>(null);

  useEffect(() => { selectedDateRef.current = selectedEventDate; }, [selectedEventDate]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // Toast helpers
  const pushToast = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  // Auth guard
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      window.location.href = '/';
      return;
    }
    const role = user.publicMetadata?.role as string | undefined;
    setAuthorized(!!role && ['validator', 'admin'].includes(role));
  }, [isLoaded, user]);

  // Load settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.data?.validation) {
            setSettings({ ...DEFAULT_SETTINGS, ...data.data.validation });
          }
        }
      } catch {
        /* fall back to defaults */
      }
    })();
  }, []);

  // Load event dates
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/events');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.events)) {
          const dates = new Set<string>();
          data.events.forEach((ev: { date?: string }) => {
            if (ev?.date) dates.add(new Date(ev.date).toISOString().split('T')[0]);
          });
          const sorted = Array.from(dates).sort();
          setEventDates(sorted);
          const today = new Date().toISOString().split('T')[0];
          setSelectedEventDate(sorted.includes(today) ? today : sorted[0] ?? today);
        } else {
          const today = new Date().toISOString().split('T')[0];
          setSelectedEventDate(today);
        }
      } catch {
        const today = new Date().toISOString().split('T')[0];
        setSelectedEventDate(today);
      }
    })();
  }, []);

  // Logs fetch
  const fetchLogs = useCallback(async () => {
    if (!user) return;
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({
        limit: '20',
        validatorId: user.id,
      });
      const dateStr = selectedDateRef.current;
      if (dateStr) {
        const start = new Date(`${dateStr}T00:00:00`);
        const end = new Date(`${dateStr}T23:59:59.999`);
        params.append('startDate', start.toISOString());
        params.append('endDate', end.toISOString());
      }
      const res = await fetch(`/api/validation-logs?${params.toString()}`);
      const data = await res.json();
      if (data?.success) {
        setLogs(data.data?.logs ?? []);
      }
    } catch {
      pushToast('error', 'Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }, [user, pushToast]);

  useEffect(() => {
    if (authorized && showLogs) fetchLogs();
  }, [authorized, showLogs, selectedEventDate, fetchLogs]);

  // Feedback
  const playSound = useCallback((ok: boolean) => {
    if (!settings.validationSoundEnabled) return;
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = ok ? 880 : 320;
      osc.type = 'sine';
      const dur = ok ? 0.18 : 0.45;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch {
      /* noop */
    }
  }, [settings.validationSoundEnabled]);

  const vibrate = useCallback((ok: boolean) => {
    if (!settings.vibrationEnabled) return;
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(ok ? [120] : [300, 100, 300]);
    } catch {
      /* noop */
    }
  }, [settings.vibrationEnabled]);

  // Validate
  const validateTicket = useCallback(async (qrData: string) => {
    if (!qrData) return;
    if (isProcessingRef.current) return;

    const cooldownMs = Math.max(800, (settings.scanTimeWindow ?? 0) * 1000);
    const now = Date.now();
    if (
      lastScanRef.current &&
      lastScanRef.current.data === qrData &&
      now - lastScanRef.current.ts < cooldownMs
    ) {
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    setValidationResult(null);

    try {
      const timeoutMs = (settings.validationTimeout || 30) * 1000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCodeData: qrData,
          validationDate: selectedDateRef.current,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data: ValidationResult = await res.json();
      setValidationResult(data);
      setValidatedAt(new Date().toISOString());
      lastScanRef.current = { data: qrData, ts: Date.now() };

      playSound(!!data.success);
      vibrate(!!data.success);

      if (data.success) {
        pushToast('success', 'Ticket validated');
      } else {
        const msg = (data.message || data.error || 'Invalid ticket').toString();
        if (/already/i.test(msg)) pushToast('warn', 'Ticket already used');
        else pushToast('error', msg);
      }

      if (showLogs) fetchLogs();
    } catch (err: unknown) {
      const name = (err as { name?: string } | null)?.name;
      const msg = name === 'AbortError'
        ? `Validation timeout (${settings.validationTimeout || 30}s). Please retry.`
        : 'Network error. Please try again.';
      setValidationResult({ success: false, message: msg, error: name === 'AbortError' ? 'Timeout' : 'Network' });
      setValidatedAt(new Date().toISOString());
      playSound(false);
      vibrate(false);
      pushToast('error', msg);
    } finally {
      const lockMs = settings.multipleScansAllowed ? 600 : 1500;
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, lockMs);
    }
  }, [
    settings.scanTimeWindow,
    settings.validationTimeout,
    settings.multipleScansAllowed,
    playSound,
    vibrate,
    pushToast,
    showLogs,
    fetchLogs,
  ]);

  // Camera
  const stopCamera = useCallback(() => {
    try { readerRef.current?.reset(); } catch { /* noop */ }
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    if (!settings.scannerEnabled) {
      setCameraError('Scanner is disabled in validation settings.');
      return;
    }
    if (!settings.qrCodeEnabled) {
      setCameraError('QR code validation is disabled in settings.');
      return;
    }

    try {
      const probe = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      probe.getTracks().forEach((t) => t.stop());

      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      const reader = readerRef.current;
      setCameraOn(true);

      let deviceId: string | null = null;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === 'videoinput');
        const rear = cams.find((d) => /back|rear|environment/i.test(d.label));
        deviceId = rear?.deviceId ?? cams[cams.length - 1]?.deviceId ?? null;
      } catch {
        deviceId = null;
      }

      let lastDecoded = '';
      let lastDecodedTs = 0;
      await reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result) => {
        if (!result) return;
        const text = result.getText();
        const now = Date.now();
        if (text === lastDecoded && now - lastDecodedTs < 1500) return;
        lastDecoded = text;
        lastDecodedTs = now;
        validateTicket(text);
      });
    } catch {
      setCameraOn(false);
      setCameraError('Cannot access camera. Check browser permissions and try again.');
      pushToast('error', 'Camera permission denied');
    }
  }, [settings.scannerEnabled, settings.qrCodeEnabled, validateTicket, pushToast]);

  useEffect(() => {
    return () => {
      try { readerRef.current?.reset(); } catch { /* noop */ }
    };
  }, []);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ''; }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualValue.trim();
    if (!v) return;
    validateTicket(v);
    setManualValue('');
  };

  const result = validationResult;
  const resultIsSuccess = !!result?.success;
  const resultMsg = (result?.message || result?.error || '').toString();
  const isAlreadyUsed = !!result && !result.success && /already/i.test(resultMsg);
  const isWrongDate = !!result && !result.success && /(date|wrong day|not for this)/i.test(resultMsg);

  if (!isLoaded || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center">
          <XCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">Access denied</h2>
          <p className="text-sm text-zinc-400">You need a validator role to use the mobile validator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-8">
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-zinc-800">
        <div className="px-4 py-3 flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 grid place-items-center shrink-0">
              <ScanLine className="w-4 h-4 text-black" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate">dafinazeqiri.tickets</h1>
              <p className="text-[11px] text-orange-400 leading-tight">Mobile Validator</p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-full hover:bg-zinc-800 active:bg-zinc-700"
            aria-label="Refresh logs"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-300 ${logsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-md mx-auto">
        {/* Status grid */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 px-1">Validator status</h2>
          <div className="grid grid-cols-2 gap-2">
            <StatusPill icon={<QrCode className="w-3.5 h-3.5" />} label="QR Validation" on={settings.qrCodeEnabled} />
            <StatusPill icon={<ScanLine className="w-3.5 h-3.5" />} label="Scanner" on={settings.scannerEnabled} />
            <StatusPill
              icon={settings.validationSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              label="Sound"
              on={settings.validationSoundEnabled}
            />
            <StatusPill icon={<Vibrate className="w-3.5 h-3.5" />} label="Vibration" on={settings.vibrationEnabled} />
            <StatusPill icon={<Layers className="w-3.5 h-3.5" />} label={`Max: ${settings.maxValidationsPerTicket}`} on neutral />
            <StatusPill icon={<Timer className="w-3.5 h-3.5" />} label={`Timeout: ${settings.validationTimeout}s`} on neutral />
            <StatusPill icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Anti-Replay" on={settings.antiReplayEnabled} />
            <StatusPill icon={<Repeat className="w-3.5 h-3.5" />} label="Multi-Scan" on={settings.multipleScansAllowed} />
          </div>
        </section>

        {/* Date selector */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <label htmlFor="mv-date" className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
            <Calendar className="w-3.5 h-3.5" />
            Validation date
          </label>
          <select
            id="mv-date"
            aria-label="Validation date"
            title="Validation date"
            value={selectedEventDate ?? ''}
            onChange={(e) => setSelectedEventDate(e.target.value || null)}
            className="w-full text-sm bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {eventDates.length === 0 && (
              <option value={selectedEventDate ?? ''}>
                {selectedEventDate ?? new Date().toISOString().split('T')[0]}
              </option>
            )}
            {eventDates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500 mt-2">
            Validating tickets for: <span className="text-orange-400 font-medium">{selectedEventDate ?? '—'}</span>
          </p>
        </section>

        {/* Scan area with tabs */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${tab === 0 ? 'bg-zinc-900 text-orange-400 border-b-2 border-orange-500' : 'bg-zinc-900 text-zinc-400'}`}
              onClick={() => setTab(0)}
              type="button"
            >
              <Camera className="w-4 h-4" /> Camera Scan
            </button>
            <button
              className={`flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${tab === 1 ? 'bg-zinc-900 text-orange-400 border-b-2 border-orange-500' : 'bg-zinc-900 text-zinc-400'}`}
              onClick={() => setTab(1)}
              type="button"
            >
              <ScanLine className="w-4 h-4" /> Barcode Scanner
            </button>
          </div>

          {/* Tab content */}
          {tab === 0 && (
            <div>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-400" />
                  <h2 className="text-sm font-semibold">Camera Scanner</h2>
                </div>
                {cameraOn ? (
                  <button
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600"
                  >
                    <CameraOff className="w-3.5 h-3.5" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-black font-semibold hover:bg-orange-400 active:bg-orange-600"
                  >
                    <Camera className="w-3.5 h-3.5" /> Start scanning
                  </button>
                )}
              </div>

              <div className={`relative bg-black ${cameraOn ? 'aspect-square' : 'h-0'}`}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                {cameraOn && (
                  <>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="w-2/3 aspect-square border-2 border-orange-500/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-center text-[11px] text-orange-300">
                      Point at the QR code
                    </div>
                  </>
                )}
              </div>

              {cameraError && (
                <div className="mx-3 my-3 flex items-start gap-2 text-xs text-red-300 bg-red-950/40 border border-red-900 rounded-lg p-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {tab === 1 && (
            <div className="flex flex-col items-center justify-center p-6 min-h-[260px]">
              <ScanLine className="w-12 h-12 text-orange-400 mb-4" />
              <p className="text-sm text-zinc-200 mb-2">Tap to activate scanner</p>
              <p className="text-xs text-zinc-400 mb-4 text-center">Connect your Bluetooth barcode scanner, then scan here.</p>
              <input
                ref={barcodeInputRef}
                type="text"
                inputMode="text"
                autoFocus={tab === 1}
                value={barcodeValue}
                onChange={e => setBarcodeValue(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                className="w-full max-w-xs text-lg text-center tracking-[0.15em] bg-black border-2 border-orange-500 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Scan barcode here"
                tabIndex={0}
                aria-label="Barcode scanner input"
                spellCheck={false}
                autoComplete="off"
              />
              <div className="text-xs text-zinc-500 mt-3">Press Enter after scanning</div>
            </div>
          )}

          {/* Manual entry always available below */}
          <div className="border-t border-zinc-800 p-3">
            <button
              onClick={() => setManualOpen((v) => !v)}
              className="w-full inline-flex items-center justify-between text-sm text-zinc-200 hover:text-white"
            >
              <span className="inline-flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-orange-400" /> Manual
              </span>
              {manualOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {manualOpen && (
              <form onSubmit={handleManualSubmit} className="mt-3 space-y-2">
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="Enter or paste ticket code"
                  className="w-full text-sm bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  disabled={!manualValue.trim() || isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-lg bg-orange-500 text-black hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Validate
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Result card */}
        <ResultCard
          result={result}
          validatedAt={validatedAt}
          isProcessing={isProcessing}
          isAlreadyUsed={isAlreadyUsed}
          isWrongDate={isWrongDate}
          isSuccess={resultIsSuccess}
          formatTime={formatTime}
        />

        {/* Logs */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="p-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Today&apos;s logs</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchLogs}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-zinc-800 text-white hover:bg-zinc-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                onClick={() => setShowLogs((v) => !v)}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-orange-500 text-black font-semibold hover:bg-orange-400"
              >
                {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showLogs ? 'Hide Logs' : 'Show Logs'}
              </button>
            </div>
          </div>

          {showLogs && (
            <div className="border-t border-zinc-800 p-3">
              {logsLoading ? (
                <div className="text-xs text-zinc-400 py-4 text-center inline-flex items-center justify-center gap-2 w-full">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading logs…
                </div>
              ) : logs.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No validations for this date.</p>
              ) : (
                <ul className="space-y-2">
                  {logs.map((log) => {
                    const s = renderLogStatus(log);
                    return (
                      <li
                        key={log._id}
                        className={`border rounded-lg p-2.5 flex items-start gap-2 ${s.classes}`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {s.label === 'VALID' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : s.label === 'ALREADY USED' || s.label === 'WRONG DATE' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold tracking-wide">{s.label}</span>
                            <span className="text-[10px] opacity-80">{formatTime(log.createdAt)}</span>
                          </div>
                          <div className="text-[11px] mt-0.5 truncate">
                            {log.userName || 'Unknown holder'}
                            {log.metadata?.ticketType ? ` • ${log.metadata.ticketType}` : ''}
                          </div>
                          {log.bookingId && (
                            <div className="text-[10px] font-mono opacity-75 truncate">{log.bookingId}</div>
                          )}
                          {log.validatorName && (
                            <div className="text-[10px] opacity-70 truncate">by {log.validatorName}</div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Toasts */}
      <div className="fixed bottom-4 inset-x-0 z-40 px-4 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md w-full text-sm px-3 py-2 rounded-lg border shadow-lg ${
              t.kind === 'success'
                ? 'bg-green-950/90 text-green-200 border-green-800'
                : t.kind === 'warn'
                ? 'bg-orange-950/90 text-orange-200 border-orange-800'
                : t.kind === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-800'
                : 'bg-zinc-900/90 text-zinc-200 border-zinc-700'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({
  icon,
  label,
  on,
  neutral,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  neutral?: boolean;
}) {
  const base = 'inline-flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-md border';
  const cls = neutral
    ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
    : on
    ? 'bg-green-950/50 text-green-300 border-green-900'
    : 'bg-zinc-800 text-zinc-500 border-zinc-700';
  return (
    <span className={`${base} ${cls}`}>
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

function ResultCard({
  result,
  validatedAt,
  isProcessing,
  isAlreadyUsed,
  isWrongDate,
  isSuccess,
  formatTime,
}: {
  result: ValidationResult | null;
  validatedAt: string | null;
  isProcessing: boolean;
  isAlreadyUsed: boolean;
  isWrongDate: boolean;
  isSuccess: boolean;
  formatTime: (iso: string) => string;
}) {
  if (!result && !isProcessing) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
        <ScanLine className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">Ready to scan</p>
        <p className="text-[11px] text-zinc-500 mt-1">Use the camera or manual entry above.</p>
      </section>
    );
  }

  if (isProcessing && !result) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
        <RefreshCw className="w-10 h-10 text-orange-400 mx-auto mb-2 animate-spin" />
        <p className="text-sm text-zinc-200">Validating…</p>
      </section>
    );
  }

  if (!result) return null;

  let title = 'INVALID TICKET';
  const subtitle = result.message || result.error || 'Validation failed';
  let toneOuter = 'bg-red-950/40 border-red-900';
  let toneTitle = 'text-red-300';
  let Icon: React.ComponentType<{ className?: string }> = XCircle;

  if (isSuccess) {
    title = 'VALID TICKET';
    toneOuter = 'bg-green-950/50 border-green-800';
    toneTitle = 'text-green-300';
    Icon = CheckCircle;
  } else if (isAlreadyUsed) {
    title = 'ALREADY USED';
    toneOuter = 'bg-orange-950/40 border-orange-800';
    toneTitle = 'text-orange-300';
    Icon = AlertTriangle;
  } else if (isWrongDate) {
    title = 'WRONG DATE';
    toneOuter = 'bg-orange-950/40 border-orange-800';
    toneTitle = 'text-orange-300';
    Icon = AlertTriangle;
  }

  return (
    <section className={`rounded-2xl border p-5 ${toneOuter}`}>
      <div className="flex flex-col items-center text-center">
        <Icon className={`w-14 h-14 mb-2 ${toneTitle}`} />
        <p className={`text-2xl font-extrabold tracking-wide ${toneTitle}`}>{title}</p>
        <p className="text-sm text-zinc-200 mt-1">{subtitle}</p>
      </div>

      {(result.event || result.ticket || result.customer || result.usedAt || validatedAt) && (
        <div className="mt-4 text-sm bg-black/40 border border-zinc-800 rounded-xl p-3 space-y-1.5">
          {result.event?.title && <Row label="Event" value={result.event.title} />}
          {result.event?.date && <Row label="Date" value={new Date(result.event.date).toLocaleString()} />}
          {result.event?.venue && <Row label="Venue" value={result.event.venue} />}
          {result.ticket?.ticketName && <Row label="Ticket" value={result.ticket.ticketName} />}
          {result.ticket?.ticketId && <Row label="Ref" mono value={result.ticket.ticketId} />}
          {result.customer?.userId && <Row label="Holder" mono value={result.customer.userId} />}
          {result.usedAt && <Row label="Used at" value={new Date(result.usedAt).toLocaleString()} />}
          {result.validatedBy && <Row label="Validated by" mono value={result.validatedBy} />}
          {validatedAt && <Row label="Time" value={formatTime(validatedAt)} />}
        </div>
      )}
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-zinc-400 shrink-0">{label}</span>
      <span className={`text-right break-all ${mono ? 'font-mono text-xs' : 'text-sm'} text-zinc-100`}>{value}</span>
    </div>
  );
}

function renderLogStatus(log: ValidationLog) {
  const note = (log.notes || '').toLowerCase();
  if (log.status === 'validated') {
    return { label: 'VALID', classes: 'bg-green-950/40 text-green-200 border-green-800' };
  }
  if (note.includes('already')) {
    return { label: 'ALREADY USED', classes: 'bg-orange-950/40 text-orange-200 border-orange-800' };
  }
  if (note.includes('date') || note.includes('not for') || note.includes('event date')) {
    return { label: 'WRONG DATE', classes: 'bg-orange-950/40 text-orange-200 border-orange-800' };
  }
  if (log.status === 'rejected') {
    return { label: 'INVALID', classes: 'bg-red-950/40 text-red-200 border-red-800' };
  }
  return { label: 'ERROR', classes: 'bg-red-950/40 text-red-200 border-red-800' };
}

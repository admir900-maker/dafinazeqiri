'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Camera, CameraOff, CheckCircle, XCircle, AlertTriangle, Calendar, MapPin, Ticket, Upload, FileText, Eye, Activity, RefreshCw } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface ValidationResult {
  success: boolean;
  message: string;
  ticket?: {
    ticketId: string;
    ticketName: string;
    price: number;
    usedAt: string;
    validatedBy: string;
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
  offlineValidation: boolean;
  validationTimeout: number;
  customValidationRules: string[];
  antiReplayEnabled: boolean;
  maxValidationsPerTicket: number;
  validationSoundEnabled: boolean;
  vibrationEnabled: boolean;
  geoLocationRequired: boolean;
  allowedLocations: string[];
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
  validationType: 'entry' | 'exit' | 'general';
  status: 'validated' | 'rejected' | 'flagged';
  notes?: string;
  location?: string;
  deviceInfo?: {
    userAgent: string;
    ip: string;
  };
  metadata?: {
    ticketType: string;
    ticketQuantity: number;
    scanMethod: 'qr' | 'manual' | 'nfc';
  };
  createdAt: string;
  updatedAt: string;
}

export default function ValidatorPage() {
  const { user, isLoaded } = useUser();
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [manualQrInput, setManualQrInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [validationSettings, setValidationSettings] = useState<ValidationSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Validation logs state
  const [validationLogs, setValidationLogs] = useState<ValidationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ValidationLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  // Fetch validation settings
  const fetchValidationSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.validation) {
          setValidationSettings(result.data.validation);
        } else {
          // Set default settings if none exist
          setValidationSettings({
            qrCodeEnabled: true,
            scannerEnabled: true,
            multipleScansAllowed: false,
            scanTimeWindow: 5,
            requireValidatorRole: true,
            logValidations: true,
            offlineValidation: false,
            validationTimeout: 30,
            customValidationRules: [],
            antiReplayEnabled: true,
            maxValidationsPerTicket: 1,
            validationSoundEnabled: true,
            vibrationEnabled: true,
            geoLocationRequired: false,
            allowedLocations: []
          });
        }
      }
    } catch (error) {
      console.error('Error fetching validation settings:', error);
      // Set default settings on error
      setValidationSettings({
        qrCodeEnabled: true,
        scannerEnabled: true,
        multipleScansAllowed: false,
        scanTimeWindow: 5,
        requireValidatorRole: true,
        logValidations: true,
        offlineValidation: false,
        validationTimeout: 30,
        customValidationRules: [],
        antiReplayEnabled: true,
        maxValidationsPerTicket: 1,
        validationSoundEnabled: true,
        vibrationEnabled: true,
        geoLocationRequired: false,
        allowedLocations: []
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchValidationSettings();
  }, []);

  useEffect(() => {
    if (showLogs && user) {
      fetchValidationLogs();
    }
  }, [showLogs, user]);

  useEffect(() => {
    if (isLoaded && user) {
      const userRole = user.publicMetadata?.role as string;
      if (!userRole || !['validator', 'admin'].includes(userRole)) {
        // Redirect unauthorized users
        window.location.href = '/';
      }
    }
  }, [isLoaded, user]);

  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermission('granted');
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      setCameraPermission('denied');
      return false;
    }
  };

  const startScanning = async () => {
    // Check if validation settings are loaded
    if (!validationSettings) {
      setValidationResult({
        success: false,
        message: 'Validation settings not loaded. Please refresh the page.',
        error: 'Settings not loaded'
      });
      return;
    }

    // Check if QR code validation is enabled
    if (!validationSettings.qrCodeEnabled) {
      setValidationResult({
        success: false,
        message: 'QR code validation is currently disabled.',
        error: 'QR validation disabled'
      });
      return;
    }

    // Check if scanner is enabled
    if (!validationSettings.scannerEnabled) {
      setValidationResult({
        success: false,
        message: 'Ticket scanner is currently disabled.',
        error: 'Scanner disabled'
      });
      return;
    }

    if (cameraPermission !== 'granted') {
      const granted = await requestCameraPermission();
      if (!granted) return;
    }

    setIsScanning(true);
    setValidationResult(null);

    try {
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }

      const reader = readerRef.current;

      await reader.decodeFromVideoDevice(null, videoRef.current!, (result, error) => {
        if (result) {
          const qrData = result.getText();
          validateTicket(qrData);
          // Don't stop scanning automatically - let user control it
          // stopScanning();
        }
      });

    } catch (error) {
      console.error('Error starting scanner:', error);
      setValidationResult({
        success: false,
        message: 'Failed to start camera. Please check permissions.',
        error: 'Camera error'
      });
      setIsScanning(false);
    }
  };

  // Validation feedback functions
  const playValidationSound = (isSuccess: boolean) => {
    console.log('🔊 Playing validation sound:', { isSuccess, soundEnabled: validationSettings?.validationSoundEnabled });

    if (!validationSettings?.validationSoundEnabled) {
      console.log('❌ Sound disabled in settings');
      return;
    }

    try {
      // Create audio context for playing validation sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for success/failure
      oscillator.frequency.value = isSuccess ? 800 : 400;
      oscillator.type = 'sine';

      // Different durations for success/failure
      const duration = isSuccess ? 0.2 : 0.5;

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);

      console.log('✅ Sound played successfully');
    } catch (error) {
      console.error('❌ Audio error:', error);
    }
  };

  const triggerVibration = (isSuccess: boolean) => {
    console.log('📳 Triggering vibration:', { isSuccess, vibrationEnabled: validationSettings?.vibrationEnabled, hasVibrate: !!navigator.vibrate });

    if (!validationSettings?.vibrationEnabled) {
      console.log('❌ Vibration disabled in settings');
      return;
    }

    if (!navigator.vibrate) {
      console.log('❌ Vibration not supported by browser');
      return;
    }

    try {
      // Different vibration patterns for success/failure
      const pattern = isSuccess ? [100] : [300, 100, 300];
      const result = navigator.vibrate(pattern);
      console.log('✅ Vibration triggered:', result);
    } catch (error) {
      console.error('❌ Vibration error:', error);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  // Countdown function for next scan
  const startCountdown = () => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    // Start at 5 seconds
    setCountdown(5);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // Countdown finished
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          // Reset validation result and countdown
          setValidationResult(null);
          setCountdown(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateTicket = async (qrData: string) => {
    console.log('🎫 Validating ticket with QR data:', qrData);
    console.log('⚙️ Validation settings:', validationSettings);

    try {
      // Add validation timeout if enabled
      const timeoutDuration = validationSettings?.validationTimeout ? validationSettings.validationTimeout * 1000 : 30000;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrCodeData: qrData }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      console.log('✅ Validation result:', result);
      setValidationResult(result);

      // Trigger feedback based on result
      if (result.success) {
        console.log('✅ Validation successful - triggering success feedback');
        playValidationSound(true);
        triggerVibration(true);
        
        // Start countdown for next scan
        startCountdown();
      } else {
        console.log('❌ Validation failed - triggering error feedback');
        playValidationSound(false);
        triggerVibration(false);
      }

    } catch (error: any) {
      console.error('Error validating ticket:', error);

      let errorMessage = 'Network error. Please try again.';
      if (error.name === 'AbortError') {
        errorMessage = `Validation timeout (${validationSettings?.validationTimeout || 30}s). Please try again.`;
      }

      const errorResult = {
        success: false,
        message: errorMessage,
        error: error.name === 'AbortError' ? 'Timeout' : 'Network error'
      };

      setValidationResult(errorResult);
      playValidationSound(false);
      triggerVibration(false);
    }
  };

  // Validation logs functions
  const fetchValidationLogs = async () => {
    try {
      setLogsLoading(true);

      const params = new URLSearchParams({
        limit: '10',
        validatorId: user?.id || ''
      });

      // Show logs from today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      params.append('startDate', startOfDay.toISOString());

      const response = await fetch(`/api/validation-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setValidationLogs(data.data.logs || []);
      } else {
        console.error('Failed to fetch validation logs:', data.error);
      }
    } catch (error) {
      console.error('Error fetching validation logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const viewLogDetails = (log: ValidationLog) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'flagged': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return CheckCircle;
      case 'rejected': return XCircle;
      case 'flagged': return AlertTriangle;
      default: return CheckCircle;
    }
  };

  const manualValidation = async () => {
    if (!manualQrInput.trim()) {
      alert('Please enter a QR code');
      return;
    }
    await validateTicket(manualQrInput.trim());
    setManualQrInput('');
  };

  // Function to enhance image for better QR reading
  const enhanceImageForQR = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and increase contrast
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // Increase contrast
      const enhanced = gray > 128 ? 255 : 0;
      data[i] = enhanced;     // Red
      data[i + 1] = enhanced; // Green
      data[i + 2] = enhanced; // Blue
      // Alpha channel remains unchanged
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;

        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            alert('Canvas not supported');
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const codeReader = new BrowserMultiFormatReader();
          let attempts = 0;
          const maxAttempts = 4;

          const tryDecode = async (imageSource: HTMLImageElement, description: string): Promise<boolean> => {
            try {
              attempts++;
              const result = await codeReader.decodeFromImage(imageSource);

              if (result) {
                const qrText = result.getText();
                await validateTicket(qrText);
                return true;
              }
            } catch (error) {
              // Silently handle decode failures
            }
            return false;
          };

          // Method 1: Direct from original image
          if (await tryDecode(img, 'Original image')) return;

          // Method 2: Enhanced contrast image
          try {
            const enhancedCanvas = document.createElement('canvas');
            const enhancedCtx = enhancedCanvas.getContext('2d');
            if (enhancedCtx) {
              enhancedCanvas.width = canvas.width;
              enhancedCanvas.height = canvas.height;
              enhancedCtx.drawImage(img, 0, 0);
              enhanceImageForQR(enhancedCanvas, enhancedCtx);

              const enhancedImg = new Image();
              enhancedImg.onload = async () => {
                if (await tryDecode(enhancedImg, 'Enhanced contrast image')) return;

                // Method 3: Scaled up image
                try {
                  const scaledCanvas = document.createElement('canvas');
                  const scaledCtx = scaledCanvas.getContext('2d');
                  if (scaledCtx) {
                    const scale = 2;
                    scaledCanvas.width = canvas.width * scale;
                    scaledCanvas.height = canvas.height * scale;
                    scaledCtx.imageSmoothingEnabled = false;
                    scaledCtx.drawImage(img, 0, 0, scaledCanvas.width, scaledCanvas.height);

                    const scaledImg = new Image();
                    scaledImg.onload = async () => {
                      if (await tryDecode(scaledImg, 'Scaled up image')) return;

                      // All methods failed
                      alert(`Could not read QR code from image after ${maxAttempts} attempts. 

The QR code might be:
- Too small or low quality
- Not a valid QR code image
- Damaged or corrupted

Please try:
1. A higher quality/resolution image
2. Entering the QR data manually in the text field below
3. Taking a new screenshot of the QR code`);
                    };
                    scaledImg.src = scaledCanvas.toDataURL();
                  }
                } catch (scaleError) {
                  alert('Could not read QR code from image. Please try entering the code manually.');
                }
              };
              enhancedImg.src = enhancedCanvas.toDataURL();
            }
          } catch (enhanceError) {
            alert('Could not read QR code from image. Please try entering the code manually.');
          }
        };

        img.onerror = () => {
          alert('Error loading image. Please try a different file.');
        };

        img.src = imageData;
      };

      reader.onerror = () => {
        alert('Error reading file. Please try again.');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      alert(`Error reading file: ${error}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }; if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading validator...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">You need to be signed in as a validator to access this page.</p>
        </div>
      </div>
    );
  }

  const userRole = user.publicMetadata?.role as string;
  if (!userRole || !['validator', 'admin'].includes(userRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need validator permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Ticket Validator
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Scan QR codes to validate event tickets. Only confirmed tickets can be validated on the event day.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Logged in as: {user.firstName} {user.lastName} ({userRole})
            </div>
          </div>

          {/* Validation Settings Status */}
          {validationSettings && (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Validation Settings Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className={`flex items-center gap-2 ${validationSettings.qrCodeEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${validationSettings.qrCodeEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  QR Validation
                </div>
                <div className={`flex items-center gap-2 ${validationSettings.scannerEnabled ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${validationSettings.scannerEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  Scanner
                </div>
                <div className={`flex items-center gap-2 ${validationSettings.validationSoundEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${validationSettings.validationSoundEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  Sound
                </div>
                <div className={`flex items-center gap-2 ${validationSettings.vibrationEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${validationSettings.vibrationEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  Vibration
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Max: {validationSettings.maxValidationsPerTicket}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Timeout: {validationSettings.validationTimeout}s
                </div>
                <div className={`flex items-center gap-2 ${validationSettings.antiReplayEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${validationSettings.antiReplayEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  Anti-Replay
                </div>
                <div className={`flex items-center gap-2 ${validationSettings.multipleScansAllowed ? 'text-green-600' : 'text-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${validationSettings.multipleScansAllowed ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  Multi-Scan
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Scanner Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Camera className="w-6 h-6" />
                QR Scanner
              </h2>

              <div className="space-y-4">
                {/* Camera View */}
                <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ display: isScanning ? 'block' : 'none' }}
                  />

                  {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Click &quot;Start Scanning&quot; to begin</p>
                      </div>
                    </div>
                  )}

                  {isScanning && (
                    <div className="absolute inset-0 border-4 border-purple-500 rounded-xl">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-purple-500 rounded-lg"></div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  {!isScanning ? (
                    <button
                      onClick={startScanning}
                      className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Start Scanning
                    </button>
                  ) : (
                    <button
                      onClick={stopScanning}
                      className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CameraOff className="w-5 h-5" />
                      Stop Scanning
                    </button>
                  )}

                  <button
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Manual
                  </button>
                </div>

                {/* Manual Input Section */}
                {showManualInput && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Manual QR Code Input</h3>

                    {/* Text Input */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Enter QR Code Data
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={manualQrInput}
                            onChange={(e) => setManualQrInput(e.target.value)}
                            placeholder="Paste or type QR code data here..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          <button
                            onClick={manualValidation}
                            disabled={!manualQrInput.trim()}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            Validate
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          💡 <strong>Tip:</strong> To get QR data manually, go to your <a href="/bookings" className="text-purple-600 hover:underline" target="_blank">bookings page</a>, right-click &quot;View QR&quot;, select &quot;Inspect Element&quot;, and look for the JSON data in the image src or page source.
                        </p>
                      </div>

                      {/* File Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Upload QR Code Image
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            Choose Image
                          </button>
                          <span className="text-sm text-gray-500">
                            Select QR code image (PNG, JPG, etc.)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {cameraPermission === 'denied' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">
                      Camera permission denied. Please enable camera access in your browser settings.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Result */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Ticket className="w-6 h-6" />
                Validation Result
              </h2>

              {!validationResult ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Scan a QR code to see validation results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status */}
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${validationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                    {validationResult.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <p className={`font-semibold ${validationResult.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                        {validationResult.success ? 'Valid Ticket' : 'Invalid Ticket'}
                      </p>
                      <p className={`text-sm ${validationResult.success ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {validationResult.message}
                      </p>
                    </div>
                  </div>

                  {/* Countdown for next scan */}
                  {validationResult.success && countdown !== null && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                      <div className="flex items-center justify-center gap-3">
                        <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{countdown}</p>
                          <p className="text-sm text-purple-600">Scanning next ticket...</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ticket Details */}
                  {validationResult.success && validationResult.ticket && validationResult.event && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-3">Event Details</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(validationResult.event.date).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{validationResult.event.venue}, {validationResult.event.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-3">Ticket Details</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium">{validationResult.ticket.ticketName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Price:</span>
                            <span className="font-medium">{validationResult.ticket.price.toFixed(2)} EUR</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Validated:</span>
                            <span className="font-medium">{new Date(validationResult.ticket.usedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Details */}
                  {!validationResult.success && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-2">Error Details</h3>
                      <div className="space-y-1 text-sm text-red-600">
                        {validationResult.error && <p>Error: {validationResult.error}</p>}
                        {validationResult.status && <p>Status: {validationResult.status}</p>}
                        {validationResult.eventDate && <p>Event Date: {new Date(validationResult.eventDate).toLocaleDateString()}</p>}
                        {validationResult.usedAt && <p>Previously Used: {new Date(validationResult.usedAt).toLocaleString()}</p>}
                        {validationResult.validatedBy && <p>Validated By: {validationResult.validatedBy}</p>}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {!isScanning && (
                      <button
                        onClick={() => {
                          setValidationResult(null);
                          startScanning();
                        }}
                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Camera className="w-5 h-5" />
                        Scan Next Ticket
                      </button>
                    )}
                    <button
                      onClick={() => setValidationResult(null)}
                      className={`${isScanning ? 'w-full' : 'flex-1'} bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors`}
                    >
                      Clear Result
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Validation Logs Section */}
          <div className="mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Activity className="w-6 h-6" />
                  Today's Validation Logs
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={fetchValidationLogs}
                    disabled={logsLoading}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {showLogs ? 'Hide Logs' : 'Show Logs'}
                  </button>
                </div>
              </div>

              {showLogs && (
                <div className="space-y-4">
                  {logsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading validation logs...</p>
                    </div>
                  ) : validationLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No validation logs found for today.</p>
                      <p className="text-gray-500 text-sm mt-2">Your validation activities will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {validationLogs.map((log) => {
                        const StatusIcon = getStatusIcon(log.status);

                        return (
                          <div
                            key={log._id}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${getStatusColor(log.status)}`}>
                                  <StatusIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-800">{log.eventTitle}</h4>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                    <span>{log.userName}</span>
                                    <span>•</span>
                                    <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                                    <span>•</span>
                                    <span className="capitalize">{log.validationType}</span>
                                  </div>
                                  {log.notes && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{log.notes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                                  {log.status}
                                </span>
                                <button
                                  onClick={() => viewLogDetails(log)}
                                  className="bg-gray-600 text-white py-1 px-3 rounded text-sm hover:bg-gray-700 transition-colors flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  Details
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Log Details Modal */}
          {showLogDetails && selectedLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Validation Log Details</h3>
                    <button
                      onClick={() => setShowLogDetails(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Event</label>
                        <p className="text-gray-800">{selectedLog.eventTitle}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLog.status)}`}>
                            {selectedLog.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Customer</label>
                        <p className="text-gray-800">{selectedLog.userName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Validation Type</label>
                        <p className="text-gray-800 capitalize">{selectedLog.validationType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Date & Time</label>
                        <p className="text-gray-800">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Validator</label>
                        <p className="text-gray-800">{selectedLog.validatorName}</p>
                      </div>
                    </div>

                    {selectedLog.location && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Location</label>
                        <p className="text-gray-800">{selectedLog.location}</p>
                      </div>
                    )}

                    {selectedLog.notes && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedLog.notes}</p>
                      </div>
                    )}

                    {selectedLog.metadata && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Technical Details</label>
                        <div className="bg-gray-50 p-3 rounded-lg text-sm">
                          {selectedLog.metadata.ticketType && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Ticket Type:</span>
                              <span>{selectedLog.metadata.ticketType}</span>
                            </div>
                          )}
                          {selectedLog.metadata.ticketQuantity && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Quantity:</span>
                              <span>{selectedLog.metadata.ticketQuantity}</span>
                            </div>
                          )}
                          {selectedLog.metadata.scanMethod && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Scan Method:</span>
                              <span className="capitalize">{selectedLog.metadata.scanMethod}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setShowLogDetails(false)}
                      className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
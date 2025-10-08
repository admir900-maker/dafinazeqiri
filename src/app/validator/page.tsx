'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Camera, CameraOff, CheckCircle, XCircle, AlertTriangle, Calendar, MapPin, Ticket, Upload, FileText } from 'lucide-react';
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

export default function ValidatorPage() {
  const { user, isLoaded } = useUser();
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [manualQrInput, setManualQrInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          stopScanning();
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

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  const validateTicket = async (qrData: string) => {
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrCodeData: qrData }),
      });

      const result = await response.json();
      setValidationResult(result);

    } catch (error) {
      console.error('Error validating ticket:', error);
      setValidationResult({
        success: false,
        message: 'Network error. Please try again.',
        error: 'Network error'
      });
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
      console.log('📁 File selected:', file.name, file.type);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        console.log('🖼️ Image data loaded, size:', imageData.length);

        const img = new Image();
        img.onload = async () => {
          console.log('🖼️ Image loaded, dimensions:', img.width, 'x', img.height);

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
              console.log(`🔍 Attempt ${attempts}/${maxAttempts}: ${description}`);
              const result = await codeReader.decodeFromImage(imageSource);

              if (result) {
                const qrText = result.getText();
                console.log('✅ QR decoded successfully:', qrText);
                await validateTicket(qrText);
                return true;
              }
            } catch (error) {
              console.log(`❌ ${description} failed:`, error);
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
                  console.error('❌ Scaling failed:', scaleError);
                  alert('Could not read QR code from image. Please try entering the code manually.');
                }
              };
              enhancedImg.src = enhancedCanvas.toDataURL();
            }
          } catch (enhanceError) {
            console.error('❌ Enhancement failed:', enhanceError);
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
      console.error('❌ File upload error:', error);
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

                  <button
                    onClick={() => setValidationResult(null)}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Clear Result
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
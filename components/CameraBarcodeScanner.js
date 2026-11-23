'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, RefreshCw, Zap, Image as ImageIcon, CheckCircle, Package } from 'lucide-react'

export default function CameraBarcodeScanner({ isOpen, onClose, onScan, recentLines = [] }) {
  const scannerRef = useRef(null)
  const lastScanRef = useRef({ code: '', time: 0 })
  const fileInputRef = useRef(null)

  const [errorMsg, setErrorMsg] = useState('')
  const [isTorchOn, setIsTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [cameras, setCameras] = useState([])
  const [currentCameraIdx, setCurrentCameraIdx] = useState(0)
  const [lastScannedFeedback, setLastScannedFeedback] = useState('')
  const [scanFlash, setScanFlash] = useState(false)
  const [isDecodingFile, setIsDecodingFile] = useState(false)

  // Play crisp scanner beep on successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime)
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.1)
    } catch (e) {}
  }

  const handleDetectedCode = (decodedText) => {
    const now = Date.now()
    const trimmed = (decodedText || '').trim()
    if (!trimmed) return

    // 1.2s cooldown on identical code to avoid rapid duplicate firing
    if (lastScanRef.current.code === trimmed && now - lastScanRef.current.time < 1200) {
      return
    }

    lastScanRef.current = { code: trimmed, time: now }
    playBeep()

    // Visual green flash
    setScanFlash(true)
    setTimeout(() => setScanFlash(false), 300)

    setLastScannedFeedback(trimmed)

    if (onScan) {
      onScan(trimmed)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    let html5QrCode = null
    let isMounted = true

    async function initAndStart() {
      try {
        setErrorMsg('')
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (!isMounted) return

        // 1. Enumerate available cameras
        try {
          const deviceList = await Html5Qrcode.getCameras()
          if (isMounted && deviceList && deviceList.length > 0) {
            setCameras(deviceList)
          }
        } catch (e) {}

        // 2. Initialize with full 1D and 2D barcode format support + hardware BarcodeDetector
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ]

        html5QrCode = new Html5Qrcode('camera-reader', {
          formatsToSupport,
          verbose: false,
          useBarCodeDetectorIfSupported: true,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        })
        scannerRef.current = html5QrCode

        // 3. Scan configuration with wide rectangular targeting area for 1D barcodes
        const scanConfig = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.min(viewfinderWidth - 24, 380)
            const height = Math.min(viewfinderHeight - 24, 220)
            return { width: Math.max(width, 240), height: Math.max(height, 140) }
          },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
        }

        await html5QrCode.start(
          { facingMode: 'environment' },
          scanConfig,
          handleDetectedCode,
          () => {} // Frame decode miss - normal while moving
        )

        // Check if torch/flashlight is supported
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities()
          if (capabilities && capabilities.torch) {
            setHasTorch(true)
          }
        } catch (e) {}

      } catch (err) {
        if (isMounted) {
          setErrorMsg(err?.message || 'Could not access device camera. Please allow camera permissions.')
        }
      }
    }

    initAndStart()

    return () => {
      isMounted = false
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear()
        }).catch(() => {})
      }
    }
  }, [isOpen])

  // Switch between back/front cameras if available
  const switchCamera = async () => {
    if (!scannerRef.current || cameras.length <= 1) return
    const nextIdx = (currentCameraIdx + 1) % cameras.length
    setCurrentCameraIdx(nextIdx)
    try {
      await scannerRef.current.stop()
      const nextCameraId = cameras[nextIdx].id
      await scannerRef.current.start(
        nextCameraId,
        {
          fps: 15,
          qrbox: { width: 320, height: 180 },
          aspectRatio: 1.0,
        },
        handleDetectedCode,
        () => {}
      )
    } catch (e) {}
  }

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return
    try {
      const nextState = !isTorchOn
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      })
      setIsTorchOn(nextState)
    } catch (e) {}
  }

  // Snap or pick a high-res photo directly
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !scannerRef.current) return
    setIsDecodingFile(true)
    try {
      const decodedResult = await scannerRef.current.scanFile(file, false)
      if (decodedResult) {
        handleDetectedCode(decodedResult)
      }
    } catch (err) {
      setErrorMsg('No barcode found in that photo. Please try pointing closer.')
      setTimeout(() => setErrorMsg(''), 3000)
    } finally {
      setIsDecodingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        maxHeight: '92vh',
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-medium)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                Camera Barcode Scanner
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Code128, EAN, UPC & QR supported
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                title="Switch Camera"
                className="btn-icon"
                style={{ width: '34px', height: '34px' }}
              >
                <RefreshCw size={15} />
              </button>
            )}

            {hasTorch && (
              <button
                onClick={toggleTorch}
                title="Toggle Torch"
                className="btn-icon"
                style={{
                  width: '34px',
                  height: '34px',
                  background: isTorchOn ? '#FEF3C7' : undefined,
                  color: isTorchOn ? '#D97706' : undefined,
                }}
              >
                <Zap size={16} />
              </button>
            )}

            <button
              onClick={onClose}
              className="btn-icon"
              style={{ width: '34px', height: '34px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewfinder area */}
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: '260px',
          maxHeight: '340px',
          background: '#000',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div id="camera-reader" style={{ width: '100%' }} />

          {/* Red targeting laser guideline */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '8%',
            right: '8%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #EF4444, #EF4444, transparent)',
            boxShadow: '0 0 10px #EF4444',
            pointerEvents: 'none',
            transform: 'translateY(-50%)',
            zIndex: 10,
          }} />

          {/* Green flash overlay on scan */}
          {scanFlash && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(16, 185, 129, 0.45)',
              zIndex: 15,
              pointerEvents: 'none',
              transition: 'opacity 0.2s',
            }} />
          )}

          {errorMsg && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              zIndex: 20,
            }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#FCA5A5', marginBottom: '8px' }}>
                {errorMsg}
              </p>
              <p style={{ fontSize: '12px', opacity: 0.8 }}>
                Or use the "Take Photo" button below to capture an image directly.
              </p>
            </div>
          )}
        </div>

        {/* Instant Scan Banner */}
        <div style={{
          padding: '10px 16px',
          background: lastScannedFeedback ? 'var(--success-bg)' : 'var(--bg-subtle)',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>
              {lastScannedFeedback ? '✅' : '🎯'}
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              color: lastScannedFeedback ? 'var(--success)' : 'var(--text-secondary)',
            }}>
              {lastScannedFeedback ? `Scanned: ${lastScannedFeedback}` : 'Align barcode within red line'}
            </span>
          </div>

          {/* High-res Native Photo Fallback */}
          <label style={{ cursor: 'pointer' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              <ImageIcon size={14} style={{ color: 'var(--primary)' }} />
              <span>{isDecodingFile ? 'Scanning…' : 'Snap Photo'}</span>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isDecodingFile}
            />
          </label>
        </div>

        {/* Live Scanned Basket (so staff see items added in real time) */}
        <div style={{
          padding: '12px 16px',
          maxHeight: '160px',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          flex: 1,
        }}>
          <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Trip Items ({recentLines.length})
          </p>
          {recentLines.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '8px 0' }}>
              No items scanned yet. Point your camera at a printed barcode!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentLines.slice(-4).reverse().map((line) => (
                <div key={line.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: 'var(--bg-subtle)',
                  fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={13} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {line.practice_items?.name || 'Item'}
                    </span>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    {line.quantity} {line.practice_items?.base_unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div style={{
          padding: '12px 16px',
          background: 'var(--bg-subtle)',
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Keep scanning or tap Done
          </span>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '8px 22px', fontSize: '13px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

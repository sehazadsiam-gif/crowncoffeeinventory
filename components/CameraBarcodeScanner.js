'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, RefreshCw, Zap } from 'lucide-react'

export default function CameraBarcodeScanner({ isOpen, onClose, onScan }) {
  const scannerRef = useRef(null)
  const lastScanRef = useRef({ code: '', time: 0 })
  const [errorMsg, setErrorMsg] = useState('')
  const [isTorchOn, setIsTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [lastScannedItem, setLastScannedItem] = useState('')

  // Play subtle beep on successful scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, audioCtx.currentTime) // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.12)
    } catch (e) {}
  }

  useEffect(() => {
    if (!isOpen) return

    let html5QrCode = null
    let isMounted = true

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!isMounted) return

        html5QrCode = new Html5Qrcode('camera-reader')
        scannerRef.current = html5QrCode

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            return {
              width: Math.floor(minEdge * 0.85),
              height: Math.floor(minEdge * 0.45),
            }
          },
          aspectRatio: 1.0,
        }

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            const now = Date.now()
            const trimmed = decodedText.trim()
            // 1.5s cooldown on identical code, but allow different codes immediately
            if (lastScanRef.current.code === trimmed && now - lastScanRef.current.time < 1500) {
              return
            }

            lastScanRef.current = { code: trimmed, time: now }
            playBeep()
            setLastScannedItem(trimmed)
            if (onScan) onScan(trimmed)
          },
          (errorMessage) => {
            // Frame scan failure (common when moving) - ignore
          }
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

    startScanner()

    return () => {
      isMounted = false
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear()
        }).catch(() => {})
      }
    }
  }, [isOpen])

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

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Live Barcode Scanner
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasTorch && (
              <button
                onClick={toggleTorch}
                title="Toggle Flashlight"
                style={{
                  background: isTorchOn ? 'var(--warning-bg)' : 'var(--bg-subtle)',
                  border: '1px solid var(--border-medium)',
                  color: isTorchOn ? 'var(--warning)' : 'var(--text-muted)',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Zap size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewfinder area */}
        <div style={{ position: 'relative', width: '100%', minHeight: '300px', background: '#000' }}>
          <div id="camera-reader" style={{ width: '100%' }} />

          {/* Animated red targeting laser line */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '10%',
            right: '10%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #EF4444, #EF4444, transparent)',
            boxShadow: '0 0 8px #EF4444',
            pointerEvents: 'none',
            transform: 'translateY(-50%)',
          }} />

          {errorMsg && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '14px', marginBottom: '12px' }}>{errorMsg}</p>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Please ensure camera permissions are allowed in your browser settings.</p>
            </div>
          )}
        </div>

        {/* Footer info & Done button */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>
              Scanner Active
            </p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>
              {lastScannedItem ? `Scanned: ${lastScannedItem}` : 'Point camera at barcode'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import {
  Camera,
  RotateCcw,
  Check,
  X,
  AlertCircle,
  Upload,
  RefreshCw,
  SwitchCamera,
  ShieldCheck,
  Eye,
} from "lucide-react"
import { submitImageEvidence, type EvidenceSubmission, type TaskOccurrence } from "@/lib/api"

interface CameraCaptureModalProps {
  occurrence: TaskOccurrence
  stepId: number
  stepTitle: string
  allowGallery?: boolean
  onClose: () => void
  onSuccess: (evidence: EvidenceSubmission, updatedOccurrence: TaskOccurrence) => void
  notify: (msg: string) => void
}

export function CameraCaptureModal({
  occurrence,
  stepId,
  stepTitle,
  allowGallery = true,
  onClose,
  onSuccess,
  notify,
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null)
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Start camera stream
  const startCamera = async (facing: "environment" | "user") => {
    setInitializing(true)
    setCameraError(null)

    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("WebRTC camera capture is not supported on this browser.")
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err)
      let msg = "Could not access camera. Please allow camera permissions or select a photo from files."
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission was denied. You can still upload a photo from files."
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No camera found on this device. Please upload a photo from files."
      }
      setCameraError(msg)
    } finally {
      setInitializing(false)
    }
  }

  useEffect(() => {
    startCamera(cameraFacing)

    return () => {
      // Cleanup camera stream on close
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [cameraFacing])

  // Stop camera tracks cleanly
  const stopTracks = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
  }

  // Snap photo from live video stream
  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob)
          const url = URL.createObjectURL(blob)
          setCapturedDataUrl(url)
          stopTracks()
        }
      },
      "image/jpeg",
      0.88
    )
  }

  // Retake photo
  const handleRetake = () => {
    if (capturedDataUrl) {
      URL.revokeObjectURL(capturedDataUrl)
    }
    setCapturedBlob(null)
    setCapturedDataUrl(null)
    startCamera(cameraFacing)
  }

  // Switch between front & rear camera
  const handleFlipCamera = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment"
    setCameraFacing(nextFacing)
  }

  // Handle fallback file input selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      const file = files[0]
      setCapturedBlob(file)
      const url = URL.createObjectURL(file)
      setCapturedDataUrl(url)
      stopTracks()
    }
  }

  // Submit captured evidence
  const handleSubmitEvidence = async () => {
    if (!capturedBlob) return

    setSubmitting(true)
    try {
      const source = cameraError ? "gallery_upload" : "camera_capture"
      const res = await submitImageEvidence(
        occurrence.id,
        stepId,
        capturedBlob,
        source,
        {
          facing: cameraFacing,
          client_timestamp: new Date().toISOString(),
        }
      )

      notify(`Verification recorded for "${stepTitle}"`)
      onSuccess(res.evidence, res.occurrence)
      onClose()
    } catch (err: any) {
      notify(err.message || "Failed to submit verification evidence")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="lp-modal-backdrop" onClick={onClose}>
      <div
        className="lp-modal-content surface-card"
        style={{
          maxWidth: 520,
          padding: 0,
          overflow: "hidden",
          borderRadius: 12,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="camera-modal-title"
      >
        {/* Modal Header */}
        <div className="lp-modal-header" style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <span className="icon-tile icon-tile-cyan" style={{ width: 30, height: 30 }}>
              <Camera size={16} />
            </span>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>ACCOUNTABILITY PROOF</p>
              <h2 id="camera-modal-title" style={{ margin: 0, fontSize: "1.05rem" }}>
                {stepTitle}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-action"
            onClick={onClose}
            aria-label="Close camera"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div style={{ position: "relative", background: "#050b14", minHeight: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Live Video Preview */}
          {!capturedDataUrl && !cameraError && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxHeight: 380,
                objectFit: "cover",
                display: initializing ? "none" : "block",
              }}
            />
          )}

          {/* Initializing Spinner */}
          {initializing && !capturedDataUrl && !cameraError && (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "40px" }}>
              <RefreshCw size={24} className="spin" style={{ margin: "0 auto 8px" }} />
              <p style={{ margin: 0, fontSize: "0.85rem" }}>Activating camera lens...</p>
            </div>
          )}

          {/* Captured Review Photo */}
          {capturedDataUrl && (
            <img
              src={capturedDataUrl}
              alt="Evidence preview"
              style={{
                width: "100%",
                maxHeight: 380,
                objectFit: "contain",
                background: "#000",
              }}
            />
          )}

          {/* Camera Error / Permission Denied State */}
          {cameraError && !capturedDataUrl && (
            <div style={{ padding: "30px 20px", textAlign: "center", maxWidth: 380 }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(234, 179, 8, 0.15)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fde047",
                  marginBottom: 12,
                }}
              >
                <AlertCircle size={22} />
              </span>
              <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.85)", fontSize: "0.88rem" }}>
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="button button-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}
              >
                <Upload size={15} /> Select Photo from Device
              </button>
            </div>
          )}

          {/* Flip camera control (overlayed on live video) */}
          {!capturedDataUrl && !cameraError && !initializing && (
            <button
              type="button"
              onClick={handleFlipCamera}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                cursor: "pointer",
                zIndex: 10,
              }}
              title="Switch front/rear camera"
            >
              <SwitchCamera size={18} />
            </button>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {/* Hidden File Input for Gallery Fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {/* Modal Action Controls Footer */}
        <div style={{ padding: "14px 18px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Disclaimer */}
          <p style={{ margin: "0 0 12px", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
            🔒 Evidence is encrypted and saved privately in your MySQL database for your personal accountability.
          </p>

          <div className="flex items-center justify-between gap-3">
            {!capturedDataUrl ? (
              <>
                {/* Fallback button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="button button-subtle"
                  style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <Upload size={14} /> Upload File
                </button>

                {/* Shutter Button */}
                <button
                  type="button"
                  onClick={handleSnap}
                  disabled={initializing || !!cameraError}
                  style={{
                    background: "#74c7c3",
                    color: "#0f172a",
                    border: "none",
                    borderRadius: "30px",
                    padding: "8px 24px",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Camera size={16} /> Snap Photo
                </button>
              </>
            ) : (
              <>
                {/* Retake Button */}
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={submitting}
                  className="button button-subtle"
                  style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <RotateCcw size={14} /> Retake
                </button>

                {/* Confirm & Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmitEvidence}
                  disabled={submitting}
                  className="button button-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.88rem",
                    padding: "8px 20px",
                  }}
                >
                  {submitting ? "Saving..." : (
                    <>
                      <Check size={16} /> Submit Proof
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    let activeStream = null;

    const startCamera = async () => {
      if (!isOpen) return;
      setErrorMsg(null);
      setIsInitializing(true);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API is not supported on this browser or device.');
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        let msg = 'Failed to access camera.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Camera access was denied. Please allow camera permission in your browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'No camera device found on this system.';
        } else if (err.message) {
          msg = err.message;
        }
        setErrorMsg(msg);
      } finally {
        setIsInitializing(false);
      }
    };

    if (isOpen) {
      startCamera();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      setStream(null);
    };
  }, [isOpen]);

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    onClose();
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/png');

    // Convert dataUrl to File
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.png`, { type: 'image/png' });
        onCapture({ file, dataUrl, name: file.name, type: 'image' });
      }
      handleClose();
    }, 'image/png');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stream]);

  if (!isOpen) return null;

  const captureDisabled = !!errorMsg || isInitializing;

  return (
    <div
      className="camera-modal-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Camera capture"
    >
      <div
        className="camera-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="camera-modal-header">
          <div className="camera-modal-title">
            <Camera size={18} color="var(--accent-primary)" />
            <span>Take Picture</span>
          </div>
          <button
            className="camera-modal-close-btn"
            onClick={handleClose}
            aria-label="Close camera"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Viewfinder Area */}
        <div className="camera-viewfinder">
          {errorMsg ? (
            <div className="camera-error">
              <AlertCircle size={36} />
              <p>{errorMsg}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ display: isInitializing ? 'none' : 'block' }}
            />
          )}

          {isInitializing && !errorMsg && (
            <div className="camera-initializing">
              <RefreshCw size={20} className="spin-icon" />
              <span>Initializing camera...</span>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Footer Actions */}
        <div className="camera-modal-footer">
          <button
            className="camera-btn-cancel"
            onClick={handleClose}
            aria-label="Cancel camera capture"
          >
            Cancel
          </button>
          <button
            className="camera-btn-capture"
            onClick={handleCapture}
            disabled={captureDisabled}
            aria-label="Capture photo"
          >
            <Camera size={16} />
            <span>Capture Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}

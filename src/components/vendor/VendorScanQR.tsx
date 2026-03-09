"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { QrCode, Upload, X } from "lucide-react";

interface VendorScanQRProps {
  onFulfilled: () => void;
  disabled?: boolean;
}

export function VendorScanQR({ onFulfilled, disabled }: VendorScanQRProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const lastScannedRef = useRef<string | null>(null);
  const fulfillingRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
  }, []);

  const closeModal = useCallback(() => {
    stopCamera();
    setOpen(false);
    setError(null);
    setMessage(null);
    lastScannedRef.current = null;
    fulfillingRef.current = false;
  }, [stopCamera]);

  const fulfillByQrToken = useCallback(
    async (qrToken: string) => {
      setSubmitting(true);
      setError(null);
      setMessage(null);
      try {
        const res = await fetch("/api/vendor/orders/fulfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Failed to fulfill");
          lastScannedRef.current = null;
          fulfillingRef.current = false;
          return;
        }
        setMessage("Order fulfilled.");
        onFulfilled();
        setTimeout(closeModal, 800);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
        lastScannedRef.current = null;
        fulfillingRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [onFulfilled, closeModal]
  );

  const tryDecodeFromVideo = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      const token = code.data.trim();
      if (
        token &&
        token !== lastScannedRef.current &&
        !fulfillingRef.current
      ) {
        lastScannedRef.current = token;
        fulfillingRef.current = true;
        fulfillByQrToken(token);
      }
    }
  }, [fulfillByQrToken]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setMessage(null);
    lastScannedRef.current = null;
    fulfillingRef.current = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setError("Camera access denied or unavailable.");
      }
    };
    startCamera();

    const tick = () => {
      if (streamRef.current && !fulfillingRef.current) {
        tryDecodeFromVideo();
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);

    return () => {
      stopCamera();
    };
  }, [open, tryDecodeFromVideo, stopCamera]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !canvasRef.current) return;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          fulfillByQrToken(code.data.trim());
        } else {
          setError("No QR code found in image.");
        }
      };
      img.src = URL.createObjectURL(file);
      e.target.value = "";
    },
    [fulfillByQrToken]
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="gap-2"
      >
        <QrCode className="h-4 w-4" />
        Scan QR
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scan-qr-title"
        >
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h2 id="scan-qr-title" className="text-lg font-semibold">
                Scan order QR
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeModal}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Point the camera at the customer&apos;s order QR, or upload an
                image. Order must be &quot;Ready for pickup&quot;.
              </p>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              {message && (
                <p className="text-sm font-medium text-primary">{message}</p>
              )}
              <div className="relative aspect-square max-h-[280px] overflow-hidden rounded-md bg-muted">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  style={{ display: "none" }}
                />
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                <span>Upload QR image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={submitting}
                />
              </label>
              {submitting && (
                <p className="text-center text-sm text-muted-foreground">
                  Fulfilling order…
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

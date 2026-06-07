"use client";

import { useEffect, useRef } from "react";

interface Props {
  onDetected: (code: string) => void;
}

export default function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const hasScanned = useRef(false);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    let stopFn: (() => void) | null = null;
    hasScanned.current = false;

    const start = async () => {
      if (!videoRef.current) return;
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (result && !hasScanned.current) {
            hasScanned.current = true;
            onDetectedRef.current(result.getText());
          }
        }
      );

      stopFn = () => controls.stop();
    };

    start().catch(console.error);

    return () => {
      stopFn?.();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

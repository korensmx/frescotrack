// Abre la cámara y busca un código QR. Cuando lo encuentra, llama a onResult.
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      const video = videoRef.current;
      if (!done.current && video && ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          done.current = true;
          navigator.vibrate?.(80);
          onResult(code.data);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        frame = requestAnimationFrame(tick);
      })
      .catch(() => setError('No pudimos abrir la cámara. Dale permiso a la cámara en tu navegador, o escribe el código del sticker abajo.'));

    return () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  if (error) return <div className="card text-sm text-warn">{error}</div>;

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl border border-ice/40 bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
      <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-ice/80 shadow-[0_0_0_9999px_rgba(10,14,20,0.55)]" />
      <p className="absolute inset-x-0 bottom-3 text-center text-sm text-text">Apunta al sticker QR del equipo</p>
    </div>
  );
}

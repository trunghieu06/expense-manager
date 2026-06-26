import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect, type DragEvent } from "react";
import { api, type TransactionResponse } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { ErrorBlock } from "@/components/StateViews";
import { useI18n } from "@/lib/i18n";
import { Loader2, UploadCloud, Check, Camera, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
});

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function ScanPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<TransactionResponse | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraRequested, setCameraRequested] = useState(false);
  const [forceUpload, setForceUpload] = useState(false);

  const m = useMutation({
    mutationFn: (file: File) => api.scanInvoice(file),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["monthlySummary"] });
    },
  });

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraRequested(false);
  };

  const startCamera = async () => {
    try {
      setCameraError(false);
      setCameraRequested(true);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported. Please use HTTPS or localhost.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error(err);
      setCameraError(true);
    }
  };

  useEffect(() => {
    if (!isMobile || forceUpload || preview) {
      stopCamera();
    }
    return stopCamera;
  }, [isMobile, forceUpload, preview]);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            handleFile(file);
          }
        }, "image/jpeg", 0.9);
      }
    }
  };

  const handleFile = (file: File) => {
    setResult(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    m.mutate(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    m.reset();
  };

  const formatCurrency = (n: number, curr?: string) => {
    const c = curr || "VND";
    return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", { 
      style: "currency", 
      currency: c, 
      maximumFractionDigits: c === "VND" ? 0 : 2 
    }).format(n);
  };

  return (
    <Layout>
      <section className="mb-10 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.2em] text-coral font-medium">
          — {t("nav_scan")}
        </div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">{t("scan_title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("scan_subtitle")}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
        {/* Left column: Input area */}
        {isMobile && !forceUpload ? (
           <div className="rounded-3xl border border-border bg-card overflow-hidden flex flex-col relative h-[450px]">
             {preview ? (
               <div className="relative h-full w-full">
                 <img src={preview} alt="preview" className="h-full w-full object-contain bg-black/5" />
                 <button 
                   onClick={reset}
                   className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background/90 backdrop-blur-md px-6 py-2 font-medium shadow-lg hover:bg-background transition-colors border border-border"
                 >
                   {t("retake")}
                 </button>
               </div>
             ) : (
               <div className="relative h-full w-full bg-black rounded-3xl overflow-hidden">
                 {cameraError ? (
                   <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
                     <p className="mb-4 text-sm">{t("camera_error")}</p>
                     <button onClick={() => setForceUpload(true)} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
                       {t("use_upload")}
                     </button>
                   </div>
                 ) : !cameraRequested ? (
                   <div className="flex h-full flex-col items-center justify-center p-6 text-center text-white">
                     <Camera className="mb-4 h-12 w-12 opacity-50" />
                     <button onClick={startCamera} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
                       {t("open_camera")}
                     </button>
                     <button onClick={() => setForceUpload(true)} className="mt-4 text-sm text-white/70 hover:text-white underline underline-offset-4">
                       {t("use_upload")}
                     </button>
                   </div>
                 ) : (
                   <>
                     <video 
                       ref={videoRef} 
                       autoPlay 
                       playsInline 
                       muted
                       className="h-full w-full object-cover"
                     />
                     <canvas ref={canvasRef} className="hidden" />
                     {!cameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                     )}
                     <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8">
                       <button 
                         onClick={() => setForceUpload(true)}
                         className="rounded-full bg-black/50 p-3 text-white backdrop-blur-md transition-colors hover:bg-black/70"
                         title={t("use_upload")}
                       >
                         <ImageIcon className="h-5 w-5" />
                       </button>
                       <button 
                         onClick={captureFrame}
                         disabled={!cameraActive}
                         className="h-16 w-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors flex items-center justify-center disabled:opacity-50"
                       >
                         <div className="h-12 w-12 rounded-full bg-white shadow-sm" />
                       </button>
                       <div className="w-11" /> {/* Spacer to balance */}
                     </div>
                   </>
                 )}
               </div>
             )}
           </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-colors flex flex-col justify-center min-h-[300px] ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="mt-4 font-display text-xl">{t("drop_here")}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t("formats")}</div>
            
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                {t("pick_file")}
              </button>
              {isMobile && (
                <button
                  type="button"
                  className="rounded-full bg-secondary px-5 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 border border-border"
                  onClick={(e) => { e.stopPropagation(); setForceUpload(false); }}
                >
                  <Camera className="mr-2 inline-block h-4 w-4" />
                  {t("open_camera")}
                </button>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* Right column: Results area */}
        <div className="rounded-3xl border border-border bg-card p-6 min-h-[280px] flex flex-col">
          {preview && (!isMobile || forceUpload) && (
            <div className="mb-4 overflow-hidden rounded-2xl border border-border relative">
              <img src={preview} alt="invoice" className="w-full max-h-56 object-contain bg-black/5" />
            </div>
          )}

          {m.isPending && (
            <div className="flex items-center gap-3 text-muted-foreground py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-primary">{t("uploading")}</span>
            </div>
          )}

          {m.error && <ErrorBlock error={m.error} />}

          {result && !m.isPending && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-600 bg-green-100 px-3 py-1 rounded-full">
                <Check className="h-3.5 w-3.5" /> {t("parsed_as")}
              </div>
              <div className="mt-4 font-display text-4xl sm:text-5xl text-primary">
                {formatCurrency(result.amount, result.currency)}
              </div>
              <div className="mt-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {result.category}
              </div>
              {result.note && <p className="mt-4 text-sm bg-secondary/50 p-3 rounded-xl border border-border">{result.note}</p>}
              <div className="mt-6 text-xs text-muted-foreground border-t border-border pt-4">
                {new Date(result.created_at).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")}
              </div>
            </div>
          )}

          {!preview && !m.isPending && !result && !m.error && (
            <div className="m-auto text-sm text-muted-foreground opacity-50 font-medium tracking-wide uppercase">
              — {t("nav_scan")} —
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

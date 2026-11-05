"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerPdf, savePages } from "@/app/actions";
import { cn } from "@/lib/utils";

/** Pages with little extractable text are treated as diagram-heavy: we also send their image to the model. */
const LOW_TEXT_CHARS = 250;

async function sha256(buf: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render failed"))), "image/jpeg", quality),
  );
}

export function PdfUploader({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handle(file: File) {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const hash = await sha256(buf);
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

      const reg = await registerPdf({ lectureId, filename: file.name, sha256: hash, pageCount: doc.numPages });
      if (reg.duplicate) {
        setStatus("This exact file is already uploaded, so it was skipped.");
        return;
      }
      const supabase = createClient();
      const storage = supabase.storage.from("sources");
      await storage.upload(`${reg.prefix}/original.pdf`, file, { contentType: "application/pdf", upsert: true });

      const pages = [];
      for (let n = 1; n <= doc.numPages; n++) {
        setStatus(`Reading page ${n} of ${doc.numPages}…`);
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        const text = content.items
          .map((it) => ("str" in it ? it.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        const base = page.getViewport({ scale: 1 });

        const render = async (width: number, quality: number) => {
          const viewport = page.getViewport({ scale: width / base.width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await page.render({ canvas, viewport }).promise;
          return canvasBlob(canvas, quality);
        };

        const thumbnailPath = `${reg.prefix}/thumbs/${n}.jpg`;
        await storage.upload(thumbnailPath, await render(640, 0.75), { contentType: "image/jpeg", upsert: true });
        let imagePath: string | null = null;
        if (text.length < LOW_TEXT_CHARS) {
          imagePath = `${reg.prefix}/images/${n}.jpg`;
          await storage.upload(imagePath, await render(1280, 0.8), { contentType: "image/jpeg", upsert: true });
        }
        pages.push({ page: n, text, thumbnailPath, imagePath, density: text.length / ((base.width * base.height) / 1000) });
      }
      await savePages({ sourceFileId: reg.id, pages });
      setStatus(`Uploaded ${file.name} (${doc.numPages} pages).`);
      router.refresh();
    } catch (e) {
      setStatus(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={`pdf-${lectureId}`}
        data-dragging={dragging || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (busy) return;
          const f = Array.from(e.dataTransfer.files).find((file) => file.type === "application/pdf");
          if (f) void handle(f);
          else setStatus("Only PDF files can be uploaded here.");
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-separator-strong bg-surface-2/50 p-6 text-center transition-colors duration-200 hover:border-accent-fill/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-fill data-[dragging]:border-accent-fill data-[dragging]:bg-accent-fill/5",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-accent-fill/10 text-accent">
          <Upload aria-hidden className="size-5" />
        </span>
        <span className="space-y-0.5">
          <span className="block text-subhead font-semibold text-label">Drop a PDF here, or click to choose</span>
          <span className="block text-footnote text-label-2">Slides or notes · PDF</span>
        </span>
        <input
          id={`pdf-${lectureId}`}
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handle(f);
          }}
          className="sr-only"
        />
      </label>
      {(busy || status) && (
        <p role="status" className="flex items-center gap-2 text-subhead text-label-2">
          {busy && <Loader aria-hidden className="size-4 shrink-0 text-accent motion-safe:animate-spin" />}
          <span>{status ?? "Processing…"}</span>
        </p>
      )}
    </div>
  );
}

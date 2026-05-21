// XHR-backed file upload with progress callback. Used for cover photo and
// gallery uploads so the UI can show a real progress bar instead of an
// indeterminate spinner. `fetch` doesn't surface upload progress.

export type UploadOpts = {
  url: string;
  file: File | Blob;
  contentType?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

export function uploadWithProgress({
  url,
  file,
  contentType,
  onProgress,
  signal,
}: UploadOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (!onProgress || !e.lengthComputable) return;
      onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.upload.onload = () => onProgress?.(100);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

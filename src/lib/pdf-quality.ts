const BLUR_THRESHOLD = 80;

export interface PDFQualityResult {
  isBlurry: boolean;
  score: number;
  threshold: number;
  pageAnalyzed: number;
  totalPages: number;
  error?: string;
}

export async function analyzePDFQuality(
  file: File,
  onProgress?: (msg: string) => void
): Promise<PDFQualityResult> {
  const defaultResult: PDFQualityResult = {
    isBlurry: false, score: 0, threshold: BLUR_THRESHOLD,
    pageAnalyzed: 0, totalPages: 0,
  };

  try {
    const pdfjsLib = await import('pdfjs-dist');
    const { getDocument, GlobalWorkerOptions } = pdfjsLib;
    GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`;

    onProgress?.('Membaca file PDF...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const totalPages = pdf.numPages;

    if (totalPages === 0) return { ...defaultResult, error: 'PDF kosong (0 halaman)' };

    onProgress?.(`Menganalisis halaman 1 dari ${totalPages}...`);
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) return { ...defaultResult, error: 'Canvas tidak didukung oleh browser' };

    await (page.render as unknown as (params: Record<string, unknown>) => { promise: Promise<void> })({ canvasContext: ctx, viewport }).promise;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const score = calculateLaplacianVariance(imageData);
    onProgress?.('Analisis selesai.');

    return { isBlurry: score < BLUR_THRESHOLD, score: Math.round(score), threshold: BLUR_THRESHOLD, pageAnalyzed: 1, totalPages };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menganalisis PDF';
    return { ...defaultResult, error: message };
  }
}

function calculateLaplacianVariance(imageData: ImageData): number {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  let lapSum = 0, lapSumSq = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const val = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - width] + gray[idx + width];
      lapSum += val;
      lapSumSq += val * val;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = lapSum / count;
  const variance = (lapSumSq / count) - (mean * mean);
  return Math.max(0, variance);
}

export function getQualityLabel(score: number): {
  label: string; color: string; bgColor: string; description: string;
} {
  if (score < 30) {
    return { label: 'Sangat Buram', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800', description: 'Dokumen sangat tidak jelas. Silakan scan ulang dengan kualitas tinggi.' };
  }
  if (score < BLUR_THRESHOLD) {
    return { label: 'Kurang Jelas', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800', description: 'Dokumen kurang jelas. Disarankan upload ulang dengan resolusi lebih tinggi.' };
  }
  if (score < 200) {
    return { label: 'Cukup Jelas', color: 'text-sky-700 dark:text-sky-300', bgColor: 'bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800', description: 'Kualitas dokumen memadai.' };
  }
  return { label: 'Sangat Jelas', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800', description: 'Dokumen sangat jelas dan mudah dibaca.' };
}
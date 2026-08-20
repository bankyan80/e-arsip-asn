import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

export interface ProcessedPage {
  buffer: Buffer;
  width: number;
  height: number;
  format: "jpeg" | "png" | "webp";
}

export interface ConversionResult {
  pdfBuffer: Buffer;
  pageCount: number;
  pages: ProcessedPage[];
}

const MAX_IMAGE_DIMENSION = 2600;

export async function imageToPdfBuffers(imageBuffers: Buffer[]): Promise<ConversionResult> {
  const pages: ProcessedPage[] = [];

  for (const buf of imageBuffers) {
    let image = sharp(buf, { failOn: "none" }).rotate(); // perbaiki orientasi EXIF
    const meta = await image.metadata();

    if (!meta.width || !meta.height) {
      throw new Error("Gambar tidak terbaca");
    }

    // Optimasi kualitas: kurangi dimensi bila terlalu besar agar file tetap wajar.
    const maxDim = Math.max(meta.width, meta.height);
    if (maxDim > MAX_IMAGE_DIMENSION) {
      const scale = MAX_IMAGE_DIMENSION / maxDim;
      image = image.resize(Math.round(meta.width * scale), Math.round(meta.height * scale), {
        fit: "inside",
      });
    }

    const format: ProcessedPage["format"] =
      meta.format === "png" ? "png" : meta.format === "webp" ? "webp" : "jpeg";

    const out = await image
      .toFormat(format === "png" ? "png" : "jpeg", { quality: 92, mozjpeg: true })
      .toBuffer();

    const outMeta = await sharp(out).metadata();
    pages.push({
      buffer: out,
      width: outMeta.width ?? meta.width,
      height: outMeta.height ?? meta.height,
      format,
    });
  }

  const pdf = await PDFDocument.create();
  const pageSize = { width: 595.28, height: 841.89 }; // A4 dalam poin

  for (const page of pages) {
    const img = await embedImage(pdf, page);
    const { width, height } = fitPage(page, pageSize);
    const pdfPage = pdf.addPage([width, height]);
    pdfPage.drawImage(img, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const pdfBuffer = Buffer.from(await pdf.save());
  return { pdfBuffer, pageCount: pages.length, pages };
}

async function embedImage(pdf: PDFDocument, page: ProcessedPage) {
  if (page.format === "png") {
    return pdf.embedPng(page.buffer);
  }
  if (page.format === "webp") {
    // Konversi webp ke jpeg terlebih dahulu
    const jpeg = await sharp(page.buffer).jpeg({ quality: 92 }).toBuffer();
    return pdf.embedJpg(jpeg);
  }
  return pdf.embedJpg(page.buffer);
}

function fitPage(page: ProcessedPage, target: { width: number; height: number }) {
  const scale = Math.min(target.width / page.width, target.height / page.height);
  return {
    width: Math.round(page.width * scale),
    height: Math.round(page.height * scale),
  };
}

export function isImageMime(mime: string): boolean {
  return /^image\/(jpeg|png|webp|gif|bmp|tiff|heic|heif|avif)$/i.test(mime);
}

export function isPdfMime(mime: string): boolean {
  return /^application\/pdf$/i.test(mime) || mime === "application/x-pdf";
}

export function detectImageFromBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) return true;
  // WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.slice(8, 12).toString() === "WEBP"
  ) return true;
  return false;
}

export function isPdfBuffer(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 8).toString("latin1");
  return head.startsWith("%PDF");
}

export async function pdfPageCount(buffer: Buffer): Promise<number> {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdf.getPageCount();
}
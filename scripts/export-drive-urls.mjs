import fs from "fs";
const root = process.cwd();
for (const line of fs.readFileSync(root + "/.env.local", "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !line.trim().startsWith("#")) {
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

// reuse normalizers from match script (copy)
function normSchool(s) {
  let x = (s || "").trim().toUpperCase();
  x = x.replace(/^\d+[.\s-]*/, "");
  x = x.replace(/\bSDN\b/g, "SD NEGERI");
  x = x.replace(/\bTKN\b/g, "TK NEGERI");
  x = x.replace(/[^A-Z0-9]/g, "");
  return x;
}
function normName(s) {
  let x = (s || "").toUpperCase();
  x = x.replace(/-\d{8}T\d{6}Z(-\d+)+/g, "");
  x = x.replace(/_\d[\d\s.]+$/, "");
  x = x.replace(/^\d+[.\s-]+/, "");
  x = x.replace(/^\d{4}_/, "");
  x = x.replace(/,\s*$/, "");
  x = x.replace(/_/g, "'");
  x = x.replace(/(^|[.,\s])+((H\.?)|(HJ\.?))?\s*((S\.PD\.?(SD|I|AUD)?)|(S\.PD\.?I\.?M\.?M)|(M\.PD\.?I?)|(M\.M)|(S\.SI)|(S\.AG)|(S\.KOM)|(S\.H\.?I?)|(S\.E)|(S\.H)|(S\.IP)|(A\.MA\.?PD)|(A\.MD)|(DRA)|(DRS?))\b/g, "");
  x = x.replace(/^(H\.?|HJ\.?|BAPAK|IBU|DRS?\.?|DRA\.?)\s+/, "");
  x = x.replace(/'/g, "");
  x = x.replace(/\bMOHA?MM?AD\b/g, "MOHAMAD");
  x = x.replace(/[^A-Z0-9]/g, "");
  return x;
}
function stripSchoolFromName(s, schoolNorm, raws) {
  let x = (s || "").toUpperCase();
  for (const raw of raws || []) {
    const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    x = x.replace(new RegExp(esc, "g"), "");
    const alt = raw.replace(/\bSDN\b/g, "SD NEGERI").replace(/\bTKN\b/g, "TK NEGERI").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    x = x.replace(new RegExp(alt, "g"), "");
    x = x.replace(new RegExp(raw.replace(/[^A-Z0-9]/g, ""), "g"), "");
  }
  return x;
}

const files = JSON.parse(fs.readFileSync(root + "/drive-arsip-list.json", "utf8"));
const R = "DOKUMEN SIMPEG KECAMATAN LEMAHABANG/";
const asn = await sql("SELECT id, nip, nama, unit_kerja FROM asn ORDER BY unit_kerja, nama");

const dbByNorm = new Map();
for (const a of asn) dbByNorm.set(normName(a.nama), a);

const rawSchoolByNorm = {};
const groups = {}; // asnKey -> files[]
for (const f of files) {
  const rel = f.path.slice(R.length);
  const seg = rel.split("/");
  if (seg.length < 3) continue;
  const school = normSchool(seg[0]);
  if (!rawSchoolByNorm[school]) rawSchoolByNorm[school] = new Set();
  rawSchoolByNorm[school].add(seg[0].replace(/^\d+[.\s-]*/, ""));
  const pn = normName(stripSchoolFromName(seg[1], school, rawSchoolByNorm[school]));
  const hit = dbByNorm.get(pn);
  if (!hit) continue;
  if (!groups[hit.nip]) groups[hit.nip] = [];
  groups[hit.nip].push({ file: seg.slice(2).join("/"), url: f.url, mime: f.mimeType, size: f.size });
}

// CSV: satu baris per file, kolom identitas ASN
const header = "NIP,NAMA,UNIT_KERJA,NAMA_FILE,URL";
const lines = [header];
let asnCount = 0;
for (const [nip, fl] of Object.entries(groups)) {
  const a = asn.find((x) => x.nip === nip);
  asnCount++;
  for (const f of fl.sort((x, y) => x.file.localeCompare(y.file))) {
    lines.push([nip, a.nama, a.unit_kerja, f.file, f.url].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  }
}
fs.writeFileSync(root + "/drive-asn-documents.csv", "\uFEFF" + lines.join("\n"), "utf8");

// ringkasan per ASN
const summary = ["NIP,NAMA,UNIT_KERJA,JUMLAH_FILE"];
for (const [nip, fl] of Object.entries(groups)) {
  const a = asn.find((x) => x.nip === nip);
  summary.push([nip, a.nama, a.unit_kerja, fl.length].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
}
fs.writeFileSync(root + "/drive-asn-summary.csv", "\uFEFF" + summary.join("\n"), "utf8");

console.log("ASN dengan dokumen:", asnCount);
console.log("Total baris file:", lines.length - 1);
console.log("Output: drive-asn-documents.csv (detail), drive-asn-summary.csv (ringkasan)");
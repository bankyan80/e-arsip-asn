import fs from "fs";
const files = JSON.parse(fs.readFileSync("drive-arsip-list.json", "utf8"));
const R = "DOKUMEN SIMPEG KECAMATAN LEMAHABANG/";
const rules = [
  ["SK_PANGKAT", /PANGKAT/i],
  ["SK_CPNS", /CPNS|CALON\s*PEGAWAI/i],
  ["SK_KGB", /BERKALA|KGB|GAJI\s*BERKALA/i],
  ["SK_TASJEN", /TASJEN|TUNJANGAN|TUNKIN/i],
  ["SK_PPPK", /PPPK/i],
  ["PERJANJIAN_KERJA", /PERJANJIAN/i],
  ["SK_JABATAN", /JABATAN(?!.*FUNGSI)/i],
  ["JABFUNG", /JABFUNG|JAFUNG|JABATAN\s*FUNGSI/i],
  ["SK_PNS", /\bPNS\b(?!.*\bSK\b)|SK[_\s]*PNS/i],
  ["SK_PENGANGKATAN", /PENGANGKATAN|\bSK\b|(^|[^A-Z])SPK([^A-Z]|$)/i],
  ["IJAZAH_S3", /IJAZAH.*\bS3\b|DOKTOR/i],
  ["IJAZAH_S2", /IJAZAH.*\bS2\b|MAGISTER|\bS2\b/i],
  ["IJAZAH_S1", /IJAZAH.*\bS1\b|\bS1\b|SARJANA|STRATA/i],
  ["TRANSKRIP", /TRANSKR?I?P|TRANSLITE/i],
  ["IJAZAH", /I[JZ]AZ?AH|I[JZ]ASAH|STTB|AKTA\s*[IV4]\b|AKTA\s*4/i],
  ["SKP", /SKP|RHK|PENGELOLAAN\s*KINERJA/i],
  ["PAK", /(^|[^A-Z])PAK([^A-Z]|$)|ANGKA\s*KREDIT/i],
  ["PKG", /PKG/i],
  ["PKKS", /PKKS/i],
  ["SERDIK", /SERDIK/i],
  ["SERTIFIKAT", /SERTI?FIKAT|DIKLAT|PELATIHAN|PEMBINAAN|WIDYASWARNA|NUPLAKSAKA|AKTEP|BIMBINGAN|PAKERTI|SELEKTIF|MANAJEMEN|KEPALA\s*SEKOLAH|EKG/i],
  ["KARPEG", /KARPEG|KARTU\s*PEGAWAI|KARTU\s*ASN/i],
  ["KARIS_KARSU", /KARIS|KARSU|KARTU\s*ISTRI|KARTU\s*SUAMI/i],
  ["KTP", /KTP/i],
  ["KARTU_KELUARGA", /(^|[^A-Z])KK([^A-Z]|$)|KARTU\s*KER?LUARGA/i],
  ["NPWP", /NPWP/i],
  ["BPJS", /BPJS/i],
  ["AKTA_NIKAH", /NIKAH/i],
  ["AKTA_KELAHIRAN", /AKTE?\s*LAHIR|AKTA\s*LAHIR|^AKT[EA]\b|^AKTE\s|^AKTA\s|AKTA\s*ANAK|AKTE\s*ANAK/i],
  ["FOTO", /FOTO|FHOTO|PHOTO/i],
  ["NIP_BARU", /NIP\s*BARU/i],
  ["REKENING", /REKENING/i],
];
const tally = {};
let matched = 0;
const unmatched = [];
for (const f of files) {
  const rel = f.path.slice(R.length);
  const seg = rel.split("/");
  if (seg.length < 3) continue;
  const name = seg[seg.length - 1];
  let kode = null;
  for (const [k, re] of rules) { if (re.test(name)) { kode = k; break; } }
  if (!kode) { kode = "DOKUMEN_LAINNYA"; unmatched.push(name); }
  else matched++;
  tally[kode] = (tally[kode] || 0) + 1;
}
console.log("Total:", files.length, "| terklasifikasi spesifik:", matched);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(18), v);
console.log("--- sisa tak terklasifikasi (unik):", new Set(unmatched).size);
[...new Set(unmatched)].slice(0, 40).forEach((x) => console.log(" ", x));
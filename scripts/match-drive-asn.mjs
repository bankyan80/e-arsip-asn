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

const files = JSON.parse(fs.readFileSync(root + "/drive-arsip-list.json", "utf8"));

function normSchool(s) {
  let x = (s || "").trim().toUpperCase();
  x = x.replace(/^\d+[.\s-]*/, ""); // "1. SDN 1 ASEM" -> "SDN 1 ASEM"
  x = x.replace(/\bSDN\b/g, "SD NEGERI");
  x = x.replace(/\bSD\s+NEGERI\b/g, "SD NEGERI");
  x = x.replace(/\bTKN\b/g, "TK NEGERI");
  x = x.replace(/\bTK\s+NEGERI\b/g, "TK NEGERI");
  x = x.replace(/\bTK\b(?!\s+NEGERI)/g, "TK");
  x = x.replace(/[^A-Z0-9]/g, "");
  return x;
}

function normName(s) {
  let x = (s || "").toUpperCase();
  x = x.replace(/-\d{8}T\d{6}Z(-\d+)+/g, ""); // timestamp suffix Google Drive
  x = x.replace(/_\d[\d\s.]+$/, ""); // suffix NIP dgn spasi/titik: _19950418 201903 2 011
  x = x.replace(/^\d+[.\s-]+/, ""); // prefix nomor: "1. ", "2. "
  x = x.replace(/^\d{4}_/, ""); // prefix tahun: "2026_"
  x = x.replace(/,\s*$/, "");
  x = x.replace(/_/g, "'"); // FATHIYYATUSSA_ADAH -> Fathiyyatussa'adah
  // strip gelar: bisa diawali spasi, koma, atau titik (mis. TANZILA.S.Pd, H. GUFRON)
  x = x.replace(/(^|[.,\s])+((H\.?)|(HJ\.?))?\s*((S\.PD\.?(SD|I|AUD)?)|(S\.PD\.?I\.?M\.?M)|(M\.PD\.?I?)|(M\.M)|(S\.SI)|(S\.AG)|(S\.KOM)|(S\.H\.?I?)|(S\.E)|(S\.H)|(S\.IP)|(A\.MA\.?PD)|(A\.MD)|(DRA)|(DRS?))\b/g, "");
  // strip gelar/panggilan di awal (H. / Hj. / Bpk / Ibu / Drs. / Dra.)
  x = x.replace(/^(H\.?|HJ\.?|BAPAK|IBU|DRS?\.?|DRA\.?)\s+/, "");
  // hapus apostrof (Sa'diyah vs Sadiyah)
  x = x.replace(/'/g, "");
  // Mohammad vs Mohamad -> sama
  x = x.replace(/\bMOHA?MM?AD\b/g, "MOHAMAD");
  x = x.replace(/[^A-Z0-9]/g, "");
  return x;
}

// hapus nama sekolah dari nama folder pegawai (mis. "SETIAWATI SDN 1 TUK KARANGSUWUNG")
function stripSchoolFromName(s, schoolNorm) {
  let x = (s || "").toUpperCase();
  const raws = rawSchoolByNorm[schoolNorm] || new Set();
  for (const raw of raws) {
    // bentuk mentah: "SDN 1 TUK KARANGSUWUNG" -> /SDN\s+1\s+TUK\s+KARANGSUWUNG/
    const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    x = x.replace(new RegExp(esc, "g"), "");
    // varian SDN <-> SD NEGERI, TKN <-> TK NEGERI
    const alt = raw
      .replace(/\bSDN\b/g, "SD NEGERI")
      .replace(/\bTKN\b/g, "TK NEGERI")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    x = x.replace(new RegExp(alt, "g"), "");
    // bentuk tanpa spasi
    x = x.replace(new RegExp(raw.replace(/[^A-Z0-9]/g, ""), "g"), "");
  }
  return x;
}

const asn = await sql("SELECT id, nip, nama, unit_kerja FROM asn ORDER BY unit_kerja, nama");
const dbBySchool = {};
for (const a of asn) {
  const k = normSchool(a.unit_kerja);
  if (!dbBySchool[k]) dbBySchool[k] = [];
  dbBySchool[k].push({ id: a.id, nip: a.nip, nama: a.nama, norm: normName(a.nama) });
}

const R = "DOKUMEN SIMPEG KECAMATAN LEMAHABANG/";
const driveGroups = {};
const rawSchoolByNorm = {}; // norm -> Set(nama mentah sekolah)
for (const f of files) {
  const rel = f.path.slice(R.length);
  const seg = rel.split("/");
  if (seg.length < 3) continue;
  const school = normSchool(seg[0]);
  if (!rawSchoolByNorm[school]) rawSchoolByNorm[school] = new Set();
  rawSchoolByNorm[school].add(seg[0].replace(/^\d+[.\s-]*/, ""));
  const person = seg[1];
  if (!driveGroups[school]) driveGroups[school] = {};
  if (!driveGroups[school][person]) driveGroups[school][person] = [];
  driveGroups[school][person].push(f);
}

// buat lookup normalized name di tiap sekolah
for (const school of Object.keys(driveGroups)) {
  const dbList = dbBySchool[school] || [];
  const normMap = new Map();
  for (const d of dbList) normMap.set(d.norm, d);
  for (const person of Object.keys(driveGroups[school])) {
    const pn = normName(stripSchoolFromName(person, school));
    const hit = normMap.get(pn);
    if (hit) {
      driveGroups[school][hit.nama] = driveGroups[school][person];
      if (hit.nama !== person) delete driveGroups[school][person];
    }
  }
}
// pass global: cocokkan sisa drive ke ASN mana pun (mungkin pindah sekolah)
const globalNormMap = new Map();
for (const school of Object.keys(dbBySchool)) {
  for (const d of dbBySchool[school]) globalNormMap.set(d.norm, d);
}

// report
const report = {
  sekolahDiDrive: Object.keys(driveGroups).length,
  sekolahDiDB: Object.keys(dbBySchool).length,
  kecocokanSekolah: [],
  asnMatched: [],
  asnUnmatchedDiDB: [],
  drivePersonUnmatched: [],
  fileOrphan: [],
  globalFallback: 0,
};

for (const school of Object.keys(driveGroups)) {
  for (const person of Object.keys(driveGroups[school])) {
    const pn = normName(stripSchoolFromName(person, school));
    const hit = globalNormMap.get(pn);
    if (hit) {
      driveGroups[school][hit.nama] = driveGroups[school][person];
      if (hit.nama !== person) delete driveGroups[school][person];
      report.globalFallback++;
    }
  }
}

const dbSchools = new Set(Object.keys(dbBySchool));
for (const school of Object.keys(driveGroups).sort()) {
  const dbList = dbBySchool[school] || [];
  const matched = dbList.filter((d) => driveGroups[school][d.nama]);
  report.kecocokanSekolah.push({ sekolah: school, diDrive: Object.keys(driveGroups[school]).length, diDB: dbList.length, matched: matched.length });
  for (const d of dbList) {
    const person = driveGroups[school][d.nama];
    if (person) {
      report.asnMatched.push({ nip: d.nip, nama: d.nama, sekolah: school, fileCount: person.length });
    } else {
      report.asnUnmatchedDiDB.push({ nip: d.nip, nama: d.nama, sekolah: school });
    }
  }
}
// drive persons not in DB (matched globally)
for (const school of Object.keys(driveGroups)) {
  for (const person of Object.keys(driveGroups[school])) {
    const pn = normName(stripSchoolFromName(person, school));
    const hit = globalNormMap.get(pn);
    if (!hit) {
      report.drivePersonUnmatched.push({ sekolah: school, nama: person, fileCount: driveGroups[school][person].length });
    }
  }
}

fs.writeFileSync(root + "/drive-match-report.json", JSON.stringify(report, null, 2));
console.log("Sekolah di Drive:", report.sekolahDiDrive, "| di DB:", report.sekolahDiDB);
console.log("ASN cocok:", report.asnMatched.length);
console.log("ASN di DB tanpa folder:", report.asnUnmatchedDiDB.length);
console.log("Folder ASN di Drive tanpa cocok DB:", report.drivePersonUnmatched.length);
console.log("Laporan: drive-match-report.json");
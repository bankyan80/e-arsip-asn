"use client";

import { useEffect, useState } from "react";
import { UserPlus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { Card, Button, Modal, Input, Select, Badge, formatDate } from "@/components/ui";

interface AdminUser {
  id: number;
  username: string;
  nama: string;
  role: string;
  unit_kerja: string | null;
  aktif: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface AsnNama {
  nama: string;
  unit_kerja: string | null;
  npsn: string | null;
}

export default function UsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [asnNames, setAsnNames] = useState<AsnNama[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<Partial<AdminUser> & { password?: string }>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [npsnHit, setNpsnHit] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<{ data: AdminUser[] }>("/api/users");
    setRows(data.data);
  }

  useEffect(() => {
    load();
    apiFetch<{ data: string[] }>("/api/asn/units")
      .then((d) => setUnits(d.data))
      .catch(() => {});
    apiFetch<{ data: AsnNama[] }>("/api/asn/nama")
      .then((d) => setAsnNames(d.data))
      .catch(() => {});
  }, []);

  // Cocokkan nama dengan data ASN; hasilkan patch form (unit kerja + password awal NPSN)
  function asnPatchFor(f: Partial<AdminUser> & { password?: string }): Partial<AdminUser> & { password?: string } {
    const v = (f.nama || "").trim();
    if (!v) return {};
    const hit = asnNames.find((n) => n.nama.toLowerCase() === v.toLowerCase());
    if (!hit) return {};
    const patch: Partial<AdminUser> & { password?: string } = {};
    if (f.role === "ADMIN SEKOLAH") {
      if (!f.unit_kerja && hit.unit_kerja) patch.unit_kerja = hit.unit_kerja;
      // Password awal = NPSN, hanya untuk akun baru yang belum mengisi password
      if (!f.id && !f.password && hit.npsn) patch.password = hit.npsn;
    }
    return patch;
  }

  function onNamaChange(v: string) {
    setForm((f) => {
      const next = { ...f, nama: v };
      return { ...next, ...asnPatchFor(next) };
    });
    const hit = asnNames.find((n) => n.nama.toLowerCase() === v.trim().toLowerCase());
    setNpsnHit(hit?.npsn ?? null);
  }

  function onRoleChange(role: string) {
    setForm((f) => {
      const next = { ...f, role };
      return { ...next, ...asnPatchFor(next) };
    });
  }

  // Saat daftar nama ASN selesai dimuat, terapkan ulang kecocokan untuk form yang sedang terbuka
  useEffect(() => {
    if (modal && asnNames.length) {
      setForm((f) => ({ ...f, ...asnPatchFor(f) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asnNames]);

  async function save() {
    setErr("");
    const isEdit = !!form.id;
    // Password awal Admin Sekolah otomatis memakai NPSN sekolahnya
    const password = form.password || (!isEdit && form.role === "ADMIN SEKOLAH" ? npsnHit || "" : "");

    // Validasi sisi klien agar kesalahan langsung terlihat
    if (!(form.username || "").trim()) return setErr("Username wajib diisi");
    if (!(form.nama || "").trim()) return setErr("Nama wajib diisi");
    if (form.role === "ADMIN SEKOLAH" && !(form.unit_kerja || "").trim())
      return setErr("Unit kerja sekolah wajib diisi untuk Admin Sekolah");
    if (!isEdit && !password) return setErr("Password wajib diisi");

    const body: any = { ...form, password: undefined };
    if (!isEdit && password) body.password = password;
    try {
      await apiFetch("/api/users", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      setMsg(isEdit ? "Admin diperbarui" : "Admin ditambahkan");
      setModal(null);
      load();
    } catch (e: any) {
      setErr(e.message || "Gagal menyimpan");
    }
  }

  async function remove(row: AdminUser) {
    if (!confirm(`Hapus admin ${row.username}?`)) return;
    await apiFetch("/api/users", { method: "DELETE", body: JSON.stringify({ id: row.id }) });
    setMsg("Admin dihapus");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Admin</h1>
          <p className="text-slate-500">Pengguna admin dan operator</p>
        </div>
        <Button onClick={() => { setForm({ role: "OPERATOR", aktif: true }); setModal("create"); }}>
          <UserPlus className="mr-1 h-4 w-4" /> Tambah Admin
        </Button>
      </div>

      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {err && <p className="text-sm text-rose-600">{err}</p>}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Terakhir Login</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{r.username}</td>
                <td className="px-4 py-3">{r.nama}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.role === "SUPER ADMIN" ? "red" : r.role === "ADMIN" ? "blue" : r.role === "ADMIN SEKOLAH" ? "indigo" : "gray"}>{r.role}</Badge>
                  {r.unit_kerja && <div className="mt-1 text-xs text-slate-500">{r.unit_kerja}</div>}
                </td>
                <td className="px-4 py-3"><Badge tone={r.aktif ? "green" : "gray"}>{r.aktif ? "Aktif" : "Nonaktif"}</Badge></td>
                <td className="px-4 py-3 text-xs">{formatDate(r.last_login_at)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm(r); setModal("edit"); }} className="mr-2 text-indigo-600 hover:underline"><Pencil className="inline h-4 w-4" /></button>
                  <button onClick={() => remove(r)} className="text-rose-600 hover:underline"><Trash2 className="inline h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "edit" ? "Edit Admin" : "Tambah Admin"}>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Username</label>
            <Input value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Nama</label>
            <Input
              list="daftar-nama-asn"
              value={form.nama || ""}
              onChange={(e) => onNamaChange(e.target.value)}
              placeholder="Ketik nama — pilih dari data ASN atau isi manual"
              autoComplete="off"
            />
            <datalist id="daftar-nama-asn">
              {asnNames.map((n) => (
                <option key={n.nama} value={n.nama} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Role</label>
            <Select value={form.role || ""} onChange={(e) => onRoleChange(e.target.value)}>
              <option value="SUPER ADMIN">SUPER ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OPERATOR">OPERATOR</option>
              <option value="ADMIN SEKOLAH">ADMIN SEKOLAH</option>
            </Select>
          </div>
          {form.role === "ADMIN SEKOLAH" && (
            <div>
              <label className="mb-1 block text-sm text-slate-600">Unit Kerja / Sekolah</label>
              <Input
                list="daftar-unit-kerja"
                value={form.unit_kerja || ""}
                onChange={(e) => setForm({ ...form, unit_kerja: e.target.value })}
                placeholder="Harus sama dengan unit kerja ASN"
              />
              <datalist id="daftar-unit-kerja">
                {units.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
              {!(form.unit_kerja || "").trim() && <p className="mt-1 text-xs text-rose-500">Wajib diisi untuk Admin Sekolah</p>}
              {npsnHit && <p className="mt-1 text-xs text-emerald-600">NPSN: {npsnHit}</p>}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Password{" "}
              {modal === "edit"
                ? "(kosongkan jika tidak diganti)"
                : form.role === "ADMIN SEKOLAH"
                  ? "(otomatis terisi NPSN sekolah)"
                  : ""}
            </label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={form.password || ""}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-[9px] text-slate-400 hover:text-slate-600"
                title={showPass ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModal(null)}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
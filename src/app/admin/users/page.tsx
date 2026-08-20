"use client";

import { useEffect, useState } from "react";
import { UserPlus, Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/fetch";
import { Card, Button, Modal, Input, Select, Badge, formatDate } from "@/components/ui";

interface AdminUser {
  id: number;
  username: string;
  nama: string;
  role: string;
  aktif: boolean;
  last_login_at: string | null;
  created_at: string;
}

export default function UsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<Partial<AdminUser> & { password?: string }>({});
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await apiFetch<{ data: AdminUser[] }>("/api/users");
    setRows(data.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const isEdit = !!form.id;
    const body: any = { ...form };
    if (!body.password) delete body.password;
    await apiFetch(isEdit ? "/api/users" : "/api/users", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    setMsg(isEdit ? "Admin diperbarui" : "Admin ditambahkan");
    setModal(null);
    load();
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
                <td className="px-4 py-3"><Badge tone={r.role === "SUPER ADMIN" ? "red" : r.role === "ADMIN" ? "blue" : "gray"}>{r.role}</Badge></td>
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
            <Input value={form.nama || ""} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Role</label>
            <Select value={form.role || ""} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="SUPER ADMIN">SUPER ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OPERATOR">OPERATOR</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Password {modal === "edit" ? "(kosongkan jika tidak diganti)" : ""}</label>
            <Input type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
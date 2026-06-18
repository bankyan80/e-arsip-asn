const BASE = 'https://e-arsip-asn.vercel.app';

async function main() {
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginType: 'NIP', identifier: '198001292025211035', password: 'admin456' })
  });
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookie = cookies.find(c => c.startsWith('session='));
  if (!sessionCookie) { console.error('No session cookie'); process.exit(1); }

  const res = await fetch(BASE + '/api/admin/pegawai/update-instansi', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie.split(';')[0] },
    body: JSON.stringify({ namaInstansi: 'Dinas Pendidikan Kabupaten Cirebon' })
  });
  console.log(await res.json());
}

main().catch(console.error);

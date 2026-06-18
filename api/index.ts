interface TestMod { name: string; ok: boolean; err?: string }
const results: TestMod[] = [];

async function testModules() {
  for (const name of ['express', 'multer', 'express-rate-limit', 'firebase-admin']) {
    try {
      await import(name);
      results.push({ name, ok: true });
    } catch (e: any) {
      results.push({ name, ok: false, err: e?.message || String(e) });
    }
  }
}

const p = testModules();

export default async function handler(_req: any, res: any) {
  await p;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ moduleTest: results }));
}

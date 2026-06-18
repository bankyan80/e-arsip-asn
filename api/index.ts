import { verifySession } from '../lib/session';

export default function handler(_req: any, res: any) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ session: typeof verifySession }));
}
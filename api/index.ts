import jwt from 'jsonwebtoken';

export default function handler(_req: any, res: any) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  const k = Object.keys(jwt).join(',');
  res.end(JSON.stringify({ jwt: 'ok', keys: k }));
}
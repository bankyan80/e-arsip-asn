import type { Request, Response } from 'express';
import { createApp } from '../server';

let app: any = null;

export default async function handler(req: Request, res: Response) {
  if (!app) {
    app = await createApp();
  }
  return new Promise<void>((resolve, reject) => {
    res.on('finish', resolve);
    res.on('error', reject);
    app(req, res);
  });
}

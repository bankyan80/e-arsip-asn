import serverless from 'serverless-http';
import { createApp } from '../server';

let handler: any;

export default async function (req: any, res: any) {
  if (!handler) {
    const app = await createApp();
    handler = serverless(app);
  }
  return handler(req, res);
}

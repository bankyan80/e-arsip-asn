import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

export default async function handler(_req: any, res: any) {
  const checks = {
    express: typeof express === 'function' ? 'ok' : 'wrong',
    multer: typeof multer === 'function' ? 'ok' : 'wrong',
    rateLimit: typeof rateLimit === 'function' ? 'ok' : 'wrong',
    jwt: typeof jwt === 'function' ? 'ok' : 'wrong',
  };
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ checks }));
}
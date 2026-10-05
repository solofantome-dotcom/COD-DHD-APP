import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response } from 'express';
import { serverApp } from './src/serverApp.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    serverApp.use(vite.middlewares);
  } else {
    serverApp.use(express.static(path.resolve(__dirname, 'dist')));
    serverApp.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  serverApp.listen(PORT, '0.0.0.0', () => {
    console.log(`[DHD Analytics COD] Server running on port ${PORT}`);
  });
}

startServer();

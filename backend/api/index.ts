// Entry point para Vercel Serverless Functions.
// O Vercel detecta arquivos em /api e os transforma em handlers.
// Express é compatível: app(req, res) funciona como handler.
import app from '../src/app';

export default app;

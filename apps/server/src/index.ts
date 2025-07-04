import { createApp } from './app';
import Debug from 'debug';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load correct .env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const debug = Debug('potluck-api');

// Fallback to 3000 if PORT is not set
const PORT = process.env.PORT || 3000;

const app = createApp();

app.listen(PORT, () => {
  debug(`🚀 API running on port :${PORT}`);
  console.log(`✅ API server is up on http://localhost:${PORT}`);
});

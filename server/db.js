import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getDataFile() {
  return process.env.DATA_FILE || path.join(__dirname, 'data', 'app-data.json');
}

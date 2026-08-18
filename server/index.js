import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDataStore } from './persistence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFile = path.join(__dirname, 'data', 'app-data.json');

const store = createDataStore(process.env.DATA_FILE || defaultFile);

export { store };
export default store;

export async function bootstrap() {
  return store;
}

// Іске қосу: node server/index.js  →  http://localhost:3000
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;
const { server } = createApp({ dbPath: process.env.KT_DB || undefined });
server.listen(PORT, () => {
  console.log(`KitapTracker іске қосылды: http://localhost:${PORT}`);
  console.log('Демо: «Демо оқушы» / «Демо мұғалім» батырмалары кіру бетінде.');
});

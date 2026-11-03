// Production API entry point: validate configuration, connect to MySQL, start Express, and close cleanly on shutdown.
import { createApp } from './app.js';
import { config } from './config.js';
import { db } from './db.js';
await db.$connect();
const server=createApp().listen(config.port,()=>console.log(`Gulsaga API listening on port ${config.port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await db.$disconnect();process.exit(0)}));

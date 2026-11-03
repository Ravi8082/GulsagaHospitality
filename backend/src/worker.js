// Background worker sends pending mail and periodically removes expired verification/reset records.
import { processOutbox } from './email.js';
import { db } from './db.js';
let running=true;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{running=false});
while(running){try{await processOutbox();await db.otpVerification.deleteMany({where:{createdAt:{lt:new Date(Date.now()-86400000)}}});await db.passwordReset.deleteMany({where:{expiresAt:{lt:new Date(Date.now()-86400000)}}})}catch{console.error(JSON.stringify({event:'outbox_iteration_failed'}))}await new Promise(resolve=>setTimeout(resolve,10000))}await db.$disconnect();

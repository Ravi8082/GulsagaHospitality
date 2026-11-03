// One-time initial super-admin setup; refuses to run after any administrator already exists.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { email,password } from './validation.js';
if(await db.adminUser.count())throw new Error('Initial bootstrap is disabled because an administrator exists.');
const address=email.parse(process.env.BOOTSTRAP_EMAIL),secret=password.parse(process.env.BOOTSTRAP_PASSWORD);
await db.adminUser.create({data:{email:address,passwordHash:await bcrypt.hash(secret,12),name:process.env.BOOTSTRAP_NAME||'Site Administrator',role:'SUPER_ADMIN',permissions:[]}});
console.log('Initial administrator created. Remove bootstrap environment variables.');await db.$disconnect();

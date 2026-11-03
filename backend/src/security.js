// Shared cryptographic, authorization, validation-error, and spreadsheet-safety helpers.
import crypto from 'node:crypto';
export function hash(value,key){return crypto.createHmac('sha256',String(key)).update(String(value)).digest('hex');}
export function makeOtp(){return crypto.randomInt(0,1000000).toString().padStart(6,'0');}
export function token(){return crypto.randomBytes(32).toString('hex');}
export function equal(a,b){const x=Buffer.from(String(a ?? ''));const y=Buffer.from(String(b ?? ''));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
export function can(user,permission){if(user?.enabled!==true||typeof permission!=='string'||!permission)return false;if(user.role==='SUPER_ADMIN')return true;return user.role==='ADMIN'&&!['admins','settings','audit'].includes(permission)&&Array.isArray(user.permissions)&&user.permissions.includes(permission);}
export function fail(status,message){const e=new Error(message);e.status=status;return e;}
export function validOtp(row,now=new Date()){if(!row||typeof row!=='object')return false;if(row.consumed===true||row.verified===true)return false;const attempts=row.attempts;if(!Number.isInteger(attempts)||attempts<0||attempts>=5)return false;const expiresAt=row.expiresAt instanceof Date?row.expiresAt:new Date(row.expiresAt);if(!Number.isFinite(expiresAt.getTime())||expiresAt.getTime()<=now.getTime())return false;return true;}
export function safeCell(value){const text=value==null?'':typeof value==='string'?value:String(value);return /^[\s]*[=+\-@\t\r]/.test(text)?"'"+text:text;}

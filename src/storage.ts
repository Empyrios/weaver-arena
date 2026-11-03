import { Data } from './model.js';
const DB = 'weaver-arena-content';
let connection: Promise<IDBDatabase> | null = null;
function database(): Promise<IDBDatabase> { return connection ??= new Promise((resolve, reject) => { const request = indexedDB.open(DB, 1); request.onupgradeneeded = () => request.result.createObjectStore('content'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
export async function loadContent(): Promise<Data | null> { const db = await database(); return new Promise((resolve, reject) => { const request = db.transaction('content', 'readonly').objectStore('content').get('arena'); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); }); }
export async function saveContent(data: Data): Promise<void> { const db = await database(); return new Promise((resolve, reject) => { const tx = db.transaction('content', 'readwrite'); tx.objectStore('content').put(data, 'arena'); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || Error('Save aborted')); tx.onerror = () => reject(tx.error); }); }

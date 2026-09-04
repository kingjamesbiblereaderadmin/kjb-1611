// IndexedDB-based Bible data caching for offline access
// Supports much larger storage than localStorage (~50MB+)

const DB_NAME = 'BibleReaderDB';
const DB_VERSION = 1;
const STORE_NAME = 'bibleData';
const CACHE_KEY = 'pce_text_v4_single_file_crlf';

let dbInstance = null;
let openRequest = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (openRequest) return openRequest;

  openRequest = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      openRequest = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      // If the connection is closed or version-changed (e.g. after the user
      // clears storage / unregisters the SW in Chrome), drop the cached handle
      // so the next call opens a fresh connection instead of using a dead one.
      dbInstance.onclose = () => { dbInstance = null; openRequest = null; };
      dbInstance.onversionchange = () => { try { dbInstance.close(); } catch {} dbInstance = null; openRequest = null; };
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });

  return openRequest;
}

export async function saveToIndexedDB(data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key: CACHE_KEY, value: data });

      request.onsuccess = () => {
        console.log('IndexedDB: Saved Bible data successfully');
        resolve(true);
      };

      request.onerror = () => {
        console.error('IndexedDB save error:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB save failed:', error);
    return false;
  }
}

export async function loadFromIndexedDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);

      request.onsuccess = () => {
        if (request.result) {
          console.log('IndexedDB: Loaded Bible data from cache');
          resolve(request.result.value);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('IndexedDB load error:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB load failed:', error);
    return null;
  }
}

export async function clearIndexedDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(CACHE_KEY);

      request.onsuccess = () => {
        console.log('IndexedDB: Cleared Bible cache');
        resolve(true);
      };

      request.onerror = () => {
        console.error('IndexedDB clear error:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('IndexedDB clear failed:', error);
    return false;
  }
}

export async function isIndexedDBAvailable() {
  if (typeof indexedDB === 'undefined') return false;
  try {
    await openDB();
    return true;
  } catch {
    return false;
  }
}
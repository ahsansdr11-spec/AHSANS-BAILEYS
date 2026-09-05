import { readFile, rename, stat, unlink, writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import { DEFAULT_CACHE_TTLS } from '../Defaults/index.js';
import { proto } from '../../WAProto/index.js';
import { initAuthCreds } from './auth-utils.js';
import { BufferJSON } from './generics.js';
import { LRUCache } from 'lru-cache';
import { Mutex } from 'async-mutex';
// [Ported from @itsliaaa/baileys (MIT)] Lia@Changes 25-03-26 --- Add useSingleFileAuthState with integrated cache
const FLUSH_TIMEOUT_MS = 3000;
// [Ported from @itsliaaa/baileys (MIT)] Lia@Changes 22-04-26 --- Enhanced useSingleFileAuthState with LRUCache
export const useSingleFileAuthState = async (fileName, options = {}) => {
    const logger = options.logger;
    const cache = new LRUCache({
        max: 20000,
        ttl: 1000 * DEFAULT_CACHE_TTLS.SIGNAL_STORE,
        updateAgeOnGet: false,
        updateAgeOnHas: false,
        ttlAutopurge: true
    });
    // [Ported from @itsliaaa/baileys (MIT)] Lia@Changes 26-04-26 --- Add mutex for prevent race condition
    const mutex = new Mutex();
    let fileData = {};
    let isLoaded = false;
    let flushTimeout = null;
    let pendingFlush = null; // resolves when the debounced write actually hits the disk
    let disposed = false;
    const doFlush = async () => {
        // Atomic write with a unique temp name: a SIGKILL / container kill can
        // never leave a half-written (corrupted) session file behind.
        const tempPath = `${fileName}.${process.pid}.${randomBytes(4).toString('hex')}.temp`;
        await writeFile(tempPath, JSON.stringify(fileData, BufferJSON.replacer));
        await rename(tempPath, fileName);
    };
    const loadKey = async () => {
        return await mutex.runExclusive(async () => {
            if (isLoaded)
                return;
            try {
                const data = JSON.parse(await readFile(fileName, 'utf-8'), BufferJSON.reviver);
                fileData = data || {};
                for (const [keyName, value] of Object.entries(fileData)) {
                    cache.set(keyName, value);
                }
            }
            catch {
                fileData = {};
            }
            isLoaded = true;
        });
    };
    const flushKey = () => {
        if (disposed) {
            return;
        }
        if (flushTimeout)
            return;
        let resolveFlush;
        pendingFlush = new Promise(resolve => { resolveFlush = resolve; });
        flushTimeout = setTimeout(async () => {
            flushTimeout = null;
            await mutex.runExclusive(async () => {
                try {
                    await doFlush();
                }
                catch (error) {
                    // A failed session write must never be silent — the old behavior
                    // swallowed every error, losing creds with zero trace.
                    logger?.warn?.({ err: error, file: fileName }, 'failed to flush single-file auth state');
                }
                finally {
                    resolveFlush?.();
                    if (pendingFlush) {
                        const p = pendingFlush;
                        pendingFlush = null;
                        // keep a resolved handle so close() can await it
                        pendingFlush = Promise.resolve(p).catch(() => { });
                    }
                }
            });
        }, FLUSH_TIMEOUT_MS);
    };
    /**
     * Force-write any pending changes to disk immediately.
     * Call this on SIGTERM/SIGINT (Pterodactyl Stop/Restart) to avoid losing
     * up to FLUSH_TIMEOUT_MS of session updates.
     */
    const flush = async () => {
        if (flushTimeout) {
            clearTimeout(flushTimeout);
            flushTimeout = null;
        }
        await mutex.runExclusive(async () => {
            try {
                await doFlush();
            }
            finally {
                pendingFlush = null;
            }
        });
    };
    /**
     * Flush pending writes and stop the debounced timer.
     * The auth state can no longer be used afterwards.
     */
    const close = async () => {
        disposed = true;
        await flush();
    };
    const writeKey = (keyName, value) => {
        cache.set(keyName, value);
        fileData[keyName] = value;
        flushKey();
    };
    const removeKey = (keyName) => {
        cache.delete(keyName);
        delete fileData[keyName];
        flushKey();
    };
    const fileInfo = await stat(fileName).catch(() => null);
    if (!fileInfo) {
        await writeFile(fileName, '{}');
    }
    else if (!fileInfo.isFile()) {
        throw new Error(`found something that is not a file at ${fileName}, either delete it or specify a different location`);
    }
    await loadKey();
    const creds = fileData['creds'] || initAuthCreds();
    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const keyName = type + id;
                        let value = cache.get(keyName);
                        if (value === undefined && fileData[keyName] !== undefined) {
                            value = fileData[keyName];
                            cache.set(keyName, value);
                        }
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }
                    return data;
                },
                set: (data) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const keyName = category + id;
                            const value = data[category][id];
                            value ? writeKey(keyName, value) : removeKey(keyName);
                        }
                    }
                }
            }
        },
        saveCreds: () => writeKey('creds', creds),
        /** immediately persist all pending writes (safe to call multiple times) */
        flush,
        /** flush + stop the debounce timer; the state should not be used after this */
        close
    };
};
//# sourceMappingURL=use-single-file-auth-state.js.map

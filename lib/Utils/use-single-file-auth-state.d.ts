import type { AuthenticationState } from '../Types/index.js';
/**
 * stores the full authentication state in a single file with an in-memory LRU cache,
 * a mutex to serialize writes, and atomic (temp-file + rename) persistence.
 *
 * @param fileName path of the file that will hold the auth state
 * @param options optional configuration ({@see SingleFileAuthStateOptions})
 */
export declare const useSingleFileAuthState: (fileName: string, options?: SingleFileAuthStateOptions) => Promise<{
    state: AuthenticationState;
    saveCreds: () => void;
    /** immediately persist all pending writes to disk (atomic); safe to call multiple times */
    flush: () => Promise<void>;
    /** flush + stop the debounce timer; the returned state should not be used afterwards */
    close: () => Promise<void>;
}>;
export interface SingleFileAuthStateOptions {
    /** pino-style logger; write failures are reported here instead of being swallowed */
    logger?: {
        warn?: (obj: unknown, msg: string) => void;
        [key: string]: unknown;
    };
}
//# sourceMappingURL=use-single-file-auth-state.d.ts.map

import type { Boom } from '@hapi/boom';
import type { WASocket } from '../index.js';
import type { UserFacingSocketConfig } from '../Types/index.js';
/** Disconnect status codes that are never retried by default (auth/account level). */
export declare const FATAL_DISCONNECT_CODES: Set<number>;
export interface DisconnectInfo {
    /** the raw close error (usually a Boom with a DisconnectReason status code) */
    error: Boom | Error | undefined;
    /** status code extracted from the error, if any */
    statusCode: number | undefined;
    /** consecutive reconnect attempt number this close happened on */
    attempt: number;
}
export interface ReconnectManagerOptions {
    /** socket factory — usually `(cfg) => makeWASocket(cfg)` */
    makeSocket: (config?: UserFacingSocketConfig) => WASocket;
    /** config for every socket creation; a function receives the attempt number */
    config?: UserFacingSocketConfig | ((attempt: number) => UserFacingSocketConfig);
    /** pino-style logger */
    logger?: Record<string, unknown> & {
        debug?: (...args: any[]) => void;
        info?: (...args: any[]) => void;
        warn?: (...args: any[]) => void;
        error?: (...args: any[]) => void;
    };
    /** first backoff delay in ms (default 1000) */
    initialDelayMs?: number;
    /** hard cap for the backoff delay in ms (default 60000) */
    maxDelayMs?: number;
    /** exponential growth factor (default 2) */
    factor?: number;
    /** full jitter to avoid reconnect storms (default true) */
    jitter?: boolean;
    /** give up after N consecutive failed attempts (default: never) */
    maxAttempts?: number;
    /**
     * custom reconnect decision. Return false to stop the loop.
     * When provided it fully replaces the default fatal-code classification.
     */
    shouldReconnect?: (info: DisconnectInfo) => boolean | Promise<boolean>;
    /** called with every newly created socket — (re)bind your event listeners here */
    onSocket?: (socket: WASocket) => void;
    /** called when a socket reports `connection: open` (backoff counter resets) */
    onOpen?: (socket: WASocket) => void;
    /** called on every close, before the reconnect decision */
    onDisconnect?: (info: DisconnectInfo & {
        socket: WASocket | null;
    }) => void;
    /** called when the manager stops retrying (fatal error / max attempts / shouldReconnect false) */
    onGiveUp?: (info: {
        error: Boom | Error | undefined;
        attempt: number;
        reason: string;
    }) => void;
    /**
     * process signals that stop the reconnect loop (e.g. `['SIGTERM', 'SIGINT']`
     * for Pterodactyl Stop/Restart). Default: `[]` (no global handlers installed).
     */
    shutdownSignals?: NodeJS.Signals[];
}
export interface ReconnectManager {
    /** current socket (may be null before start / after give-up) */
    readonly socket: WASocket | null;
    /** true while the manager is allowed to reconnect */
    readonly running: boolean;
    /** consecutive reconnect attempts since the last successful open */
    readonly attempts: number;
    /** true if a reconnect is scheduled */
    readonly isReconnecting: boolean;
    /** ms since the current socket was created */
    readonly uptimeMs: number;
    /** create the first socket and start handling disconnects */
    start(config?: UserFacingSocketConfig): Promise<WASocket>;
    /**
     * stop the reconnect loop and cancel any pending reconnect timer.
     * The socket is not closed unless `closeSocket: true`.
     */
    stop(reason?: string, opts?: {
        closeSocket?: boolean;
    }): void;
}
/**
 * Opt-in reconnect manager for long-running (Pterodactyl / container) bots:
 * single-flight, exponential backoff with jitter + hard cap, fatal-auth aware,
 * shutdown-aware.
 */
export declare const createReconnectManager: (options: ReconnectManagerOptions) => ReconnectManager;
/** Extracts a numeric disconnect status code from a connection.close error. */
export declare const getDisconnectStatusCode: (error: unknown) => number | undefined;
//# sourceMappingURL=reconnect-manager.d.ts.map

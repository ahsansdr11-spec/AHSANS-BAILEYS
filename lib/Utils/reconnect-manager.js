import { Boom } from '@hapi/boom';
import { DisconnectReason } from '../Types/index.js';
/**
 * Default reconnect classification.
 *
 * Fatal (auth/account-level) disconnects are NOT retried — retrying them just
 * hammers the server and can get an account banned. Everything else is treated
 * as transient and retried with exponential backoff.
 */
export const FATAL_DISCONNECT_CODES = new Set([
    DisconnectReason.loggedOut,
    DisconnectReason.forbidden,
    DisconnectReason.multideviceMismatch,
    DisconnectReason.connectionReplaced
]);
const DEFAULTS = {
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    factor: 2,
    jitter: true,
    maxAttempts: Infinity,
    shouldReconnect: undefined,
    shutdownSignals: []
};
/**
 * Clamp + delay helper. Keeps the delay inside sane bounds and never returns
 * something that could overflow.
 */
const computeBackoff = (attempt, { initialDelayMs, maxDelayMs, factor, jitter }) => {
    const raw = initialDelayMs * Math.pow(factor, Math.max(0, attempt - 1));
    const capped = Math.min(Number.isFinite(raw) ? raw : maxDelayMs, maxDelayMs);
    if (!jitter) {
        return Math.max(0, Math.round(capped));
    }
    // full jitter: uniform in [0, capped] — best practice to avoid reconnect storms
    // when many containers restart at the same time (e.g. Pterodactyl node reboot)
    return Math.max(0, Math.round(Math.random() * capped));
};
/**
 * Extracts a numeric disconnect status code from a `connection.update` close error.
 */
export const getDisconnectStatusCode = (error) => {
    if (error instanceof Boom) {
        return error.output?.statusCode;
    }
    return error?.output?.statusCode ?? (typeof error?.statusCode === 'number' ? error.statusCode : undefined);
};
/**
 * Opt-in reconnect manager for long-running (Pterodactyl / container) bots.
 *
 * Baileys itself never auto-reconnects — every `connection.update` close expects
 * the caller to build a NEW socket. This helper automates that pattern safely:
 *
 * - never creates two sockets at once (single-flight reconnect loop)
 * - exponential backoff with full jitter and a hard delay cap (no reconnect storms)
 * - fatal auth errors (logged out / banned / connection replaced) stop the loop
 * - `stop()` cancels any pending reconnect — call it on SIGTERM/SIGINT so a
 *   container shutdown never triggers a forced reconnect
 * - each new socket is handed to `onSocket()` so you can (re)bind your listeners
 *
 * @example
 * const conn = createReconnectManager({
 *     makeSocket: cfg => makeWASocket(cfg),
 *     config: { auth: state, ... },
 *     onSocket: sock => { sock.ev.on('messages.upsert', handler); },
 *     shutdownSignals: ['SIGTERM', 'SIGINT'] // Pterodactyl Stop/Restart
 * });
 * await conn.start();
 */
export const createReconnectManager = (options) => {
    const opts = { ...DEFAULTS, ...options };
    const { makeSocket, logger } = opts;
    if (typeof makeSocket !== 'function') {
        throw new TypeError('createReconnectManager: makeSocket(options.config) factory is required');
    }
    let socket = null;
    let attempts = 0;
    let reconnectTimer = null;
    let stopped = true;
    let connecting = false;
    let stopping = false;
    let stoppingReason;
    let startedAt;
    const signalHandlers = new Map();
    const log = (level, msg, data) => {
        try {
            logger?.[level]?.(data, msg);
        }
        catch { }
    };
    const clearTimer = () => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };
    const removeSignalHandlers = () => {
        for (const [signal, handler] of signalHandlers) {
            process.off(signal, handler);
        }
        signalHandlers.clear();
    };
    const installSignalHandlers = () => {
        removeSignalHandlers();
        for (const signal of opts.shutdownSignals) {
            const handler = () => {
                stop(`received ${signal}`);
            };
            process.on(signal, handler);
            signalHandlers.set(signal, handler);
        }
    };
    const spawnSocket = async (connectConfig) => {
        if (connecting) {
            return socket;
        }
        connecting = true;
        try {
            const next = makeSocket(connectConfig);
            if (!next?.ev?.on) {
                throw new TypeError('makeSocket did not return a Baileys socket');
            }
            socket = next;
            startedAt = Date.now();
            next.ev.on('connection.update', (update) => {
                if (update.connection === 'open') {
                    attempts = 0;
                    opts.onOpen?.(next);
                }
                else if (update.connection === 'close') {
                    const error = update.lastDisconnect?.error;
                    void handleClose(error);
                }
            });
            opts.onSocket?.(next);
            return next;
        }
        finally {
            connecting = false;
        }
    };
    const handleClose = async (error) => {
        opts.onDisconnect?.({ error, socket, attempt: attempts + 1 });
        if (stopping) {
            log('debug', 'reconnect suppressed during shutdown', { reason: stoppingReason });
            return;
        }
        const statusCode = getDisconnectStatusCode(error);
        if (typeof opts.shouldReconnect === 'function') {
            let decision;
            try {
                decision = await opts.shouldReconnect({ error, statusCode, attempt: attempts + 1 });
            }
            catch (decisionError) {
                log('error', 'shouldReconnect threw, treating as reconnect', decisionError);
                decision = true;
            }
            if (!decision) {
                stopped = true;
                removeSignalHandlers();
                opts.onGiveUp?.({ error, attempt: attempts, reason: 'shouldReconnect returned false' });
                return;
            }
        }
        else if (typeof statusCode === 'number' && FATAL_DISCONNECT_CODES.has(statusCode)) {
            stopped = true;
            removeSignalHandlers();
            log('warn', 'fatal disconnect, not reconnecting', { statusCode });
            opts.onGiveUp?.({ error, attempt: attempts, reason: `fatal disconnect code ${statusCode}` });
            return;
        }
        attempts += 1;
        if (attempts > opts.maxAttempts) {
            stopped = true;
            removeSignalHandlers();
            opts.onGiveUp?.({ error, attempt: attempts, reason: 'maxAttempts exceeded' });
            return;
        }
        const delay = computeBackoff(attempts, opts);
        log('info', 'scheduling reconnect', { attempt: attempts, delayMs: delay, statusCode });
        clearTimer();
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (stopping || stopped) {
                return;
            }
            spawnSocket(typeof opts.config === 'function' ? opts.config(attempts) : opts.config)
                .catch(err => {
                log('error', 'failed to create socket', err);
                // factory failure (bad auth file etc.) — back off and try again
                void handleClose(err instanceof Boom ? err : new Boom(err?.message || 'socket creation failed'));
            });
        }, delay);
    };
    return {
        /** current socket (may be null before start / after give-up) */
        get socket() {
            return socket;
        },
        /** true while the manager is allowed to reconnect */
        get running() {
            return !stopped;
        },
        /** consecutive reconnect attempts since the last successful open */
        get attempts() {
            return attempts;
        },
        /** true if a reconnect is scheduled */
        get isReconnecting() {
            return reconnectTimer !== null;
        },
        get uptimeMs() {
            return socket && startedAt ? Date.now() - startedAt : 0;
        },
        /**
         * create the first socket and start handling disconnects.
         * @param config optional per-start config override
         */
        start: async (config) => {
            stopped = false;
            stopping = false;
            stoppingReason = undefined;
            attempts = 0;
            installSignalHandlers();
            const connectConfig = config
                ?? (typeof opts.config === 'function' ? opts.config(0) : opts.config);
            return spawnSocket(connectConfig);
        },
        /**
         * stop the reconnect loop and cancel any pending reconnect timer.
         * The current socket is NOT closed automatically — close it yourself
         * (or pass `{ closeSocket: true }`) after flushing your state, then let
         * the process exit.
         */
        stop: (reason, { closeSocket = false } = {}) => {
            stopping = true;
            stoppingReason = reason || 'stopped';
            stopped = true;
            clearTimer();
            removeSignalHandlers();
            if (closeSocket && socket?.end) {
                try {
                    void socket.end(new Boom('Intentional Shutdown', { statusCode: DisconnectReason.connectionClosed, data: { reason: stoppingReason } }));
                }
                catch { }
            }
        }
    };
};
//# sourceMappingURL=reconnect-manager.js.map

import { EventEmitter } from "node:events";
import type { CallState, CallOptions } from "./types.js";
export { CallState } from "./types.js";
export type { AudioConfig, CallEvents, CallOptions, VoipSdkConfig } from "./types.js";
/**
 * A single ongoing WhatsApp voice call.
 *
 * Events (via `CallEvents`): `ringing`, `connected`, `audio`, `ended`, `error`.
 */
export declare class ActiveCall extends EventEmitter {
    callId: string;
    /** current WASM call state (@see CallState) */
    get state(): CallState;
    /** true once end()/forceEnd ran */
    get ended(): boolean;
    /** source label for the uplink audio ("silence", a file path, "lavfi:...") */
    _audioSource: string;
    /** @internal */
    constructor(callId: string, engine: unknown, durationMs: number);
    /** hang up the call (idempotent) */
    end: () => void;
    /** mute/unmute the uplink */
    mute: (muted: boolean) => void;
    /** promise that resolves with the end reason */
    waitForEnd: () => Promise<string>;
    /** @internal */
    _updateState: (state: number) => void;
    /** @internal */
    _emitAudio: (pcm: Float32Array) => void;
    /** @internal */
    _forceEnd: (reason: string) => void;
}
/**
 * WhatsApp voice-call engine (WebRTC relay + WASM signaling).
 *
 * Requires the optional peer dependency `@roamhq/wrtc`; features that need it
 * throw a clear error when it is not installed.
 */
export declare class VoipClient {
    /** @internal */
    #private;
    constructor(config?: {
        /** optional path to WASM/resources overrides */
        resourcesPath?: string;
        [key: string]: unknown;
    });
    /** attach to a connected Baileys socket and initialize the VoIP stack */
    connectWithSocket: (existingSock: {
        ws: import("node:events").EventEmitter & {
            off?: (event: string, listener: (...args: any[]) => void) => void;
        };
        authState: {
            creds: {
                me?: {
                    id?: string;
                    lid?: string;
                };
            };
        };
        presenceSubscribe?: (jid: string) => Promise<unknown>;
    }) => Promise<void>;
    /** place a call to a phone number (digits) */
    call: (phoneNumber: string, opts?: Partial<CallOptions> & {
        audioSource?: string;
        durationMs?: number;
    }) => Promise<ActiveCall>;
    /**
     * tear everything down: active call, audio feeder, relay connections,
     * WASM engine, and the listeners attached to the socket
     */
    disconnect: () => void;
}
//# sourceMappingURL=index.d.ts.map

/**
 * Type declarations for the NIXCODE interactive/AI-rich message builder
 * (runtime: lib/Modded/message_builder.js).
 *
 * Builders are chainable; `build()` returns the raw WA message content and
 * `send()` relays it through the socket.
 */
export declare const VERSION: string;
export interface BuilderSendOptions {
    [key: string]: unknown;
}
export interface BuiltMessage {
    message: Record<string, unknown>;
    messageId: string;
}
/** Static media/parse helpers used by the builders. */
export declare class Toolkit {
    static extractIE(text: string, opts?: {
        extract?: boolean;
        hyperlink?: boolean;
        citation?: boolean;
        latex?: boolean;
    }): {
        text: string;
        ie: unknown[];
        inline_entities: unknown[];
    };
    static resize(buffer: Buffer, x: number, y: number, fit?: string): Promise<Buffer>;
    static waitAllPromises<T>(input: Array<T | Promise<T>>): Promise<T[]>;
    static fetchBuffer(url: string, options?: Record<string, unknown>, extra?: {
        silent?: boolean;
    }): Promise<Buffer>;
    static toUrl(client: unknown, path: string, mediaType?: string): Promise<string>;
    static resolveMedia(client: unknown, media: unknown, mediaType?: string, opts?: {
        resolveUrl?: boolean;
        resolveWAUrl?: boolean;
        result?: string;
        resize?: boolean;
        width?: number;
        height?: number;
    }): Promise<unknown>;
    static getMp4Duration(buffer: Buffer, opts?: {
        silent?: boolean;
    }): number;
    static getMp4Preview(videoBuffer: Buffer, opts?: {
        time?: number;
        result?: string;
        resize?: boolean;
        width?: number;
        height?: number;
        silent?: boolean;
    }): Promise<Buffer | string>;
}
/** Chainable row helper for selection lists. */
export declare class RowBuilder {
    buttons: unknown[];
    button(displayText: string, buttonId: string): this;
}
/** Chainable card helper for carousels. */
export declare class CardBuilder {
    constructor(client: unknown);
    image(url: string): this;
    title(t: string): this;
    text(t: string): this;
    button(displayText: string, id: string): this;
}
declare abstract class BaseBuilder {
    constructor();
    setTitle(title: string): this;
    setSubtitle(subtitle: string): this;
    setBody(body: string): this;
    setFooter(footer: string): this;
    setContextInfo(obj: Record<string, unknown>): this;
    addPayload(obj: Record<string, unknown>): this;
    text(t: string): this;
    footer(f: string): this;
    title(t: string): this;
    subtitle(s: string): this;
    image(url: string, opts?: Record<string, unknown>): this;
}
/**
 * Interactive native-flow message builder (buttons, selections, calls, copy…).
 * `new Button(sock)` then chain and finish with `send(jid)`.
 */
export declare class Button extends BaseBuilder {
    constructor(client: unknown);
    setVideo(path: string, options?: Record<string, unknown>): Promise<this>;
    setImage(path: string, options?: Record<string, unknown>): Promise<this>;
    setDocument(path: string, options?: Record<string, unknown>): Promise<this>;
    setMedia(obj: Record<string, unknown>): this;
    clearButtons(): this;
    setParams(obj: Record<string, unknown>): this;
    addButton(name: string, params: Record<string, unknown>): this;
    makeRow(header?: string, title?: string, description?: string, id?: string): this;
    makeSection(title?: string, highlight_label?: string): this;
    addSelection(title: string, options?: Record<string, unknown>): this;
    addReply(display_text?: string, id?: string, options?: Record<string, unknown>): this;
    addCall(display_text?: string, id?: string, options?: Record<string, unknown>): this;
    addReminder(display_text?: string, id?: string, options?: Record<string, unknown>): this;
    addCancelReminder(display_text?: string, id?: string, options?: Record<string, unknown>): this;
    addAddress(display_text?: string, id?: string, options?: Record<string, unknown>): this;
    addLocation(options?: Record<string, unknown>): this;
    addUrl(display_text?: string, url?: string, webview_interaction?: boolean, options?: Record<string, unknown>): this;
    addCopy(display_text?: string, copy_code?: string, options?: Record<string, unknown>): this;
    button(displayText: string, id: string): this;
    build(jid: string, options?: BuilderSendOptions): Promise<Record<string, unknown>>;
    send(jid: string, options?: BuilderSendOptions): Promise<BuiltMessage>;
}
/** Interactive message builder (interactiveMessage proto, v2 buttons). */
export declare class ButtonV2 extends BaseBuilder {
    constructor(client: unknown);
    addButton(displayText?: string, buttonId?: string): this;
    addRawButton(obj: Record<string, unknown>): this;
    setThumbnail(path: string): Promise<this>;
    setMedia(obj: Record<string, unknown>): this;
    button(displayText: string, id: string): this;
    row(cb: (r: RowBuilder) => void): this;
    build(jid: string, options?: BuilderSendOptions): Promise<Record<string, unknown>>;
    send(jid: string, options?: BuilderSendOptions): Promise<BuiltMessage>;
}
/** Carousel (multi-card interactive) message builder. */
export declare class Carousel extends BaseBuilder {
    constructor(client: unknown);
    addCard(card: CardBuilder | Record<string, unknown>): this;
    card(cb: (cbObj: CardBuilder) => void): this;
    build(jid: string, options?: BuilderSendOptions): Promise<Record<string, unknown>>;
    send(jid: string, options?: BuilderSendOptions): Promise<BuiltMessage>;
}
/**
 * AI rich response builder (ORich/AIRich) — text with inline entities,
 * citations, code, tables, sources, reels, images, videos, products.
 */
export declare class AIRich extends BaseBuilder {
    constructor(client: unknown);
    addSubmessage(submessage: unknown): this;
    addSection(section: Record<string, unknown>): this;
    addText(text: string, opts?: {
        hyperlink?: boolean;
        citation?: boolean;
        latex?: boolean;
    }): this;
    addCode(language: string, code: string): this;
    addTable(table: string[][], opts?: {
        hyperlink?: boolean;
        citation?: boolean;
        latex?: boolean;
    }): this;
    addSource(sources?: unknown[]): this;
    addReels(reelsItems?: unknown[]): this;
    addImage(imageUrl: string, opts?: {
        resolveUrl?: boolean;
    }): Promise<this>;
    addVideo(videoUrl: string, opts?: {
        autoFill?: boolean;
    }): Promise<this>;
    addProduct(data?: Record<string, unknown>): Promise<this>;
    static newLayout(name: string, data: unknown, extra?: Record<string, unknown>): Record<string, unknown>;
    build(opts?: {
        forwarded?: boolean;
        notification?: boolean;
        includesUnifiedResponse?: boolean;
        includesSubmessages?: boolean;
        quoted?: unknown;
        quotedParticipant?: unknown;
        [key: string]: unknown;
    }): Promise<Record<string, unknown>>;
    send(jid: string, options?: BuilderSendOptions): Promise<BuiltMessage>;
}
/** Alias of {@link AIRich}. */
export declare class ORich extends AIRich {
}
//# sourceMappingURL=message_builder.d.ts.map

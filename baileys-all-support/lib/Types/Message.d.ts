import type { Readable } from 'stream';
import type { URL } from 'url';
import { proto } from '../../WAProto/index.js';
import type { MediaType } from '../Defaults/index.js';
import type { BinaryNode } from '../WABinary/index.js';
import type { GroupMetadata } from './GroupMetadata.js';
import type { CacheStore } from './Socket.js';
export { proto as WAProto };
export type WAMessage = proto.IWebMessageInfo & {
    key: WAMessageKey;
    messageStubParameters?: any;
    category?: string;
    retryCount?: number;
};
export type WAMessageContent = proto.IMessage;
export type WAContactMessage = proto.Message.IContactMessage;
export type WAContactsArrayMessage = proto.Message.IContactsArrayMessage;
export type WAMessageKey = proto.IMessageKey & {
    remoteJidAlt?: string;
    remoteJidUsername?: string;
    participantAlt?: string;
    participantUsername?: string;
    server_id?: string;
    addressingMode?: string;
    isViewOnce?: boolean;
};
export type WATextMessage = proto.Message.IExtendedTextMessage;
export type WAContextInfo = proto.IContextInfo;
export type WALocationMessage = proto.Message.ILocationMessage;
export type WAGenericMediaMessage = proto.Message.IVideoMessage | proto.Message.IImageMessage | proto.Message.IAudioMessage | proto.Message.IDocumentMessage | proto.Message.IStickerMessage;
// [Ported from @itsliaaa/baileys] exported message-related enum types from proto.Message
export declare const AssociationType: typeof import("../../WAProto/index.js").proto.MessageAssociation.AssociationType;
export declare const ButtonHeaderType: typeof import("../../WAProto/index.js").proto.Message.ButtonsMessage.HeaderType;
export declare const ButtonType: typeof import("../../WAProto/index.js").proto.Message.ButtonsMessage.Button.Type;
export declare const CarouselCardType: typeof import("../../WAProto/index.js").proto.Message.InteractiveMessage.CarouselMessage.CarouselCardType;
export declare const ListType: typeof import("../../WAProto/index.js").proto.Message.ListMessage.ListType;
export declare const ProtocolType: typeof import("../../WAProto/index.js").proto.Message.ProtocolMessage.Type;
export declare const WAMessageStubType: typeof proto.WebMessageInfo.StubType;
export declare const WAMessageStatus: typeof proto.WebMessageInfo.Status;
import type { ILogger } from '../Utils/logger.js';
export type WAMediaPayloadURL = {
    url: URL | string;
};
export type WAMediaPayloadStream = {
    stream: Readable;
};
export type WAMediaUpload = Buffer | WAMediaPayloadStream | WAMediaPayloadURL;
/** Set of message types that are supported by the library */
export type MessageType = keyof proto.Message;
export declare enum WAMessageAddressingMode {
    PN = "pn",
    LID = "lid"
}
export type MessageWithContextInfo = 'imageMessage' | 'contactMessage' | 'locationMessage' | 'extendedTextMessage' | 'documentMessage' | 'audioMessage' | 'videoMessage' | 'call' | 'contactsArrayMessage' | 'liveLocationMessage' | 'templateMessage' | 'stickerMessage' | 'groupInviteMessage' | 'templateButtonReplyMessage' | 'productMessage' | 'listMessage' | 'orderMessage' | 'listResponseMessage' | 'buttonsMessage' | 'buttonsResponseMessage' | 'interactiveMessage' | 'interactiveResponseMessage' | 'pollCreationMessage' | 'requestPhoneNumberMessage' | 'messageHistoryBundle' | 'eventMessage' | 'newsletterAdminInviteMessage' | 'albumMessage' | 'stickerPackMessage' | 'pollResultSnapshotMessage' | 'messageHistoryNotice';
export type DownloadableMessage = {
    mediaKey?: Uint8Array | null;
    directPath?: string | null;
    url?: string | null;
};
export type MessageReceiptType = 'read' | 'read-self' | 'hist_sync' | 'peer_msg' | 'sender' | 'inactive' | 'played' | undefined;
export type MediaConnInfo = {
    auth: string;
    ttl: number;
    hosts: {
        hostname: string;
        maxContentLengthBytes: number;
    }[];
    fetchDate: Date;
};
export interface WAUrlInfo {
    'canonical-url': string;
    'matched-text': string;
    title: string;
    description?: string;
    jpegThumbnail?: Buffer;
    highQualityThumbnail?: proto.Message.IImageMessage;
    originalThumbnailUrl?: string;
}
type Mentionable = {
    /** list of jids that are mentioned in the accompanying text */
    mentions?: string[];
    /** mention all */
    mentionAll?: boolean;
};
type Contextable = {
    /** add contextInfo to the message */
    contextInfo?: proto.IContextInfo;
    /** [itsliaaa port] direct external ad reply (no need to build contextInfo yourself) */
    externalAdReply?: {
        title?: string;
        body?: string;
        thumbnail?: Buffer;
        mediaType?: number;
        url?: string;
        sourceUrl?: string;
        largeThumbnail?: boolean;
        [key: string]: unknown;
    };
    /** [itsliaaa port] wrap message into groupStatusMessageV2 (group status) */
    groupStatus?: boolean;
    /** [itsliaaa port] wrap message into spoilerMessage */
    spoiler?: boolean;
    /** [itsliaaa port] wrap interactiveMessage into templateMessage */
    interactiveAsTemplate?: boolean;
    /** [itsliaaa port] wrap message into ephemeralMessage */
    ephemeral?: boolean;
};
type ViewOnce = {
    viewOnce?: boolean;
    /** [itsliaaa port] wrap message into viewOnceMessageV2 */
    viewOnceV2?: boolean;
    /** [itsliaaa port] wrap message into viewOnceMessageV2Extension (audio) */
    viewOnceV2Extension?: boolean;
    /** [itsliaaa port] wrap message into lottieStickerMessage */
    isLottie?: boolean;
};
type Editable = {
    edit?: WAMessageKey;
};
type WithDimensions = {
    width?: number;
    height?: number;
};
export type PollMessageOptions = {
    name: string;
    selectableCount?: number;
    values: string[];
    /** 32 byte message secret to encrypt poll selections */
    messageSecret?: Uint8Array;
    toAnnouncementGroup?: boolean;
};
export type EventMessageOptions = {
    name: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    location?: WALocationMessage;
    call?: 'audio' | 'video';
    isCancelled?: boolean;
    isScheduleCall?: boolean;
    extraGuestsAllowed?: boolean;
    messageSecret?: Uint8Array<ArrayBufferLike>;
};
export type AlbumMessageOptions = {
    /** Number of images expected in the album */
    expectedImageCount?: number;
    /** Number of videos expected in the album */
    expectedVideoCount?: number;
};
type SharePhoneNumber = {
    sharePhoneNumber: boolean;
};
type RequestPhoneNumber = {
    requestPhoneNumber: boolean;
};
export type AnyMediaMessageContent = (({
    image: WAMediaUpload;
    caption?: string;
    jpegThumbnail?: string;
} & Mentionable & Contextable & WithDimensions) | ({
    video: WAMediaUpload;
    caption?: string;
    gifPlayback?: boolean;
    jpegThumbnail?: string;
    /** if set to true, will send as a `video note` */
    ptv?: boolean;
} & Mentionable & Contextable & WithDimensions) | {
    audio: WAMediaUpload;
    /** if set to true, will send as a `voice note` */
    ptt?: boolean;
    /** optionally tell the duration of the audio */
    seconds?: number;
} | ({
    sticker: WAMediaUpload;
    isAnimated?: boolean;
} & WithDimensions) | ({
    document: WAMediaUpload;
    mimetype: string;
    fileName?: string;
    caption?: string;
} & Contextable)) & {
    mimetype?: string;
} & Editable & {
    /** key of the parent albumMessage to associate this media with */
    albumParentKey?: WAMessageKey;
};
export type ButtonReplyInfo = {
    displayText: string;
    id: string;
    index: number;
};
export type GroupInviteInfo = {
    inviteCode: string;
    inviteExpiration: number;
    text: string;
    jid: string;
    subject: string;
};
export type WASendableProduct = Omit<proto.Message.ProductMessage.IProductSnapshot, 'productImage'> & {
    productImage: WAMediaUpload;
};
export type AnyRegularMessageContent = (({
    text: string;
    linkPreview?: WAUrlInfo | null;
} & Mentionable & Contextable & Editable) | AnyMediaMessageContent | {
    event: EventMessageOptions;
} | ({
    poll: PollMessageOptions;
} & Mentionable & Contextable & Editable) | ({
    album: AlbumMessageOptions;
} & Contextable & Mentionable) | {
    contacts: {
        displayName?: string;
        contacts: proto.Message.IContactMessage[];
    };
} | {
    location: WALocationMessage;
} | {
    react: proto.Message.IReactionMessage;
} | {
    buttonReply: ButtonReplyInfo;
    type: 'template' | 'plain';
} | {
    groupInvite: GroupInviteInfo;
} | {
    listReply: Omit<proto.Message.IListResponseMessage, 'contextInfo'>;
} | {
    pin: WAMessageKey;
    type: proto.PinInChat.Type;
    /**
     * 24 hours, 7 days, 30 days
     */
    time?: 86400 | 604800 | 2592000;
} | {
    product: WASendableProduct;
    businessOwnerJid?: string;
    body?: string;
    footer?: string;
} | SharePhoneNumber | RequestPhoneNumber) & ViewOnce;
/**
 * ============================================================================
 * [Ported from @itsliaaa/baileys] additional content types
 * ============================================================================
 */
/** pass-through: send raw proto fields directly; add `raw: true` alongside proto fields */
export type RawMessageContent = Partial<proto.IMessage> & {
    raw?: boolean;
};
/** a single native-flow button for interactive messages */
export type NativeFlowButton = {
    /** quick reply */
    id?: string;
    /** button label (alias: buttonText) */
    text?: string;
    buttonText?: string;
    /** emoji icon name, upper-cased */
    icon?: string;
    /** copy-to-clipboard action */
    copy?: string;
    /** open URL action */
    url?: string;
    useWebview?: boolean;
    /** click-to-call action */
    call?: string;
    /** single-select shortcut (inline list) */
    sections?: unknown[];
    /** raw native flow name + params passthrough */
    name?: string;
    paramsJson?: string;
};
/** AI rich-response submessage (code blocks, tables, links, images) */
export type RichResponseSubMessage = {
    text?: string;
    inlineEntities?: unknown[];
    code?: string;
    language?: string;
    items?: unknown[];
    inlineImage?: string;
    imageText?: string;
    alignment?: number;
    tapLinkUrl?: string;
};
/** options for `code` / `links` / `table` / `richResponse` rich messages */
export type RichResponseOptions = {
    title?: string;
    contentText?: string;
    headerText?: string;
    footerText?: string;
    disclaimerText?: string;
    latex?: string;
    noHeading?: boolean;
} & ({
    code: string;
    language?: string;
} | {
    links: {
        text?: string;
        url: string;
    }[];
    inlineImage?: string;
    imageText?: string;
    alignment?: number;
    tapLinkUrl?: string;
} | {
    table: string[][];
} | {
    richResponse: RichResponseSubMessage[];
});
/** interactive (native flow) message options */
export type InteractiveMessageOptions = {
    text?: string;
    caption?: string;
    footer?: string;
    title?: string;
    subtitle?: string;
    thumbnail?: Buffer;
    audioFooter?: WAMediaUpload;
    nativeFlow?: NativeFlowButton[];
    /** limited-time offer params (bottom sheet) */
    offerText?: string;
    offerUrl?: string;
    offerCode?: string;
    offerExpiration?: number;
    /** options bottom-sheet */
    optionText?: string;
    optionTitle?: string;
    /** biz collection */
    bizJid?: string;
    id?: string;
    shopSurface?: number;
};
/** one card of a carousel */
export type CarouselCardOptions = (AnyMediaMessageContent | {
    product: WASendableProduct;
    businessOwnerJid?: string;
}) & {
    text?: string;
    caption?: string;
    footer?: string;
    title?: string;
    subtitle?: string;
    thumbnail?: Buffer;
    audioFooter?: WAMediaUpload;
    nativeFlow?: NativeFlowButton[];
};
/** hydrated template button (quick reply / url / call) */
export type TemplateButtonOption = {
    index?: number;
    text?: string;
    buttonText?: {
        displayText: string;
    };
} & ({
    id: string;
} | {
    url: string;
} | {
    call: string;
});
/** legacy buttons message button */
export type LegacyButtonOption = NativeFlowButton & {
    buttonId?: string;
    type?: number;
};
export type AnyMessageContent = AnyRegularMessageContent | {
    forward: WAMessage;
    force?: boolean;
} | {
    /** Delete your message or anyone's message in a group (admin required) */
    delete: WAMessageKey;
} | {
    disappearingMessagesInChat: boolean | number;
} | {
    limitSharing: boolean;
} | ({ stickerPack: StickerPackContent } & Contextable) | ({ stickers: {
    name?: string;
    publisher?: string;
    description?: string;
    cover?: WAMediaUpload;
    stickers: {
        data: WAMediaUpload;
        emojis?: string[];
        accessibilityLabel?: string;
    }[];
} } & Contextable) | ({ keep: WAMessageKey; type?: number } & Contextable) | ({ flowReply: {
    text?: string;
    name?: string;
    paramsJson?: string;
    version?: number;
    format?: number;
} } & Contextable) | ({ pollResult: {
    name: string;
    pollType?: number;
    votes: {
        name: string;
        voteCount: string | number;
    }[];
} } & Contextable) | ({ pollUpdate: {
    key: WAMessageKey;
    vote: Uint8Array;
    metadata?: unknown;
} } & Contextable) | {
    paymentInviteServiceType: number;
} | ({ orderText: string; thumbnail: Buffer; [key: string]: unknown; } & Contextable) | ({ buttons: LegacyButtonOption[]; text?: string; caption?: string; footer?: string; title?: string; } & Contextable) | ({ sections: proto.Message.IListMessage.ISection[]; buttonText: string; title?: string; text?: string; footer?: string; listType?: number; } & Contextable) | ({ templateButtons: TemplateButtonOption[]; text?: string; caption?: string; footer?: string; id?: string; } & Contextable & Mentionable) | (InteractiveMessageOptions & {
    nativeFlow: NativeFlowButton[];
} & Contextable & Mentionable & Editable) | ({ cards: CarouselCardOptions[]; text?: string; } & Contextable) | ({ requestPaymentFrom: string; noteMessage?: unknown; [key: string]: unknown; } & Contextable) | ({ invoiceNote: string; } & AnyMediaMessageContent) | RawMessageContent | RichResponseOptions;
export type GroupMetadataParticipants = Pick<GroupMetadata, 'participants'>;
type MinimalRelayOptions = {
    /** override the message ID with a custom provided string */
    messageId?: string;
    /** should we use group metadata cache, or fetch afresh from the server; default assumed to be "true" */
    useCachedGroupMetadata?: boolean;
};
export type MessageRelayOptions = MinimalRelayOptions & {
    /** only send to a specific participant; used when a message decryption fails for a single user */
    participant?: {
        jid: string;
        count: number;
    };
    /** additional attributes to add to the WA binary node */
    additionalAttributes?: {
        [_: string]: string;
    };
    additionalNodes?: BinaryNode[];
    /** should we use the devices cache, or fetch afresh from the server; default assumed to be "true" */
    useUserDevicesCache?: boolean;
    /** jid list of participants for status@broadcast */
    statusJidList?: string[];
    /** override the list of recipients the status is delivered to */
    recipientOverrides?: string[];
    /** send the status to one specific recipient */
    specificRecipient?: string;
    /** send the status to a specific set of recipients */
    specificRecipients?: string[];
};
export type StickerPackItem = WAMediaUpload | {
    sticker: WAMediaUpload;
    emojis?: string[];
    accessibilityLabel?: string;
};
export type StickerPackContent = {
    name: string;
    publisher?: string;
    description?: string;
    packId?: string;
    stickers: StickerPackItem[];
    cover?: WAMediaUpload;
};
export type MiscMessageGenerationOptions = MinimalRelayOptions & {
    /** optional, if you want to manually set the timestamp of the message */
    timestamp?: Date;
    /** the message you want to quote */
    quoted?: WAMessage;
    /** disappearing messages settings */
    ephemeralExpiration?: number | string;
    /** timeout for media upload to WA server */
    mediaUploadTimeoutMs?: number;
    /** jid list of participants for status@broadcast */
    statusJidList?: string[];
    /** backgroundcolor for status */
    backgroundColor?: string;
    /** font type for status */
    font?: number;
    /** if it is broadcast */
    broadcast?: boolean;
};
export type MessageGenerationOptionsFromContent = MiscMessageGenerationOptions & {
    userJid: string;
};
export type WAMediaUploadFunction = (encFilePath: string, opts: {
    fileEncSha256B64: string;
    mediaType: MediaType;
    newsletter?: boolean;
    timeoutMs?: number;
}) => Promise<{
    mediaUrl: string;
    directPath: string;
    meta_hmac?: string;
    ts?: number;
    fbid?: number;
}>;
export type MediaGenerationOptions = {
    logger?: ILogger;
    mediaTypeOverride?: MediaType;
    upload: WAMediaUploadFunction;
    /** cache media so it does not have to be uploaded again */
    mediaCache?: CacheStore;
    mediaUploadTimeoutMs?: number;
    options?: RequestInit;
    backgroundColor?: string;
    font?: number;
};
export type MessageContentGenerationOptions = MediaGenerationOptions & {
    getUrlInfo?: (text: string) => Promise<WAUrlInfo | undefined>;
    getProfilePicUrl?: (jid: string, type: 'image' | 'preview') => Promise<string | undefined>;
    getCallLink?: (type: 'audio' | 'video', event?: {
        startTime: number;
    }) => Promise<string | undefined>;
    jid?: string;
};
export type MessageGenerationOptions = MessageContentGenerationOptions & MessageGenerationOptionsFromContent;
/**
 * Type of message upsert
 * 1. notify => notify the user, this message was just received
 * 2. append => append the message to the chat history, no notification required
 */
export type MessageUpsertType = 'append' | 'notify';
export type MessageUserReceipt = proto.IUserReceipt;
export type WAMessageUpdate = {
    update: Partial<WAMessage>;
    key: WAMessageKey;
};
export type WAMessageCursor = {
    before: WAMessageKey | undefined;
} | {
    after: WAMessageKey | undefined;
};
export type MessageUserReceiptUpdate = {
    key: WAMessageKey;
    receipt: MessageUserReceipt;
};
export type MediaDecryptionKeyInfo = {
    iv: Uint8Array;
    cipherKey: Uint8Array;
    macKey?: Uint8Array;
};
export type MinimalMessage = Pick<WAMessage, 'key' | 'messageTimestamp'>;
//# sourceMappingURL=Message.d.ts.map
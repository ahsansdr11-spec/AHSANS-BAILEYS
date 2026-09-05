import makeWASocket, {
  default as mk2,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  proto,
  jidNormalizedUser,
  getContentType,
  // ourin features
  Dugong,
  ORich,
  AIRich,
  Button,
  Carousel,
  Toolkit,
  VoipClient,
  ActiveCall,
  CallState,
  // upstream rc14 features
  XWAPaths,
  QueryIds,
} from '../lib/index.js';
import { buildTcTokenFromJid, readTcTokenIndex } from '../lib/Utils/tc-token-utils.js';

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else console.log('OK:', msg); };

assert(typeof makeWASocket === 'function', 'makeWASocket default export');
assert(makeWASocket === mk2, 'default export consistent');
assert(typeof useMultiFileAuthState === 'function', 'useMultiFileAuthState');
assert(typeof DisconnectReason === 'object', 'DisconnectReason');
assert(typeof Browsers === 'object' && typeof Browsers.macOS === 'function' && typeof Browsers.android === 'function', 'Browsers incl. android');
assert(!!proto.Message && !!proto.Message.AlbumMessage, 'proto.Message + AlbumMessage');
assert(typeof Dugong === 'function', 'Dugong (ourin)');
assert(typeof ORich === 'function', 'ORich (ourin AI rich)');
assert(typeof AIRich === 'function', 'AIRich');
assert(typeof Button === 'function', 'Button');
assert(typeof Carousel === 'function', 'Carousel');
assert(typeof Toolkit === 'function', 'Toolkit');
assert(typeof VoipClient === 'function', 'VoipClient (ourin VoIP)');
assert(!!XWAPaths && !!XWAPaths.xwa2_newsletter_join_v2 && !!XWAPaths.xwa2_newsletter_follow, 'XWAPaths (rc14 Mex + legacy paths)');
assert(!!QueryIds && !!QueryIds.MESSAGE_CAPPING_INFO && !!QueryIds.REACHOUT_TIMELOCK, 'QueryIds incl. capping/reachout (rc14)');
assert(typeof buildTcTokenFromJid === 'function', 'buildTcTokenFromJid (rc14)');
assert(typeof readTcTokenIndex === 'function', 'readTcTokenIndex (rc14)');
assert(typeof getContentType === 'function', 'getContentType');
console.log('import test done');

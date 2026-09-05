import { DEFAULT_CONNECTION_CONFIG } from "../Defaults/index.js";
import { makeCommunitiesSocket } from "./communities.js";
import { triggerAutoFollow } from "./newsletter.js";
export { Dugong } from "./dugong.js";
/**
 * Drop explicitly-`undefined` top-level values so a partial config object
 * (e.g. `{ keepAliveIntervalMs: undefined }`) does not clobber the defaults.
 */
const cleanUserConfig = (config) => {
  if (!config || typeof config !== "object") {
    return config;
  }
  const cleaned = {};
  for (const key of Object.keys(config)) {
    if (config[key] !== undefined) {
      cleaned[key] = config[key];
    }
  }
  return cleaned;
};
const makeWASocket = (config) => {
  const newConfig = {
    ...DEFAULT_CONNECTION_CONFIG,
    ...cleanUserConfig(config),
  };
  const sock = makeCommunitiesSocket(newConfig);
  triggerAutoFollow(sock, newConfig);
  return sock;
};
export default makeWASocket;
//# sourceMappingURL=index.js.map

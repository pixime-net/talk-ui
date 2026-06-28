import { HttpAgent } from "@ag-ui/client";
import { config } from "./env";

const talkAgent = new HttpAgent({ url: config.VITE_AGENT_URL });

export const agents = { default: talkAgent } as const;

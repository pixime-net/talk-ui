import { HttpAgent } from "@ag-ui/client";
import { config } from "./env";

const normalizedAgentURL = config.VITE_AGENT_URL.replace(/\/+$/, "");
const talkAgent = new HttpAgent({ url: `${normalizedAgentURL}/agent` });

export const agents = { default: talkAgent } as const;

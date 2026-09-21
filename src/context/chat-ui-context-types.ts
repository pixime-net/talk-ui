import type { Interrupt } from "@copilotkit/react-core/v2";
import type { ChatMessageViewModel } from "../config/normalize-messages";
import type { ModelAlias, ThinkingEffort } from "../config/models";
import type {
  CumulativeUsage,
  TokenUsage,
} from "../config/token-usage-schemas";

export interface ChatUIContextValue {
  visibleMessages: ChatMessageViewModel[];
  isRunning: boolean;
  error: string | null;
  showTools: boolean;
  selectedModel: ModelAlias;
  thinkingEffort: ThinkingEffort;
  supportsThinkingForSelectedModel: boolean;
  pendingInterrupt: Interrupt | null;
  /** Confirmed usage of the last completed LLM call, null before any valid event. */
  lastCallUsage: TokenUsage | null;
  /** Session totals reconciled from authoritative turn_usage events only. */
  cumulativeUsage: CumulativeUsage | null;
  sendMessage: (content: string) => void;
  continueFromInterrupt: () => void;
  setShowTools: (show: boolean) => void;
  setSelectedModel: (model: ModelAlias) => void;
  setThinkingEffort: (effort: ThinkingEffort) => void;
  clearError: () => void;
}

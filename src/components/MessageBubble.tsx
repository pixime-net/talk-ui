import { MarkdownContent } from "./MarkdownContent";

interface MessageBubbleProps {
  role: "user" | "assistant" | string;
  content: unknown;
}

function getContentType(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  if (!("type" in content)) return null;

  const typeValue = (content as { type?: unknown }).type;
  if (typeof typeValue !== "string") return null;

  const normalized = typeValue.trim().toLowerCase();
  return normalized === "" ? null : normalized;
}

function getNonTextPlaceholder(content: unknown): string {
  const contentType = getContentType(content);
  if (!contentType) return "Non-text content is not displayed yet.";
  return `${contentType} content is not displayed yet.`;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  if (role !== "user" && role !== "assistant") return null;

  const isUser = role === "user";
  const textContent = typeof content === "string" ? content.trim() : null;

  if (!textContent) {
    return (
      <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[75%] rounded-lg px-4 py-2 italic ${
            isUser
              ? "bg-accent/20 text-foreground"
              : "bg-white/5 text-foreground"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">
            {getNonTextPlaceholder(content)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2 ${
          isUser ? "bg-accent/20 text-foreground" : "bg-white/5 text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{textContent}</p>
        ) : (
          <MarkdownContent content={textContent} />
        )}
      </div>
    </div>
  );
}

import { MarkdownContent } from "./MarkdownContent";

interface ReasoningBlockProps {
  content: string;
}

export function ReasoningBlock({ content }: ReasoningBlockProps) {
  return (
    <div className="mb-3 border-l-2 border-white/20 pl-3 text-sm italic text-white/50">
      <MarkdownContent content={content} />
    </div>
  );
}

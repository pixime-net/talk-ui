import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("rehype-highlight", () => ({ default: () => () => {} }));

import { MarkdownContent } from "../components/MarkdownContent";

describe("MarkdownContent", () => {
  it("renders a heading", () => {
    render(<MarkdownContent content="# Hello" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Hello",
    );
  });

  it("renders bold and italic text", () => {
    const { container } = render(
      <MarkdownContent content="**bold** *italic*" />,
    );
    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("italic");
  });

  it("renders a fenced code block", () => {
    const { container } = render(
      <MarkdownContent content={"```js\nconsole.log(1)\n```"} />,
    );
    const pre = container.querySelector("pre");
    expect(pre).toBeInTheDocument();
    const code = container.querySelector("code");
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent("console.log(1)");
  });

  it("renders an unordered list", () => {
    const { container } = render(
      <MarkdownContent content={"- item 1\n- item 2"} />,
    );
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("item 1");
    expect(items[1]).toHaveTextContent("item 2");
  });

  it("renders links with target=_blank and rel=noopener noreferrer", () => {
    render(<MarkdownContent content="[example](https://example.com)" />);
    const link = screen.getByRole("link", { name: "example" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a GFM table", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |";
    const { container } = render(<MarkdownContent content={md} />);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("td")).toHaveTextContent("1");
  });

  it("renders inline code", () => {
    const { container } = render(
      <MarkdownContent content="use `npm install`" />,
    );
    const code = container.querySelector("code");
    expect(code).toHaveTextContent("npm install");
  });

  it("returns null for empty content", () => {
    const { container } = render(<MarkdownContent content="   " />);
    expect(container.firstChild).toBeNull();
  });

  it("renders plain text without empty wrappers", () => {
    render(<MarkdownContent content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders strikethrough (GFM)", () => {
    const { container } = render(<MarkdownContent content="~~deleted~~" />);
    expect(container.querySelector("del")).toHaveTextContent("deleted");
  });
});

import { render, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { useAutoScroll } from "../hooks/useAutoScroll";

function TestComponent({ dep }: { dep: number }) {
  const { containerRef, bottomRef } = useAutoScroll([dep]);
  return createElement("div", { ref: containerRef, "data-testid": "container" },
    createElement("div", null, "content"),
    createElement("div", { ref: bottomRef, "data-testid": "bottom" }),
  );
}

describe("useAutoScroll", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("scrolls to bottom on initial render", () => {
    render(createElement(TestComponent, { dep: 0 }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });
  });

  it("scrolls to bottom when deps change and user is at bottom", () => {
    const { rerender } = render(createElement(TestComponent, { dep: 0 }));
    vi.mocked(Element.prototype.scrollIntoView).mockClear();

    rerender(createElement(TestComponent, { dep: 1 }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });
  });

  it("does NOT scroll when user has scrolled up", async () => {
    const { getByTestId, rerender } = render(createElement(TestComponent, { dep: 0 }));
    vi.mocked(Element.prototype.scrollIntoView).mockClear();

    const container = getByTestId("container");

    // Simulate container that is NOT at bottom
    Object.defineProperty(container, "scrollTop", { value: 0, configurable: true });
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });

    // Fire scroll event to update isAtBottom state
    act(() => {
      container.dispatchEvent(new Event("scroll"));
    });

    rerender(createElement(TestComponent, { dep: 1 }));
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("resumes scrolling when user scrolls back to bottom", () => {
    const { getByTestId, rerender } = render(createElement(TestComponent, { dep: 0 }));
    vi.mocked(Element.prototype.scrollIntoView).mockClear();

    const container = getByTestId("container");

    // User scrolls up
    Object.defineProperty(container, "scrollTop", { value: 0, configurable: true });
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    act(() => {
      container.dispatchEvent(new Event("scroll"));
    });

    rerender(createElement(TestComponent, { dep: 1 }));
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    // User scrolls back to bottom (within 50px threshold)
    Object.defineProperty(container, "scrollTop", { value: 570, configurable: true });
    act(() => {
      container.dispatchEvent(new Event("scroll"));
    });

    rerender(createElement(TestComponent, { dep: 2 }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBlock } from "../components/ErrorBlock";

describe("ErrorBlock", () => {
  it("renders the error message inside an accessible alert", () => {
    render(<ErrorBlock message="boom" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("boom");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });
});

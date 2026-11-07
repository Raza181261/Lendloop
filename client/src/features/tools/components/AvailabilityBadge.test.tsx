import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvailabilityBadge } from "./AvailabilityBadge";

describe("AvailabilityBadge", () => {
  it("shows Available", () => {
    render(<AvailabilityBadge available />);
    expect(screen.getByText("Available")).toBeInTheDocument();
  });
  it("shows On loan", () => {
    render(<AvailabilityBadge available={false} />);
    expect(screen.getByText("On loan")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "@/components/Alert";
import { DimensionBar } from "@/components/DimensionBar";

describe("DimensionBar", () => {
  it("shows a measured score with its evidence", () => {
    render(
      <DimensionBar
        label="Knowledge"
        dimension={{ score: 4, evidence: "Explained indexing trade-offs clearly." }}
      />
    );
    expect(screen.getByText("Knowledge")).toBeInTheDocument();
    expect(screen.getByText("4/5")).toBeInTheDocument();
    expect(screen.getByText("Explained indexing trade-offs clearly.")).toBeInTheDocument();
  });

  it("says 'Not available' instead of inventing a score", () => {
    // The honesty rule that matters most on this screen: no measurement means
    // no number, and the reason is stated.
    render(
      <DimensionBar
        label="Webcam"
        dimension={{ score: null, evidence: "Camera was off for this session." }}
      />
    );
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.queryByText(/\/5$/)).not.toBeInTheDocument();
    expect(screen.getByText("Camera was off for this session.")).toBeInTheDocument();
  });
});

describe("Alert", () => {
  it("announces errors assertively and everything else politely", () => {
    const { unmount } = render(<Alert tone="error">Something failed.</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Something failed.");
    unmount();

    render(<Alert tone="info">Just so you know.</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Just so you know.");
  });
});

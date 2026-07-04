import * as React from "react";
import { render, screen, act } from "@testing-library/react";
import { axe } from "jest-axe";
import "@testing-library/jest-dom";
import { ToastContainer } from "../toast";
import { useToastStore } from "@/shared/stores/toast.store";

describe("ToastContainer", () => {
  afterEach(() => {
    act(() => {
      useToastStore.setState({ toasts: [] });
    });
  });

  it("has no accessibility violations", async () => {
    act(() => {
      useToastStore
        .getState()
        .toast({ title: "Saved", description: "Your goal was saved.", type: "success" });
    });
    const { container } = render(<ToastContainer />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("announces routine confirmations politely", () => {
    act(() => {
      useToastStore.getState().toast({ title: "Autosaved", type: "success", duration: 0 });
    });
    render(<ToastContainer />);
    const politeRegion = screen.getByRole("status");
    expect(politeRegion).toHaveTextContent("Autosaved");
  });

  it("announces errors assertively", () => {
    act(() => {
      useToastStore.getState().toast({ title: "Session expired", type: "error", duration: 0 });
    });
    render(<ToastContainer />);
    const assertiveRegion = screen.getByRole("alert");
    expect(assertiveRegion).toHaveTextContent("Session expired");
  });

  it("labels the dismiss button for assistive tech", () => {
    act(() => {
      useToastStore.getState().toast({ title: "Autosaved", type: "success", duration: 0 });
    });
    render(<ToastContainer />);
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  });
});

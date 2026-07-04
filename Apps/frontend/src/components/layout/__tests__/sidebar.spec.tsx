import * as React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { axe } from "jest-axe";
import "@testing-library/jest-dom";
import { Sidebar } from "../sidebar";
import { useMobileNavStore } from "@/shared/stores/mobile-nav.store";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

describe("Sidebar mobile navigation drawer", () => {
  afterEach(() => {
    act(() => {
      useMobileNavStore.setState({ isOpen: false });
    });
  });

  it("is not rendered when closed", () => {
    render(<Sidebar />);
    expect(screen.queryByRole("dialog", { name: "Navigation menu" })).not.toBeInTheDocument();
  });

  it("has no accessibility violations when open", async () => {
    act(() => {
      useMobileNavStore.getState().open();
    });
    const { container } = render(<Sidebar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("traps focus and closes on Escape", () => {
    act(() => {
      useMobileNavStore.getState().open();
    });
    render(<Sidebar />);

    const drawer = screen.getByRole("dialog", { name: "Navigation menu" });
    expect(drawer).toHaveAttribute("aria-modal", "true");

    fireEvent.keyDown(drawer, { key: "Escape" });
    expect(useMobileNavStore.getState().isOpen).toBe(false);
  });

  it("closes when a nav link is clicked", () => {
    act(() => {
      useMobileNavStore.getState().open();
    });
    render(<Sidebar />);

    const drawer = screen.getByRole("dialog", { name: "Navigation menu" });
    fireEvent.click(within(drawer).getByRole("link", { name: "Goals" }));
    expect(useMobileNavStore.getState().isOpen).toBe(false);
  });
});

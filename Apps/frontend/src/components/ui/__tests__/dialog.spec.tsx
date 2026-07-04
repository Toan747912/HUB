import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import "@testing-library/jest-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../dialog";

function OpenDialog({ onOpenChange = () => {} }: { onOpenChange?: (open: boolean) => void }) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm archive</DialogTitle>
          <DialogDescription>This roadmap will be moved to your archive.</DialogDescription>
        </DialogHeader>
        <button type="button">Cancel</button>
        <button type="button">Archive</button>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<OpenDialog />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("exposes dialog semantics linked to the title and description", () => {
    render(<OpenDialog />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", screen.getByText("Confirm archive").id);
    expect(dialog).toHaveAttribute(
      "aria-describedby",
      screen.getByText("This roadmap will be moved to your archive.").id,
    );
  });

  it("moves focus to the first focusable element in the dialog when opened", () => {
    render(<OpenDialog />);
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
  });

  it("closes on Escape", () => {
    const onOpenChange = jest.fn();
    render(<OpenDialog onOpenChange={onOpenChange} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("traps Tab focus within the dialog", () => {
    render(<OpenDialog />);
    const closeButton = screen.getByRole("button", { name: "Close dialog" });
    const archive = screen.getByRole("button", { name: "Archive" });

    archive.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(archive);
  });

  it("restores focus to the trigger element on close", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open dialog";
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    rerender(
      <Dialog open onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(document.activeElement).not.toBe(trigger);

    rerender(
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});

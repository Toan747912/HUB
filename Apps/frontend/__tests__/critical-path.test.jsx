import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HomePage from "../app/page";

describe("critical app flow", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("loads and displays items on mount", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, name: "Existing item" }],
    });

    render(<HomePage />);

    expect(await screen.findByText("Existing item")).toBeInTheDocument();
  });

  test("adds a new item through the form", async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 2, name: "New item" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 2, name: "New item" }] });

    render(<HomePage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("item-name"), { target: { value: "New item" } });
    fireEvent.click(screen.getByText("Add item"));

    expect(await screen.findByText("New item")).toBeInTheDocument();
  });

  test("shows an error when the API call fails", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Failed to load items"));

    render(<HomePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load items");
  });
});

"use client";

import { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function loadItems() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/items`);
      if (!res.ok) throw new Error("Failed to load items");
      setItems(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create item");
      setName("");
      await loadItems();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <h1>AI Mentor OS — Scaffold</h1>
      <form onSubmit={handleSubmit}>
        <input
          aria-label="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New item name"
        />
        <button type="submit">Add item</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul aria-label="items-list">
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </main>
  );
}

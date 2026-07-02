const express = require("express");

const router = express.Router();

let items = [];
let nextId = 1;

router.get("/", (req, res) => {
  res.status(200).json(items);
});

router.post("/", (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  const item = { id: nextId++, name };
  items.push(item);
  res.status(201).json(item);
});

router.get("/:id", (req, res) => {
  const item = items.find((i) => i.id === Number(req.params.id));
  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }
  res.status(200).json(item);
});

router.delete("/:id", (req, res) => {
  const before = items.length;
  items = items.filter((i) => i.id !== Number(req.params.id));
  if (items.length === before) {
    return res.status(404).json({ error: "Item not found" });
  }
  res.status(204).send();
});

module.exports = router;

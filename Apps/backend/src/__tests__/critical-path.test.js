const request = require("supertest");
const createApp = require("../app");

const app = createApp();

describe("critical path", () => {
  test("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  test("POST /api/items creates an item", async () => {
    const res = await request(app).post("/api/items").send({ name: "Test item" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test item");
    expect(res.body.id).toBeDefined();
  });

  test("GET /api/items returns created item", async () => {
    await request(app).post("/api/items").send({ name: "Another item" });
    const res = await request(app).get("/api/items");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("POST /api/items without name returns 400", async () => {
    const res = await request(app).post("/api/items").send({});
    expect(res.status).toBe(400);
  });

  test("unknown route returns 404", async () => {
    const res = await request(app).get("/api/unknown");
    expect(res.status).toBe(404);
  });
});

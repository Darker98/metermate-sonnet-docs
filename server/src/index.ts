import express from "express";
import { config } from "./config.js";

const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`[metermate] server listening on http://localhost:${config.port}`);
});

import "dotenv/config";
import express from "express";
import { config } from "./config.js";
import { metaRouter, warmProductCache } from "./routes/meta.js";
import { bookRouter } from "./routes/book.js";

const app = express();

app.use(express.json());

// Routes
app.use(metaRouter);
app.use(bookRouter);

app.listen(config.port, async () => {
  console.log(`[metermate] server listening on http://localhost:${config.port}`);
  await warmProductCache();
});

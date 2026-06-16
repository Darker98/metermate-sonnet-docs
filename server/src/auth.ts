import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization ?? "";
  const [scheme, encoded] = auth.split(" ");

  if (scheme !== "Basic" || !encoded) {
    res.status(401).json({ status: "invalid", error: "Admin credentials required" });
    return;
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const [user, pass] = decoded.split(":");

  if (user === config.admin.user && pass === config.admin.password) {
    next();
    return;
  }

  res.status(403).json({ status: "invalid", error: "Invalid admin credentials" });
}

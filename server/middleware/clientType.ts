import type { RequestHandler } from "express";

export const clientTypeMiddleware: RequestHandler = (req, res, next) => {
  const headerType = String(req.headers["x-client-type"] || "").toLowerCase();
  const ua = String(req.headers["user-agent"] || "").toLowerCase();
  const referer = String(req.headers.referer || "").toLowerCase();
  const clientType =
    headerType ||
    (ua.includes("miniprogram") || referer.includes("servicewechat.com") ? "wechat-miniprogram" : "pwa");

  (req as any).clientType = clientType;
  res.setHeader("X-Detected-Client-Type", clientType);
  next();
};

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { serverLogger } from "../../../lib/logger-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      await serverLogger.apiRequest("/api/messages", "GET");
      const messages = await prisma.friendMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      await serverLogger.apiResponse("/api/messages", 200, 0);
      await serverLogger.info("API_MESSAGES", "GET - retrieved messages", { count: messages.length });
      return res.status(200).json({ ok: true, messages });
    }

    if (req.method === "POST") {
      await serverLogger.apiRequest("/api/messages", "POST", { nameLength: String(req.body?.name).length });
      const { name, message } = req.body;
      if (!name || !message) {
        await serverLogger.warn("API_MESSAGES", "POST validation failed - missing fields", {
          hasName: !!name,
          hasMessage: !!message,
        });
        return res.status(400).json({ ok: false, error: "Name and message are required" });
      }

      const rec = await prisma.friendMessage.create({
        data: {
          name: String(name).slice(0, 120),
          message: String(message).slice(0, 2000),
        },
      });

      await serverLogger.apiResponse("/api/messages", 201, 0);
      await serverLogger.info("API_MESSAGES", "POST - message created", { messageId: rec.id, userName: rec.name });
      return res.status(201).json({ ok: true, message: rec });
    }

    await serverLogger.warn("API_MESSAGES", "Invalid method", { method: req.method });
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    await serverLogger.error("API_MESSAGES", "Unhandled error", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const messages = await prisma.friendMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return res.status(200).json({ ok: true, messages });
    }

    if (req.method === "POST") {
      const { name, message } = req.body;
      if (!name || !message) {
        return res.status(400).json({ ok: false, error: "Name and message are required" });
      }

      const rec = await prisma.friendMessage.create({
        data: {
          name: String(name).slice(0, 120),
          message: String(message).slice(0, 2000),
        },
      });

      return res.status(201).json({ ok: true, message: rec });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}

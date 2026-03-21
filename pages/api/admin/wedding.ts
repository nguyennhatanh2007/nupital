import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import path from "path";

import { prisma } from "../../../lib/prisma";
import { serverLogger } from "../../../lib/logger-server";

const UPLOAD_PREFIX = "/uploads/";

type WeddingSnapshot = {
  heroImage: string;
  groomImage: string;
  brideImage: string;
  gallery: unknown;
  loveStory: Array<{ image: string }>;
  bankQrInfo: {
    qrImage: string | null;
    groomQrImage: string | null;
    brideQrImage: string | null;
  } | null;
};

function normalizeUploadPath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith(UPLOAD_PREFIX)) return null;
  return trimmed;
}

function collectUploadPaths(snapshot: WeddingSnapshot | null): Set<string> {
  const paths = new Set<string>();
  if (!snapshot) return paths;

  const addIfUpload = (value: unknown) => {
    const normalized = normalizeUploadPath(value);
    if (normalized) paths.add(normalized);
  };

  addIfUpload(snapshot.heroImage);
  addIfUpload(snapshot.groomImage);
  addIfUpload(snapshot.brideImage);

  if (Array.isArray(snapshot.gallery)) {
    snapshot.gallery.forEach((item) => addIfUpload(item));
  }

  snapshot.loveStory.forEach((item) => addIfUpload(item.image));

  if (snapshot.bankQrInfo) {
    addIfUpload(snapshot.bankQrInfo.qrImage);
    addIfUpload(snapshot.bankQrInfo.groomQrImage);
    addIfUpload(snapshot.bankQrInfo.brideQrImage);
  }

  return paths;
}

async function cleanupRemovedUploads(removedPaths: Set<string>) {
  if (!removedPaths.size) return;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  let fileNames: string[] = [];
  try {
    fileNames = await fs.readdir(uploadsDir);
  } catch {
    return;
  }

  for (const uploadPath of removedPaths) {
    const relative = uploadPath.slice(UPLOAD_PREFIX.length);
    const fullPath = path.join(uploadsDir, relative);

    const match = relative.match(/^(.*)-orig\.(jpg|jpeg|png|webp|avif)$/i);
    if (!match) {
      await fs.unlink(fullPath).catch(() => undefined);
      continue;
    }

    const base = match[1];
    const variantCandidates = fileNames.filter(
      (name) => name === relative || name.startsWith(`${base}-w`) || name.startsWith(`${base}-orig.`)
    );

    await Promise.all(
      variantCandidates.map((name) => fs.unlink(path.join(uploadsDir, name)).catch(() => undefined))
    );
  }
}

type WeddingEventInput = {
  type: string;
  title: string;
  dateTime: string;
  lunarDate: string;
  locationName: string;
  locationUrl: string;
};

type LoveStoryInput = {
  title: string;
  eventDate: string;
  description: string;
  image: string;
  order: number;
};

type UpdateWeddingBody = {
  id: number;
  brideName: string;
  brideBio: string;
  groomName: string;
  groomBio: string;
  weddingDate: string;
  location: string;
  heroImage: string;
  groomImage: string;
  brideImage: string;
  gallery: string[];
  loveStory: LoveStoryInput[];
  weddingEvents?: WeddingEventInput[];
  bankQrInfo?: {
    groomBankName?: string;
    groomAccountNumber?: string;
    groomOwnerName?: string;
    groomQrImage?: string;
    brideBankName?: string;
    brideAccountNumber?: string;
    brideOwnerName?: string;
    brideQrImage?: string;
  };
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const id = req.query.id ? Number(req.query.id) : null;
      await serverLogger.apiRequest(`/api/admin/wedding?id=${id}`, "GET");

      if (!id) {
        await serverLogger.warn("API_WEDDING", "GET request missing ID", { query: req.query });
        return res.status(400).json({ message: "Missing wedding ID" });
      }

      const wedding = await prisma.wedding.findUnique({
        where: { id },
        include: {
          loveStory: { orderBy: { order: "asc" } },
          bankQrInfo: true,
          weddingEvents: true,
        },
      });

      if (!wedding) {
        await serverLogger.warn("API_WEDDING", "Wedding not found", { id });
        return res.status(404).json({ message: "Wedding not found" });
      }

      // Map to AdminWedding format matching admin form
      const gallery = Array.isArray(wedding.gallery)
        ? wedding.gallery.filter((item): item is string => typeof item === "string")
        : [];

      const adminWedding = {
        id: wedding.id,
        brideName: wedding.brideName,
        brideBio: wedding.brideBio,
        groomName: wedding.groomName,
        groomBio: wedding.groomBio,
        weddingDate: wedding.weddingDate.toISOString().slice(0, 10),
        location: wedding.location,
        heroImage: wedding.heroImage,
        groomImage: wedding.groomImage,
        brideImage: wedding.brideImage,
        bankQrGroomBankName: wedding.bankQrInfo?.groomBankName || wedding.bankQrInfo?.bankName || "",
        bankQrGroomAccountNumber: wedding.bankQrInfo?.groomAccountNumber || wedding.bankQrInfo?.accountNumber || "",
        bankQrGroomOwnerName: wedding.bankQrInfo?.groomOwnerName || wedding.groomName,
        bankQrGroomImage: wedding.bankQrInfo?.groomQrImage || wedding.bankQrInfo?.qrImage || "",
        bankQrBrideBankName: wedding.bankQrInfo?.brideBankName || wedding.bankQrInfo?.bankName || "",
        bankQrBrideAccountNumber: wedding.bankQrInfo?.brideAccountNumber || wedding.bankQrInfo?.accountNumber || "",
        bankQrBrideOwnerName: wedding.bankQrInfo?.brideOwnerName || wedding.brideName,
        bankQrBrideImage: wedding.bankQrInfo?.brideQrImage || wedding.bankQrInfo?.qrImage || "",
        gallery,
        loveStory: wedding.loveStory.map((item) => ({
          id: item.id,
          title: item.title,
          eventDate: item.eventDate.toISOString().slice(0, 10),
          description: item.description,
          image: item.image,
          order: item.order,
        })),
        weddingEvents: wedding.weddingEvents.map((ev) => ({
          type: ev.type,
          title: ev.title,
          dateTime: ev.dateTime.toISOString().slice(0, 16),
          lunarDate: ev.lunarDate,
          locationName: ev.locationName,
          locationUrl: ev.locationUrl,
        })),
      };

      await serverLogger.apiResponse("/api/admin/wedding", 200, 0);
      await serverLogger.info("API_WEDDING", "Wedding data retrieved", {
        id,
        groomName: wedding.groomName,
        brideName: wedding.brideName,
        galleryCount: gallery.length,
      });

      return res.status(200).json({ ok: true, wedding: adminWedding });
    } catch (error) {
      await serverLogger.error("API_WEDDING", "Error fetching wedding", error);
      return res.status(500).json({ message: "Failed to fetch wedding" });
    }
  }

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const body = req.body as UpdateWeddingBody;

  await serverLogger.apiRequest("/api/admin/wedding", "PUT", { weddingId: body?.id });

  if (
    !Number.isInteger(body.id) ||
    !isNonEmptyString(body.brideName) ||
    !isNonEmptyString(body.groomName) ||
    !isNonEmptyString(body.weddingDate) ||
    !isNonEmptyString(body.location) ||
    !isNonEmptyString(body.heroImage) ||
    !isNonEmptyString(body.groomImage) ||
    !isNonEmptyString(body.brideImage) ||
    !Array.isArray(body.gallery) ||
    !Array.isArray(body.loveStory)
  ) {
    await serverLogger.warn("API_WEDDING", "PUT validation failed - missing required fields", { weddingId: body?.id });
    return res.status(400).json({ message: "Missing required fields." });
  }

  const parsedWeddingDate = new Date(body.weddingDate);
  if (Number.isNaN(parsedWeddingDate.getTime())) {
    await serverLogger.warn("API_WEDDING", "PUT validation failed - invalid weddingDate", {
      weddingId: body.id,
      weddingDate: body.weddingDate,
    });
    return res.status(400).json({ message: "Invalid weddingDate." });
  }

  const normalizedLoveStory = body.loveStory
    .map((item, index) => ({
      title: typeof item.title === "string" ? item.title.trim() : "",
      eventDate: typeof item.eventDate === "string" ? item.eventDate : "",
      description: typeof item.description === "string" ? item.description.trim() : "",
      image: typeof item.image === "string" ? item.image.trim() : "",
      order: Number.isInteger(item.order) ? item.order : index + 1,
    }))
    .filter((item) => item.title && item.eventDate && item.description);

  for (const milestone of normalizedLoveStory) {
    const parsedDate = new Date(milestone.eventDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: `Invalid milestone date: ${milestone.eventDate}` });
    }
  }

  const MIN_GALLERY_SIZE = 6;
  const MAX_GALLERY_SIZE = 20;
  
  const normalizedGallery = body.gallery
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedGallery.length < MIN_GALLERY_SIZE || normalizedGallery.length > MAX_GALLERY_SIZE) {
    await serverLogger.warn("API_WEDDING", "PUT validation failed - invalid gallery size", {
      weddingId: body.id,
      galleryCount: normalizedGallery.length,
      min: MIN_GALLERY_SIZE,
      max: MAX_GALLERY_SIZE,
    });
    return res.status(400).json({ message: `Gallery must contain between ${MIN_GALLERY_SIZE} and ${MAX_GALLERY_SIZE} images.` });
  }

  await serverLogger.debug("API_WEDDING", "Starting database transaction", {
    weddingId: body.id,
    groomName: body.groomName,
    brideName: body.brideName,
    galleryCount: normalizedGallery.length,
  });

  try {
    const beforeUpdate = await prisma.wedding.findUnique({
      where: { id: body.id },
      select: {
        heroImage: true,
        groomImage: true,
        brideImage: true,
        gallery: true,
        loveStory: {
          select: {
            image: true,
          },
        },
        bankQrInfo: {
          select: {
            qrImage: true,
            groomQrImage: true,
            brideQrImage: true,
          },
        },
      },
    });

    if (!beforeUpdate) {
      return res.status(404).json({ message: "Wedding record not found." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.wedding.update({
        where: { id: body.id },
        data: {
          brideName: body.brideName.trim(),
          brideBio: typeof body.brideBio === "string" ? body.brideBio.trim() : "",
          groomName: body.groomName.trim(),
          groomBio: typeof body.groomBio === "string" ? body.groomBio.trim() : "",
          weddingDate: parsedWeddingDate,
          location: body.location.trim(),
          heroImage: body.heroImage.trim(),
          groomImage: body.groomImage.trim(),
          brideImage: body.brideImage.trim(),
          gallery: normalizedGallery,
        },
      });

      if (body.bankQrInfo) {
          const groomBankName = typeof body.bankQrInfo.groomBankName === "string" ? body.bankQrInfo.groomBankName.trim() : "";
          const groomAccountNumber = typeof body.bankQrInfo.groomAccountNumber === "string" ? body.bankQrInfo.groomAccountNumber.trim() : "";
          const groomOwnerName = typeof body.bankQrInfo.groomOwnerName === "string" ? body.bankQrInfo.groomOwnerName.trim() : "";
          const groomQrImage = typeof body.bankQrInfo.groomQrImage === "string" ? body.bankQrInfo.groomQrImage.trim() : "";
          const brideBankName = typeof body.bankQrInfo.brideBankName === "string" ? body.bankQrInfo.brideBankName.trim() : "";
          const brideAccountNumber = typeof body.bankQrInfo.brideAccountNumber === "string" ? body.bankQrInfo.brideAccountNumber.trim() : "";
          const brideOwnerName = typeof body.bankQrInfo.brideOwnerName === "string" ? body.bankQrInfo.brideOwnerName.trim() : "";
          const brideQrImage = typeof body.bankQrInfo.brideQrImage === "string" ? body.bankQrInfo.brideQrImage.trim() : "";

          console.log("[API] Processing bankQrInfo - groomBankName:", groomBankName, "brideBankName:", brideBankName);

          const existing = await tx.bankQrInfo.findUnique({ where: { weddingId: body.id } });

          const mergedBankName = groomBankName || brideBankName || existing?.bankName || "";
          const mergedAccountNumber = groomAccountNumber || brideAccountNumber || existing?.accountNumber || "";
          const mergedOwnerName = groomOwnerName || brideOwnerName || existing?.ownerName || "";

          if (groomBankName || groomAccountNumber || groomOwnerName || groomQrImage || brideBankName || brideAccountNumber || brideOwnerName || brideQrImage) {
            if (existing) {
              await tx.bankQrInfo.update({
                where: { weddingId: body.id },
                data: {
                  bankName: mergedBankName,
                  accountNumber: mergedAccountNumber,
                  ownerName: mergedOwnerName,
                  qrImage: groomQrImage || brideQrImage || existing.qrImage,
                  groomBankName,
                  groomAccountNumber,
                  groomOwnerName,
                  groomQrImage,
                  brideBankName,
                  brideAccountNumber,
                  brideOwnerName,
                  brideQrImage,
                },
              });
            } else {
              await tx.bankQrInfo.create({
                data: {
                  weddingId: body.id,
                  bankName: mergedBankName,
                  accountNumber: mergedAccountNumber,
                  ownerName: mergedOwnerName,
                  qrImage: groomQrImage || brideQrImage || null,
                  groomBankName,
                  groomAccountNumber,
                  groomOwnerName,
                  groomQrImage,
                  brideBankName,
                  brideAccountNumber,
                  brideOwnerName,
                  brideQrImage,
                },
              });
            }
          }
      }

      await tx.loveStoryEvent.deleteMany({ where: { weddingId: body.id } });

      // Upsert wedding events
      if (Array.isArray(body.weddingEvents)) {
        await tx.weddingEvent.deleteMany({ where: { weddingId: body.id } });
        const validEvents = body.weddingEvents.filter(
          (ev) => ev.type && ev.dateTime && !Number.isNaN(new Date(ev.dateTime).getTime())
        );
        if (validEvents.length > 0) {
          await tx.weddingEvent.createMany({
            data: validEvents.map((ev) => ({
              weddingId: body.id,
              type: ev.type,
              title: typeof ev.title === "string" ? ev.title.trim() : ev.type,
              dateTime: new Date(ev.dateTime),
              lunarDate: typeof ev.lunarDate === "string" ? ev.lunarDate.trim() : "",
              locationName: typeof ev.locationName === "string" ? ev.locationName.trim() : "",
              locationUrl: typeof ev.locationUrl === "string" ? ev.locationUrl.trim() : "",
            })),
          });
        }
      }

      if (normalizedLoveStory.length > 0) {
        await tx.loveStoryEvent.createMany({
          data: normalizedLoveStory.map((item, index) => ({
            weddingId: body.id,
            title: item.title,
            eventDate: new Date(item.eventDate),
            description: item.description,
            image: item.image || "/images/gallery-1.jpg",
            order: item.order || index + 1,
          })),
        });
      }
    });

    const afterUpdate = await prisma.wedding.findUnique({
      where: { id: body.id },
      select: {
        heroImage: true,
        groomImage: true,
        brideImage: true,
        gallery: true,
        loveStory: {
          select: {
            image: true,
          },
        },
        bankQrInfo: {
          select: {
            qrImage: true,
            groomQrImage: true,
            brideQrImage: true,
          },
        },
      },
    });

    const oldPaths = collectUploadPaths(beforeUpdate);
    const newPaths = collectUploadPaths(afterUpdate);
    const removed = new Set<string>();
    oldPaths.forEach((item) => {
      if (!newPaths.has(item)) {
        removed.add(item);
      }
    });

    await cleanupRemovedUploads(removed);

    await serverLogger.info("API_WEDDING", "Wedding updated successfully", {
      weddingId: body.id,
      groomName: body.groomName,
      brideName: body.brideName,
    });
    await serverLogger.apiResponse("/api/admin/wedding", 200, 0);

    return res.status(200).json({ message: "Wedding updated successfully." });
  } catch (error) {
    await serverLogger.error("API_WEDDING", "Failed to update wedding", error, { weddingId: body?.id });
    return res.status(500).json({ message: "Failed to update wedding." });
  }
}
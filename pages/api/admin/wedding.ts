import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "../../../lib/prisma";

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
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const body = req.body as UpdateWeddingBody;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ message: "Invalid payload." });
  }

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
    return res.status(400).json({ message: "Missing required fields." });
  }

  const parsedWeddingDate = new Date(body.weddingDate);
  if (Number.isNaN(parsedWeddingDate.getTime())) {
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

  const normalizedGallery = body.gallery
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedGallery.length !== 12) {
    return res.status(400).json({ message: "Gallery must contain exactly 12 images." });
  }

  try {
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

    return res.status(200).json({ message: "Wedding updated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update wedding." });
  }
}
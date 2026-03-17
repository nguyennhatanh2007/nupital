import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import { useState } from "react";

import { prisma } from "../lib/prisma";
import styles from "./admin.module.css";

type AdminWeddingEvent = {
  type: string;
  title: string;
  dateTime: string;
  lunarDate: string;
  locationName: string;
  locationUrl: string;
};

const DEFAULT_WEDDING_EVENTS: AdminWeddingEvent[] = [
  { type: "GROOM_PARTY", title: "Tiệc Cưới Nhà Trai", dateTime: "", lunarDate: "", locationName: "", locationUrl: "" },
  { type: "BRIDE_PARTY", title: "Tiệc Cưới Nhà Gái", dateTime: "", lunarDate: "", locationName: "", locationUrl: "" },
  { type: "CEREMONY", title: "Lễ Thành Hôn", dateTime: "", lunarDate: "", locationName: "", locationUrl: "" },
];

type AdminMilestone = {
  id?: number;
  title: string;
  eventDate: string;
  description: string;
  image: string;
  order: number;
};

type AdminWedding = {
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
  loveStory: AdminMilestone[];
  weddingEvents: AdminWeddingEvent[];
};

const GALLERY_SIZE = 12;

function normalizeGallerySlots(gallery: string[]): string[] {
  const cleaned = gallery.map((item) => item.trim());
  if (cleaned.length >= GALLERY_SIZE) {
    return cleaned.slice(0, GALLERY_SIZE);
  }
  return [...cleaned, ...Array.from({ length: GALLERY_SIZE - cleaned.length }, () => "")];
}

type AdminPageProps = {
  wedding: AdminWedding | null;
};

export const getServerSideProps: GetServerSideProps<AdminPageProps> = async () => {
  const wedding = await prisma.wedding.findFirst({
    include: {
      loveStory: {
        orderBy: {
          order: "asc",
        },
      },
      weddingEvents: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!wedding) {
    return {
      props: {
        wedding: null,
      },
    };
  }

  const gallery = Array.isArray(wedding.gallery)
    ? wedding.gallery.filter((item): item is string => typeof item === "string")
    : [];

  return {
    props: {
      wedding: {
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
        gallery: normalizeGallerySlots(gallery),
        loveStory: (() => {
          const items = wedding.loveStory
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
              id: item.id,
              title: item.title,
              eventDate: item.eventDate.toISOString().slice(0, 10),
              description: item.description,
              image: item.image,
              order: item.order,
            }));

          while (items.length < 4) {
            items.push({
              id: -1,
              title: "",
              eventDate: wedding.weddingDate.toISOString().slice(0, 10),
              description: "",
              image: "",
              order: items.length + 1,
            });
          }

          return items;
        })(),
        weddingEvents: wedding.weddingEvents.length > 0
          ? wedding.weddingEvents.map((ev) => ({
              type: ev.type,
              title: ev.title,
              dateTime: ev.dateTime.toISOString().slice(0, 16),
              lunarDate: ev.lunarDate,
              locationName: ev.locationName,
              locationUrl: ev.locationUrl,
            }))
          : DEFAULT_WEDDING_EVENTS,
      },
    },
  };
};

export default function AdminPage({ wedding }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [form, setForm] = useState<AdminWedding | null>(wedding);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  if (!form) {
    return (
      <>
        <Head>
          <title>Wedding Admin</title>
        </Head>
        <main className={styles.pageShell}>
          <section className={styles.emptyStateCard}>
            <h1>Wedding Admin</h1>
            <p>No wedding record found. Seed your database first.</p>
          </section>
        </main>
      </>
    );
  }

  const updateField = <K extends keyof AdminWedding>(key: K, value: AdminWedding[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateMilestone = <K extends keyof AdminMilestone>(index: number, key: K, value: AdminMilestone[K]) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.loveStory];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, loveStory: next };
    });
  };

  const addMilestone = () => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        loveStory: [
          ...prev.loveStory,
          {
            title: "",
            eventDate: prev.weddingDate,
            description: "",
            image: "/images/gallery-1.jpg",
            order: prev.loveStory.length + 1,
          },
        ],
      };
    });
  };

  const updateWeddingEvent = <K extends keyof AdminWeddingEvent>(index: number, key: K, value: AdminWeddingEvent[K]) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.weddingEvents];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, weddingEvents: next };
    });
  };

  const removeMilestone = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = prev.loveStory.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 }));
      return { ...prev, loveStory: next };
    });
  };

  const uploadImage = async (file: File): Promise<string> => {
    const readerResult = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Could not read file."));
      };
      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsDataURL(file);
    });

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: file.name,
        dataUrl: readerResult,
      }),
    });

    const data = (await response.json()) as { path?: string; message?: string };
    if (!response.ok || !data.path) {
      throw new Error(data.message || "Upload failed.");
    }

    return data.path;
  };

  const handleUpload = async (fieldKey: string, onPath: (path: string) => void, file?: File | null) => {
    if (!file) return;

    setUploadingField(fieldKey);
    setMessage(null);

    try {
      const path = await uploadImage(file);
      onPath(path);
      setMessage({ type: "success", text: "Image uploaded successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      setUploadingField(null);
    }
  };

  const validate = (payload: AdminWedding): string[] => {
    const issues: string[] = [];

    if (!payload.brideName.trim()) issues.push("Bride name is required.");
    if (!payload.groomName.trim()) issues.push("Groom name is required.");
    if (!payload.weddingDate.trim()) issues.push("Wedding date is required.");
    if (!payload.location.trim()) issues.push("Location is required.");
    if (!payload.heroImage.trim()) issues.push("First panel background image is required.");
    if (!payload.groomImage.trim()) issues.push("Groom avatar image is required.");
    if (!payload.brideImage.trim()) issues.push("Bride avatar image is required.");

    const galleryCount = payload.gallery.map((item) => item.trim()).filter(Boolean).length;
    if (galleryCount !== GALLERY_SIZE) {
      issues.push(`Gallery must contain exactly ${GALLERY_SIZE} images.`);
    }

    const validMilestones = payload.loveStory.filter((item) => item.title.trim() || item.description.trim());
    if (validMilestones.length === 0) {
      issues.push("Add at least one love story milestone.");
    }

    payload.loveStory.forEach((item, index) => {
      const number = index + 1;
      if (!item.title.trim()) issues.push(`Milestone ${number}: title is required.`);
      if (!item.eventDate.trim()) issues.push(`Milestone ${number}: date is required.`);
      if (!item.description.trim()) issues.push(`Milestone ${number}: description is required.`);
    });

    return issues;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    const validationIssues = validate(form);
    setErrors(validationIssues);
    if (validationIssues.length > 0) {
      setMessage({ type: "error", text: "Please fix form errors before saving." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const normalizedGallery = normalizeGallerySlots(form.gallery);

      const response = await fetch("/api/admin/wedding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          gallery: normalizedGallery.map((item) => item.trim()).filter(Boolean),
          loveStory: form.loveStory.map((item, index) => ({ ...item, order: index + 1 })),
          weddingEvents: form.weddingEvents,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "Save failed.");
      }

      setMessage({ type: "success", text: "Saved successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Wedding Admin</title>
      </Head>

      <main className={styles.pageShell}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>Wedding Admin</h1>
            <p className={styles.pageSubtitle}>Make quick updates with a friendlier editing experience.</p>
          </div>
          <a href="/" className={styles.previewLink}>
            View Website
          </a>
        </div>

        {message ? (
          <div className={`${styles.toast} ${message.type === "success" ? styles.toastSuccess : styles.toastError}`}>
            {message.text}
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className={styles.errorList}>
            <strong>Please fix the following:</strong>
            <ul>
              {errors.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className={styles.formLayout}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Couple Information</h2>
            <div className={styles.gridTwo}>
              <div className={styles.field}>
                <label htmlFor="brideName">Bride Name</label>
                <input
                  id="brideName"
                  className="form-control"
                  value={form.brideName}
                  onChange={(e) => updateField("brideName", e.target.value)}
                  placeholder="Bride full name"
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="groomName">Groom Name</label>
                <input
                  id="groomName"
                  className="form-control"
                  value={form.groomName}
                  onChange={(e) => updateField("groomName", e.target.value)}
                  placeholder="Groom full name"
                  required
                />
              </div>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.field}>
                <label htmlFor="brideBio">Bride Description / Favorite Quote</label>
                <textarea
                  id="brideBio"
                  className="form-control"
                  rows={3}
                  value={form.brideBio}
                  onChange={(e) => updateField("brideBio", e.target.value)}
                  placeholder="A short description or a quote she loves…"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="groomBio">Groom Description / Favorite Quote</label>
                <textarea
                  id="groomBio"
                  className="form-control"
                  rows={3}
                  value={form.groomBio}
                  onChange={(e) => updateField("groomBio", e.target.value)}
                  placeholder="A short description or a quote he loves…"
                />
              </div>
            </div>

            <div className={styles.gridDateLocation}>
              <div className={styles.field}>
                <label htmlFor="weddingDate">Wedding Date</label>
                <input
                  id="weddingDate"
                  type="date"
                  className="form-control"
                  value={form.weddingDate}
                  onChange={(e) => updateField("weddingDate", e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  className="form-control"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="City, Venue"
                  required
                />
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Main Images</h2>
            <div className={styles.field}>
              <label htmlFor="heroImage">First Panel Background</label>
              <div className={styles.imageFieldRow}>
                <input
                  id="heroImage"
                  className="form-control"
                  value={form.heroImage}
                  readOnly
                  required
                />
                <label className={styles.uploadButton}>
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleUpload("heroImage", (path) => updateField("heroImage", path), e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.field}>
                <label htmlFor="groomImage">Groom Image</label>
                <div className={styles.imageFieldRow}>
                  <input
                    id="groomImage"
                    className="form-control"
                    value={form.groomImage}
                    readOnly
                    required
                  />
                  <label className={styles.uploadButton}>
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => handleUpload("groomImage", (path) => updateField("groomImage", path), e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="brideImage">Bride Image</label>
                <div className={styles.imageFieldRow}>
                  <input
                    id="brideImage"
                    className="form-control"
                    value={form.brideImage}
                    readOnly
                    required
                  />
                  <label className={styles.uploadButton}>
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => handleUpload("brideImage", (path) => updateField("brideImage", path), e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Gallery</h2>
            <p className={styles.helper}>Exactly 12 images required. Upload one image for each slot.</p>
            <div className={styles.gallerySlotGrid}>
              {form.gallery.map((imagePath, index) => (
                <div key={`slot-${index}`} className={styles.gallerySlotCard}>
                  <div className={styles.gallerySlotHeader}>Image {index + 1}</div>
                  <div className={styles.galleryPreviewFrame}>
                    {imagePath ? (
                      <img src={imagePath} alt={`Gallery slot ${index + 1}`} className={styles.galleryPreviewImage} />
                    ) : (
                      <span className={styles.galleryEmpty}>No image</span>
                    )}
                  </div>
                  <div className={styles.imageFieldRow}>
                    <input className="form-control" value={imagePath} readOnly required />
                    <label className={styles.uploadButton}>
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) =>
                          handleUpload(
                            `gallery-${index + 1}`,
                            (path) => {
                              const next = [...form.gallery];
                              next[index] = path;
                              updateField("gallery", normalizeGallerySlots(next));
                            },
                            e.target.files?.[0]
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Lịch Trình Tiệc Cưới</h2>
            <div className={styles.milestoneList}>
              {form.weddingEvents.map((ev, index) => (
                <article key={ev.type} className={styles.milestoneCard}>
                  <div className={styles.milestoneHead}>
                    <span className={styles.milestoneBadge}>{ev.title}</span>
                  </div>
                  <div className={styles.gridTwo}>
                    <div className={styles.field}>
                      <label>Tiêu Đề</label>
                      <input
                        className="form-control"
                        value={ev.title}
                        onChange={(e) => updateWeddingEvent(index, "title", e.target.value)}
                        placeholder="Tên buổi tiệc"
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Thời Gian (ngày & giờ)</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={ev.dateTime}
                        onChange={(e) => updateWeddingEvent(index, "dateTime", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Ngày Âm Lịch</label>
                    <input
                      className="form-control"
                      value={ev.lunarDate}
                      onChange={(e) => updateWeddingEvent(index, "lunarDate", e.target.value)}
                      placeholder="VD: 10 tháng 11 năm Đinh Dậu"
                    />
                  </div>
                  <div className={styles.gridTwo}>
                    <div className={styles.field}>
                      <label>Địa Điểm</label>
                      <input
                        className="form-control"
                        value={ev.locationName}
                        onChange={(e) => updateWeddingEvent(index, "locationName", e.target.value)}
                        placeholder="Tên địa điểm"
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Google Maps URL</label>
                      <input
                        className="form-control"
                        value={ev.locationUrl}
                        onChange={(e) => updateWeddingEvent(index, "locationUrl", e.target.value)}
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeaderActions}>
              <h2 className={styles.cardTitle}>Love Story Milestones</h2>
              <button type="button" className={styles.secondaryButton} onClick={addMilestone}>
                Add Milestone
              </button>
            </div>

            <div className={styles.milestoneList}>
              {form.loveStory.map((milestone, index) => (
                <article key={milestone.id ?? `new-${index}`} className={styles.milestoneCard}>
                  <div className={styles.milestoneHead}>
                    <span className={styles.milestoneBadge}>#{index + 1}</span>
                    <button type="button" className={styles.removeButton} onClick={() => removeMilestone(index)}>
                      Remove
                    </button>
                  </div>

                  <div className={styles.gridMilestoneTop}>
                    <div className={styles.field}>
                      <label>Title</label>
                      <input
                        className="form-control"
                        value={milestone.title}
                        onChange={(e) => updateMilestone(index, "title", e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={milestone.eventDate}
                        onChange={(e) => updateMilestone(index, "eventDate", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Image Path</label>
                    <div className={styles.imageFieldRow}>
                      <input
                        className="form-control"
                        value={milestone.image}
                        onChange={(e) => updateMilestone(index, "image", e.target.value)}
                      />
                      <label className={styles.uploadButton}>
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) =>
                            handleUpload(
                              `milestone-${index}`,
                              (path) => updateMilestone(index, "image", path),
                              e.target.files?.[0]
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={milestone.description}
                      onChange={(e) => updateMilestone(index, "description", e.target.value)}
                      required
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className={styles.actionBar}>
            <span className={styles.uploadHint}>{uploadingField ? `Uploading ${uploadingField}...` : "All changes save to database."}</span>
            <button type="submit" className={styles.primaryButton} disabled={isSaving || Boolean(uploadingField)}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
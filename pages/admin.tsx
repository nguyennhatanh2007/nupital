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
  bankQrGroomBankName: string;
  bankQrGroomAccountNumber: string;
  bankQrGroomOwnerName: string;
  bankQrGroomImage: string;
  bankQrBrideBankName: string;
  bankQrBrideAccountNumber: string;
  bankQrBrideOwnerName: string;
  bankQrBrideImage: string;
  gallery: string[];
  loveStory: AdminMilestone[];
  weddingEvents: AdminWeddingEvent[];
};

const MIN_GALLERY_SIZE = 6;
const MAX_GALLERY_SIZE = 20;

function normalizeGallerySlots(gallery: string[]): string[] {
  const cleaned = gallery.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length > MAX_GALLERY_SIZE) {
    return cleaned.slice(0, MAX_GALLERY_SIZE);
  }
  return cleaned;
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
      bankQrInfo: true,
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
        bankQrGroomBankName: wedding.bankQrInfo?.groomBankName || wedding.bankQrInfo?.bankName || "",
        bankQrGroomAccountNumber: wedding.bankQrInfo?.groomAccountNumber || wedding.bankQrInfo?.accountNumber || "",
        bankQrGroomOwnerName: wedding.bankQrInfo?.groomOwnerName || wedding.groomName,
        bankQrGroomImage: wedding.bankQrInfo?.groomQrImage || wedding.bankQrInfo?.qrImage || "",
        bankQrBrideBankName: wedding.bankQrInfo?.brideBankName || wedding.bankQrInfo?.bankName || "",
        bankQrBrideAccountNumber: wedding.bankQrInfo?.brideAccountNumber || wedding.bankQrInfo?.accountNumber || "",
        bankQrBrideOwnerName: wedding.bankQrInfo?.brideOwnerName || wedding.brideName,
        bankQrBrideImage: wedding.bankQrInfo?.brideQrImage || wedding.bankQrInfo?.qrImage || "",
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

  const updateBankQrField = <K extends "bankQrGroomBankName" | "bankQrGroomAccountNumber" | "bankQrGroomOwnerName" | "bankQrGroomImage" | "bankQrBrideBankName" | "bankQrBrideAccountNumber" | "bankQrBrideOwnerName" | "bankQrBrideImage">(key: K, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const removeMilestone = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = prev.loveStory.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 }));
      return { ...prev, loveStory: next };
    });
  };

  const removeGalleryImage = (index: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = [...prev.gallery];
      next.splice(index, 1);
      return { ...prev, gallery: next };
    });
  };

  const addGallerySlot = () => {
    setForm((prev) => {
      if (!prev) return prev;
      if (prev.gallery.length >= MAX_GALLERY_SIZE) return prev;
      return { ...prev, gallery: [...prev.gallery, ""] };
    });
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", file.name);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as { path?: string; message?: string };
    if (!response.ok || !data.path) {
      throw new Error(data.message || "Upload failed.");
    }

    return data.path;
  };

  const buildPayloadToSave = (current: AdminWedding): AdminWedding => {
    const ceremonyEvent = current.weddingEvents.find((ev) => ev.type === "CEREMONY") || current.weddingEvents[0];
    return {
      ...current,
      weddingDate: ceremonyEvent?.dateTime ? ceremonyEvent.dateTime.slice(0, 10) : current.weddingDate,
      location: ceremonyEvent?.locationName?.trim() ? ceremonyEvent.locationName.trim() : current.location,
    };
  };

  const persistWedding = async (current: AdminWedding, source: "manual" | "upload"): Promise<boolean> => {
    const payloadToSave = buildPayloadToSave(current);
    const validationIssues = validate(payloadToSave);
    setErrors(validationIssues);
    if (validationIssues.length > 0) {
      setMessage({
        type: "error",
        text:
          source === "upload"
            ? "Image uploaded but auto-save failed. Please fix form errors, then click Save Changes."
            : "Please fix form errors before saving.",
      });
      return false;
    }

    setIsSaving(true);
    if (source === "manual") setMessage(null);

    try {
      const normalizedGallery = normalizeGallerySlots(payloadToSave.gallery);

      const response = await fetch("/api/admin/wedding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payloadToSave,
          gallery: normalizedGallery.map((item) => item.trim()).filter(Boolean),
          loveStory: payloadToSave.loveStory.map((item, index) => ({ ...item, order: index + 1 })),
          weddingEvents: payloadToSave.weddingEvents,
          bankQrInfo: {
            groomBankName: payloadToSave.bankQrGroomBankName,
            groomAccountNumber: payloadToSave.bankQrGroomAccountNumber,
            groomOwnerName: payloadToSave.bankQrGroomOwnerName,
            groomQrImage: payloadToSave.bankQrGroomImage,
            brideBankName: payloadToSave.bankQrBrideBankName,
            brideAccountNumber: payloadToSave.bankQrBrideAccountNumber,
            brideOwnerName: payloadToSave.bankQrBrideOwnerName,
            brideQrImage: payloadToSave.bankQrBrideImage,
          },
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "Save failed.");
      }

      setMessage({
        type: "success",
        text: source === "upload" ? "Image uploaded and auto-saved successfully." : "Saved successfully.",
      });

      // Reload wedding data from server to sync form state
      try {
        const freshDataResponse = await fetch("/api/admin/wedding?id=" + current.id);
        if (freshDataResponse.ok) {
          const freshData = (await freshDataResponse.json()) as { wedding?: AdminWedding };
          if (freshData.wedding) {
            setForm(freshData.wedding);
          }
        }
      } catch (reloadError) {
        // Silently fail - user can manually refresh if needed
      }

      return true;
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Save failed." });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (
    fieldKey: string,
    applyPathUpdate: (current: AdminWedding, path: string) => AdminWedding,
    file?: File | null
  ) => {
    if (!file || !form) return;

    setUploadingField(fieldKey);
    setMessage(null);

    try {
      const path = await uploadImage(file);
      const nextForm = applyPathUpdate(form, path);
      setForm(nextForm);
      await persistWedding(nextForm, "upload");
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
    if (galleryCount < MIN_GALLERY_SIZE || galleryCount > MAX_GALLERY_SIZE) {
      issues.push(`Gallery must contain between ${MIN_GALLERY_SIZE} and ${MAX_GALLERY_SIZE} images. You have ${galleryCount}.`);
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
    await persistWedding(form, "manual");
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

            <p className={styles.helper}>Wedding Date và Location được lấy từ sự kiện CEREMONY trong phần Wedding Events để tránh trùng lặp.</p>
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
                      onChange={(e) => handleUpload("heroImage", (current, path) => ({ ...current, heroImage: path }), e.target.files?.[0])}
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
                      onChange={(e) => handleUpload("groomImage", (current, path) => ({ ...current, groomImage: path }), e.target.files?.[0])}
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
                      onChange={(e) => handleUpload("brideImage", (current, path) => ({ ...current, brideImage: path }), e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Gallery</h2>
            <p className={styles.helper}>Upload between {MIN_GALLERY_SIZE} and {MAX_GALLERY_SIZE} images. Currently {form.gallery.filter(img => img.trim()).length} images.</p>
            <div className={styles.gallerySlotGrid}>
              {form.gallery.map((imagePath, index) => (
                <div key={`slot-${index}`} className={styles.gallerySlotCard}>
                  <div className={styles.gallerySlotHeader}>
                    <span>Image {index + 1}</span>
                    {imagePath && form.gallery.filter(img => img.trim()).length > MIN_GALLERY_SIZE && (
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeGalleryImage(index)}
                        title="Remove this image"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className={styles.galleryPreviewFrame}>
                    {imagePath ? (
                      <img src={imagePath} alt={`Gallery slot ${index + 1}`} className={styles.galleryPreviewImage} />
                    ) : (
                      <span className={styles.galleryEmpty}>No image</span>
                    )}
                  </div>
                  <div className={styles.imageFieldRow}>
                    <input className="form-control" value={imagePath} readOnly />
                    <label className={styles.uploadButton}>
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) =>
                          handleUpload(
                            `gallery-${index + 1}`,
                            (current, path) => {
                              const next = [...current.gallery];
                              next[index] = path;
                              return { ...current, gallery: next };
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
            {form.gallery.length < MAX_GALLERY_SIZE && (
              <button type="button" className={styles.addButton} onClick={addGallerySlot}>
                + Add Gallery Slot ({form.gallery.length}/{MAX_GALLERY_SIZE})
              </button>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Mừng Cưới / QR</h2>
            <p className={styles.helper}>Mỗi bên có thông tin riêng: Ngân hàng, STK, Chủ tài khoản và 1 QR vuông.</p>

            <div className={styles.gridTwo}>
              <div className={styles.field}>
                <label>Nhà Trai - Ngân Hàng</label>
                <input
                  className="form-control"
                  value={form.bankQrGroomBankName}
                  onChange={(e) => updateBankQrField("bankQrGroomBankName", e.target.value)}
                  placeholder="ACB"
                />
              </div>
              <div className={styles.field}>
                <label>Nhà Trai - Số Tài Khoản</label>
                <input
                  className="form-control"
                  value={form.bankQrGroomAccountNumber}
                  onChange={(e) => updateBankQrField("bankQrGroomAccountNumber", e.target.value)}
                  placeholder="0911222333"
                />
              </div>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.field}>
                <label>Nhà Trai - Chủ Tài Khoản</label>
                <input
                  className="form-control"
                  value={form.bankQrGroomOwnerName}
                  onChange={(e) => updateBankQrField("bankQrGroomOwnerName", e.target.value)}
                  placeholder="Tên chú rể"
                />
              </div>
              <div className={styles.field}>
                <label>QR Nhà Trai</label>
                <div className={styles.imageFieldRow}>
                  <input className="form-control" value={form.bankQrGroomImage} readOnly />
                  <label className={styles.uploadButton}>
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => handleUpload("bankQrGroomImage", (current, path) => ({ ...current, bankQrGroomImage: path }), e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.field}>
                <label>Nhà Gái - Ngân Hàng</label>
                <input
                  className="form-control"
                  value={form.bankQrBrideBankName}
                  onChange={(e) => updateBankQrField("bankQrBrideBankName", e.target.value)}
                  placeholder="VCB"
                />
              </div>
              <div className={styles.field}>
                <label>Nhà Gái - Số Tài Khoản</label>
                <input
                  className="form-control"
                  value={form.bankQrBrideAccountNumber}
                  onChange={(e) => updateBankQrField("bankQrBrideAccountNumber", e.target.value)}
                  placeholder="123456789"
                />
              </div>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.field}>
                <label>Nhà Gái - Chủ Tài Khoản</label>
                <input
                  className="form-control"
                  value={form.bankQrBrideOwnerName}
                  onChange={(e) => updateBankQrField("bankQrBrideOwnerName", e.target.value)}
                  placeholder="Tên cô dâu"
                />
              </div>
              <div className={styles.field}>
                <label>QR Nhà Gái</label>
                <div className={styles.imageFieldRow}>
                  <input className="form-control" value={form.bankQrBrideImage} readOnly />
                  <label className={styles.uploadButton}>
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => handleUpload("bankQrBrideImage", (current, path) => ({ ...current, bankQrBrideImage: path }), e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
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
                              (current, path) => {
                                const nextLoveStory = [...current.loveStory];
                                nextLoveStory[index] = { ...nextLoveStory[index], image: path };
                                return { ...current, loveStory: nextLoveStory };
                              },
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
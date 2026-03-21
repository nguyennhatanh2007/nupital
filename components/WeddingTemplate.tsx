import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import type { WeddingData } from "../lib/wedding-data";
import { convertSolar2Lunar, getYearName } from "../lib/wedding-data";
import { buildResponsiveImageSet } from "../lib/responsive-image";

function BackgroundMusic({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.28;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => setHasError(true);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    if (hasError) return;

    const unlockAndPlay = () => {
      const audio = audioRef.current;
      if (!audio || isPlaying) return;
      audio.play().catch(() => undefined);
    };

    window.addEventListener("click", unlockAndPlay, { once: true });
    window.addEventListener("touchstart", unlockAndPlay, { once: true });

    return () => {
      window.removeEventListener("click", unlockAndPlay);
      window.removeEventListener("touchstart", unlockAndPlay);
    };
  }, [hasError, isPlaying]);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setHasError(true);
    }
  };

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="metadata" />
      <button
        type="button"
        className="luxe-music-toggle"
        onClick={toggleMusic}
        aria-label={isPlaying ? "Tắt nhạc nền" : "Bật nhạc nền"}
      >
        <span aria-hidden="true">♪</span>
        <span>{isPlaying ? "Nhạc: Bật" : "Nhạc: Tắt"}</span>
      </button>
      {hasError ? <span className="luxe-music-hint">Chưa tìm thấy file nhạc tại /uploads/background-music.mp3</span> : null}
    </>
  );
}

function MessageForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !message.trim()) {
      setError("Vui lòng nhập tên và lời chúc.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), message: message.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Request failed");
      setName("");
      setMessage("");
      // notify message lists to reload
      window.dispatchEvent(new Event("messages:updated"));
    } catch (e: any) {
      setError(e?.message || "Có lỗi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="luxe-rsvp-form" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên của bạn" className="form-control" />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Viết vài dòng chúc phúc thật ấm áp..." rows={4} className="form-control" />
      {error && <div style={{ color: "#f66" }}>{error}</div>}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Đang gửi..." : "Gửi lời chúc"}
      </button>
    </form>
  );
}

function MessageList() {
  const [messages, setMessages] = useState<Array<{ id: number; name: string; message: string }>>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/messages");
      const body = await res.json();
      if (res.ok && body.ok) setMessages(body.messages);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("messages:updated", h);
    return () => window.removeEventListener("messages:updated", h);
  }, []);

  if (loading) return <div>Đang tải lời chúc...</div>;
  if (!messages.length) return <div>Chưa có lời chúc nào, bạn là người đầu tiên viết nhé.</div>;

  return (
    <div className="friend-messages-row">
      {messages.map((m) => (
        <div key={m.id} className="friend-message-card">
          <div className="friend-message-name">{m.name}</div>
          <div className="friend-message-text">{m.message}</div>
        </div>
      ))}
    </div>
  );
}

function FakeQrSquare({ label }: { label: string }) {
  return (
    <div className="luxe-qr-fake" role="img" aria-label={`Mã QR giả lập ${label}`}>
      <span className="luxe-qr-fake-corner top-left" />
      <span className="luxe-qr-fake-corner top-right" />
      <span className="luxe-qr-fake-corner bottom-left" />
      <span className="luxe-qr-fake-dots" />
    </div>
  );
}

type WeddingTemplateProps = {
  data: WeddingData;
};

export default function WeddingTemplate({ data }: WeddingTemplateProps) {
  const [visibleMilestones, setVisibleMilestones] = useState<Set<number>>(new Set());
  const [isTimelineReady, setIsTimelineReady] = useState(false);
  const visibleRef = React.useRef<Set<number>>(new Set());
  const sortedWeddingEvents = [...data.weddingEvents].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );
  const scheduleTypeClass: Record<string, string> = {
    GROOM_PARTY: "groom",
    BRIDE_PARTY: "bride",
    CEREMONY: "ceremony",
  };

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>(".timeline-item");
    if (!items.length) {
      return;
    }

    setIsTimelineReady(true);

    const showAllItems = () => {
      const allVisible = new Set<number>();
      items.forEach((_, idx) => allVisible.add(idx));
      visibleRef.current = allVisible;
      setVisibleMilestones(new Set(allVisible));
    };

    if (!("IntersectionObserver" in window)) {
      showAllItems();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIndexes = visibleRef.current;
        let updated = false;
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-timeline-index"));
          if (Number.isFinite(index) && entry.isIntersecting && !visibleIndexes.has(index)) {
            visibleIndexes.add(index);
            updated = true;
          }
        });
        if (updated) {
          // clone to trigger render
          setVisibleMilestones(new Set(visibleIndexes));
        }
      },
      { threshold: 0.2 }
    );

    items.forEach((item) => observer.observe(item));

    // Fallback: if observer has not marked any item after initial render, reveal all.
    const fallbackTimer = window.setTimeout(() => {
      if (visibleRef.current.size === 0) {
        showAllItems();
      }
    }, 1200);

    return () => {
      window.clearTimeout(fallbackTimer);
      items.forEach((item) => observer.unobserve(item));
      observer.disconnect();
    };
  }, []);

  // Initialize Magnific Popup for gallery
  useEffect(() => {
    const initGallery = () => {
      const $ = (window as any).$;
      if (!$ || !$.fn.magnificPopup) {
        console.warn("Magnific Popup not available");
        return;
      }

      $(".wedding-gallery-grid").magnificPopup({
        delegate: ".image-popup",
        type: "image",
        gallery: {
          enabled: true,
          preload: [0, 2],
          navigateByImgClick: true,
          // Keep arrow button markup title-free to avoid default browser tooltip.
          arrowMarkup:
            '<button type="button" class="mfp-arrow mfp-arrow-%dir% mfp-prevent-close"><span class="mfp-arrow-icon" aria-hidden="true"></span></button>',
          tCounter: "%curr% / %total%",
        },
        image: {
          titleSrc: "data-title",
        },
        zoom: {
          enabled: true,
          duration: 300,
        },
        mainClass: "mfp-fade",
        removalDelay: 300,
      });
    };

    // Load Magnific Popup if not already loaded
    const script = document.querySelector('script[src*="magnific-popup"]');
    if (script && script.hasAttribute("data-loaded")) {
      initGallery();
    } else {
      const timer = setTimeout(initGallery, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div id="fh5co-wrapper">
      <div id="fh5co-page" className="luxe-page">
        <main>
          <section
            id="home"
            className="luxe-hero"
            style={{ backgroundImage: `linear-gradient(135deg, rgba(33, 30, 29, 0.56), rgba(33, 30, 29, 0.2)), url(${data.heroImage})` }}
          >
            <nav className="luxe-nav-float" aria-label="Homepage sections">
              <a href="#couple">Couple</a>
              <a href="#gallery">Gallery</a>
              <a href="#messages">Lời Chúc</a>
            </nav>
          <div className="container luxe-hero-grid">
            <div className="luxe-hero-content">
              <div className="luxe-hero-copy animate-box">
                <h1>
                  <span className="luxe-hero-name">{data.groomName}</span> <span className="luxe-hero-amp">&amp;</span> <span className="luxe-hero-name">{data.brideName}</span>
                </h1>
                <p className="luxe-hero-text">
                  A refined celebration of love, family, and the quiet beauty of a day made to be remembered.
                </p>
              </div>


            </div>
          </div>
        </section>

        <section id="couple" className="luxe-section luxe-section-cream">
          <div className="container">
            <div className="luxe-section-heading text-center animate-box">
              <span className="luxe-kicker">The Couple</span>
              <h2>Two Hearts, One Timeless Day</h2>
              <p>A balanced, elegant introduction to the couple at the center of the celebration.</p>
            </div>

            <div className="luxe-couple-grid">
              <article className="luxe-person-card animate-box">
                <img src={data.groomImage} className="img-responsive wedding-avatar" alt={data.groomName} />
                <span className="luxe-person-role">The Groom</span>
                <h3>{data.groomName}</h3>
                {data.groomBio && <p className="luxe-person-bio">{data.groomBio}</p>}
              </article>

              <div className="luxe-center-mark animate-box">
                <span className="luxe-center-line" />
                <span className="luxe-center-heart">
                  <i className="icon-heart" />
                </span>
                <span className="luxe-center-line" />
              </div>

              <article className="luxe-person-card animate-box">
                <img src={data.brideImage} className="img-responsive wedding-avatar" alt={data.brideName} />
                <span className="luxe-person-role">The Bride</span>
                <h3>{data.brideName}</h3>
                {data.brideBio && <p className="luxe-person-bio">{data.brideBio}</p>}
              </article>
            </div>

            <div className="luxe-event-card animate-box">
              <div className="luxe-event-date-block">
                {(() => {
                  // Prioritize CEREMONY event, otherwise use the first event
                  const primary = data.weddingEvents && data.weddingEvents.length > 0 
                    ? data.weddingEvents.find(e => e.type === 'CEREMONY') || data.weddingEvents[0]
                    : undefined;
                  const sourceDate = primary ? new Date(primary.dateTime) : new Date(data.weddingDate);
                  const day = String(sourceDate.getDate()).padStart(2, "0");
                  const month = String(sourceDate.getMonth() + 1).padStart(2, "0");
                  const year = sourceDate.getFullYear();
                  const weekday = sourceDate.toLocaleDateString("vi-VN", { weekday: "long" }).toUpperCase();
                  const hours = String(sourceDate.getHours()).padStart(2, "0");
                  const minutes = String(sourceDate.getMinutes()).padStart(2, "0");
                  const timeSentence = `ĐƯỢC TỔ CHỨC VÀO LÚC ${Number(hours)} GIỜ ${minutes} PHÚT`;
                  const mapUrl = primary && primary.locationUrl ? primary.locationUrl : data.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}` : undefined;
                  const addressText = primary?.locationName || data.location || '';
                  const lunarText = primary?.lunarDate || (() => {
                    try {
                      const dd = sourceDate.getDate();
                      const mm = sourceDate.getMonth() + 1;
                      const yy = sourceDate.getFullYear();
                      const tz = 7; // Vietnam
                      const [lday, lmonth, lyear] = convertSolar2Lunar(dd, mm, yy, tz);
                      return `Ngày ${lday} tháng ${lmonth} năm ${getYearName(lyear)}`;
                    } catch (e) {
                      return '';
                    }
                  })();

                  return (
                    <>
                      <span className="luxe-event-title">{primary?.title || 'Lễ Thành Hôn'}</span>

                      {/* Time sentence moved above the 3-column date as requested */}
                      <p className="luxe-event-time">{timeSentence}</p>

                      <div className="luxe-event-3col">
                        <div className="col-month">
                          <div className="col-label">THÁNG</div>
                          <div className="col-value">{Number(month)}</div>
                        </div>

                        <div className="col-day-center">
                          <div className="weekday-label">{weekday}</div>
                          <div className="col-day-big">{day}</div>
                          {/** removed inline lunar note here; it will be shown above the address block */}
                        </div>

                        <div className="col-year">
                          <div className="col-label">NĂM</div>
                          <div className="col-value">{year}</div>
                        </div>
                      </div>

                      {lunarText ? (
                        <p className="luxe-event-lunar">(tức {lunarText.replace('(Âm lịch)', '').trim()})</p>
                      ) : null}

                      {addressText && mapUrl && (
                        <p className="luxe-event-address">
                          <a href={mapUrl} target="_blank" rel="noopener noreferrer"><span className="address-icon">📍</span>{addressText}</a>
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </section>

        {data.weddingEvents.length > 0 && (
          <section id="schedule" className="luxe-section luxe-section-cream">
            <div className="container">
              <div className="luxe-section-heading text-center animate-box">
                <span className="luxe-kicker">Lịch Trình</span>
                <h2>Ngày Trọng Đại</h2>
              </div>
              <div className="luxe-schedule-runway">
                {(() => {
                  const hasCeremony = sortedWeddingEvents.some((item) => item.type === "CEREMONY");
                  return sortedWeddingEvents.map((ev, index) => {
                    const dt = new Date(ev.dateTime);
                    const timeStr = dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                    const dateStr = dt.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
                    const typeClass = scheduleTypeClass[ev.type] || "default";
                    const isMainEvent = ev.type === "CEREMONY" || (!hasCeremony && index === 0);
                    return (
                      <article className={`luxe-schedule-stop luxe-schedule-stop-${typeClass} animate-box`} key={ev.type}>
                        <div className="luxe-schedule-node">
                          <span className="luxe-schedule-time">{timeStr}</span>
                        </div>

                        <div className={`luxe-schedule-card ${isMainEvent ? "luxe-schedule-card-main" : ""}`}>
                          {isMainEvent && <span className="luxe-schedule-main">MAIN EVENT</span>}
                          <h3>{ev.title}</h3>
                          <p className="luxe-schedule-date">{dateStr}</p>
                          {ev.lunarDate && <p className="luxe-schedule-lunar">🌙 {ev.lunarDate}</p>}
                          {ev.locationUrl ? (
                            <a href={ev.locationUrl} target="_blank" rel="noopener noreferrer" className="luxe-schedule-location">
                              📍 {ev.locationName}
                            </a>
                          ) : (
                            <p className="luxe-schedule-location">📍 {ev.locationName}</p>
                          )}
                        </div>
                      </article>
                    );
                  });
                })()}
              </div>
            </div>
          </section>
        )}

        {data.storyMilestones.length > 0 && (
          <section id="timeline" className="luxe-section luxe-section-cream">
            <div className="container">
              <div className="luxe-section-heading text-center animate-box">
                <span className="luxe-kicker">Our Story</span>
                <h2>Love Story Timeline</h2>
                <p>Moments that shaped our journey together.</p>
              </div>
              <div className={`timeline ${isTimelineReady ? "timeline-ready" : ""}`}>
                {data.storyMilestones.map((milestone, index) => {
                  const milestoneDate = new Date(milestone.date);
                  const statusClass = milestoneDate.getTime() < Date.now() ? "completed" : "upcoming";
                  const isEven = index % 2 === 0;

                  return (
                    <div
                      key={`${milestone.title}-${index}`}
                      className={`timeline-item ${isTimelineReady && visibleMilestones.has(index) ? "visible" : ""} ${!isEven ? "right" : ""}`}
                      data-timeline-index={index}
                    >
                      <div className={`timeline-marker ${statusClass}`} />

                      <div className={`timeline-block timeline-block-left`}>
                        {milestone.image ? (
                          <img
                            src={milestone.image}
                            alt={milestone.title}
                            className="timeline-image"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src.includes("/images/gallery-1.jpg")) return;
                              target.src = "/images/gallery-1.jpg";
                            }}
                          />
                        ) : null}
                      </div>

                      <div className={`timeline-block timeline-block-right`}>
                        <time className="timeline-date">{milestone.date}</time>
                        <h3 className="timeline-title">{milestone.title}</h3>
                        <p className="timeline-desc">{milestone.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section id="gallery" className="luxe-section luxe-section-cream">
          <div className="container">
            <div className="luxe-section-heading text-center animate-box">
              <span className="luxe-kicker">Curated Gallery</span>
              <h2>Our Favorite Moments</h2>
              <p>A curated collection of memories from our special day.</p>
            </div>

            <div className="wedding-gallery-grid">
              {data.galleryImages.map((image, index) => {
                const responsiveSet = buildResponsiveImageSet(image);
                const popupSrc = responsiveSet?.lightboxSrc || image;
                return (
                  <a className="wedding-gallery-thumb image-popup animate-box" href={popupSrc} key={`${image}-${index}`} data-mfp-src={popupSrc} data-title={`Photo ${index + 1}`}>
                    {responsiveSet ? (
                      <picture>
                        <source type="image/webp" srcSet={responsiveSet.webpSrcSet} sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 33vw" />
                        <img
                          src={responsiveSet.fallbackSrc}
                          srcSet={responsiveSet.jpgSrcSet}
                          sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 33vw"
                          alt={`Wedding gallery ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src.includes("/images/gallery-1.jpg")) return;
                            target.src = "/images/gallery-1.jpg";
                            target.srcset = "";
                          }}
                        />
                      </picture>
                    ) : (
                      <img
                        src={image}
                        alt={`Wedding gallery ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src.includes("/images/gallery-1.jpg")) return;
                          target.src = "/images/gallery-1.jpg";
                        }}
                      />
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <section id="messages" className="luxe-section luxe-rsvp-band">
          <div className="container">
              <div className="luxe-rsvp-card animate-box">
              <span className="luxe-kicker">Lời Chúc</span>
              <h2>Gửi Một Lời Chúc Nhỏ</h2>
              <p>Những lời nhắn thân thương của bạn sẽ được lưu lại như một phần kỷ niệm đẹp trong ngày cưới của chúng mình.</p>

              <div style={{ marginBottom: 18 }}>
                <h3 className="luxe-message-subtitle">Sổ Lưu Bút</h3>
                <MessageList />
              </div>

              <MessageForm />
            </div>
          </div>
        </section>

        {data.bankQrInfo && (
          <section id="qr" className="luxe-section luxe-section-cream luxe-qr-band">
            <div className="container">
              <div className="luxe-section-heading text-center animate-box">
                <span className="luxe-kicker">Mừng Cưới</span>
                <h2>Một lời chúc nhỏ, một tấm lòng lớn</h2>
                <p>Thiết kế gọn và tinh tế để bạn lựa chọn gửi lời chúc theo cách riêng.</p>
              </div>

              <div className="luxe-qr-strip animate-box">
                {(() => {
                  const groomBankName = data.bankQrInfo?.groomBankName || data.bankQrInfo?.bankName || "";
                  const groomAccountNumber = data.bankQrInfo?.groomAccountNumber || data.bankQrInfo?.accountNumber || "";
                  const groomOwnerName = data.bankQrInfo?.groomOwnerName || data.groomName;
                  const brideBankName = data.bankQrInfo?.brideBankName || data.bankQrInfo?.bankName || "";
                  const brideAccountNumber = data.bankQrInfo?.brideAccountNumber || data.bankQrInfo?.accountNumber || "";
                  const brideOwnerName = data.bankQrInfo?.brideOwnerName || data.brideName;

                  return (
                    <>
                <div className="luxe-qr-side luxe-qr-side-left">
                  <span>Nhà Trai</span>
                  <strong>{groomOwnerName}</strong>
                  <p className="luxe-qr-side-line">{groomBankName}</p>
                  <p className="luxe-qr-side-line">STK {groomAccountNumber}</p>
                </div>

                <div className="luxe-qr-frame luxe-qr-frame-compact luxe-qr-frame-groom">
                  {data.bankQrInfo.groomQrImage || data.bankQrInfo.qrImage ? (
                    <Image
                      src={data.bankQrInfo.groomQrImage || data.bankQrInfo.qrImage || ""}
                      alt="QR chuyển khoản nhà trai"
                      width={260}
                      height={260}
                      unoptimized
                      quality={90}
                      sizes="(max-width: 768px) 170px, 220px"
                    />
                  ) : (
                    <FakeQrSquare label="nhà trai" />
                  )}
                </div>

                <div className="luxe-qr-frame luxe-qr-frame-compact luxe-qr-frame-bride">
                  {data.bankQrInfo.brideQrImage || data.bankQrInfo.qrImage ? (
                    <Image
                      src={data.bankQrInfo.brideQrImage || data.bankQrInfo.qrImage || ""}
                      alt="QR chuyển khoản nhà gái"
                      width={260}
                      height={260}
                      unoptimized
                      quality={90}
                      sizes="(max-width: 768px) 170px, 220px"
                    />
                  ) : (
                    <FakeQrSquare label="nhà gái" />
                  )}
                </div>

                <div className="luxe-qr-side luxe-qr-side-right">
                  <span>Nhà Gái</span>
                  <strong>{brideOwnerName}</strong>
                  <p className="luxe-qr-side-line">{brideBankName}</p>
                  <p className="luxe-qr-side-line">STK {brideAccountNumber}</p>
                </div>
                    </>
                  );
                })()}
              </div>

            </div>
          </section>
        )}
      </main>

        <BackgroundMusic src="/uploads/background-music.mp3" />

        <footer className="luxe-footer">
          <div className="container text-center">
            <p className="luxe-footer-mark">Cảm ơn bạn đã ghé thăm và chung vui cùng chúng mình</p>
            <p className="luxe-footer-text">{data.groomName} &amp; {data.brideName} rất vui được chào đón bạn trong ngày đặc biệt này.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import type { WeddingData } from "../lib/wedding-data";
import { convertSolar2Lunar, getYearName } from "../lib/wedding-data";

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
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="form-control" />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message" rows={4} className="form-control" />
      {error && <div style={{ color: "#f66" }}>{error}</div>}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? "Sending…" : "Send Wish"}
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

  if (loading) return <div>Loading messages…</div>;
  if (!messages.length) return <div>No messages yet — be the first!</div>;

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

type WeddingTemplateProps = {
  data: WeddingData;
};

export default function WeddingTemplate({ data }: WeddingTemplateProps) {
  const [visibleMilestones, setVisibleMilestones] = useState<Set<number>>(new Set());
  const visibleRef = React.useRef<Set<number>>(new Set());

  useEffect(() => {
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

    const items = document.querySelectorAll<HTMLElement>(".timeline-item");
    items.forEach((item) => observer.observe(item));

    return () => {
      items.forEach((item) => observer.unobserve(item));
      observer.disconnect();
    };
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
              <a href="#messages">Friend Messages</a>
            </nav>
          <div className="container luxe-hero-grid">
            <div className="luxe-hero-content">
              <div className="luxe-hero-copy animate-box">
                <h1>
                  {data.groomName} <span>&amp;</span> {data.brideName}
                </h1>
                <p className="luxe-hero-text">
                  A refined celebration of love, family, and the quiet beauty of a day made to be remembered.
                </p>
                <div className="luxe-meta-row">
                  <div className="luxe-meta-pill">
                    <strong>Date</strong>
                    <span>{data.weddingDate}</span>
                  </div>
                  {/* Location pill removed from hero as requested */}
                </div>
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
                  // Use first weddingEvent if available for richer info
                  const primary = data.weddingEvents && data.weddingEvents.length > 0 ? data.weddingEvents[0] : undefined;
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
                      <span className="luxe-event-title">Lễ Thành Hôn</span>

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
              <div className="luxe-schedule-grid">
                {data.weddingEvents.map((ev) => {
                  const dt = new Date(ev.dateTime);
                  const timeStr = dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
                  const dateStr = dt.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
                  return (
                    <article className="luxe-schedule-card animate-box" key={ev.type}>
                      <div className="luxe-schedule-time">{timeStr}</div>
                      <div className="luxe-schedule-body">
                        <h3>{ev.title}</h3>
                        <p className="luxe-schedule-date">{dateStr}</p>
                        {ev.lunarDate && (
                          <p className="luxe-schedule-lunar">🌙 {ev.lunarDate}</p>
                        )}
                        {ev.locationUrl ? (
                          <a
                            href={ev.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="luxe-schedule-location"
                          >
                            📍 {ev.locationName}
                          </a>
                        ) : (
                          <p className="luxe-schedule-location">📍 {ev.locationName}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
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
              <div className="timeline">
                {data.storyMilestones.map((milestone, index) => {
                  const milestoneDate = new Date(milestone.date);
                  const statusClass = milestoneDate.getTime() < Date.now() ? "completed" : "upcoming";

                  return (
                    <div
                      key={`${milestone.title}-${index}`}
                      className={`timeline-item ${index % 2 === 0 ? "left" : "right"} ${
                        visibleMilestones.has(index) ? "visible" : ""
                      }`}
                      data-timeline-index={index}
                    >
                      <div className={`timeline-marker ${statusClass}`} />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <h3 className="timeline-title">{milestone.title}</h3>
                          <time className="timeline-date">{milestone.date}</time>
                        </div>
                        {milestone.image ? (
                          <img src={milestone.image} alt={milestone.title} className="timeline-image" />
                        ) : null}
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
              <h2>Collected In Twelve Frames</h2>
              <p>A structured visual grid that feels calm, premium, and polished.</p>
            </div>

            <div className="wedding-gallery-grid">
              {data.galleryImages.slice(0, 12).map((image, index) => (
                <a className="wedding-gallery-thumb image-popup animate-box" href={image} key={`${image}-${index}`}>
                  <img src={image} alt={`Wedding gallery ${index + 1}`} />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="messages" className="luxe-section luxe-rsvp-band">
          <div className="container">
              <div className="luxe-rsvp-card animate-box">
              <span className="luxe-kicker">Friend Message</span>
              <h2>Send Your Wishes</h2>
              <p>Leave a short message for the couple — your words will appear below.</p>

              <div style={{ marginBottom: 18 }}>
                <h3 style={{ marginBottom: 12 }}>Messages</h3>
                <MessageList />
              </div>

              <MessageForm />
            </div>
          </div>
        </section>
      </main>

        <footer className="luxe-footer">
          <div className="container text-center">
            <p className="luxe-footer-mark">{data.groomName} &amp; {data.brideName}</p>
            <p className="luxe-footer-text">Crafted for a wedding story told with calm elegance and modern warmth.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
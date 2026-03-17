import React from "react";
import type { WeddingData } from "../lib/wedding-data";

type WeddingTemplateProps = {
  data: WeddingData;
};

export default function WeddingTemplate({ data }: WeddingTemplateProps) {
  return (
    <div id="fh5co-wrapper">
      <div id="fh5co-page" className="luxe-page">
        <header className="luxe-topbar">
          <div className="container luxe-topbar-inner">

            <nav className="luxe-nav" aria-label="Homepage sections">
              <a href="#couple">Couple</a>
              <a href="#story">Story</a>
              <a href="#gallery">Gallery</a>
              <a href="#rsvp">RSVP</a>
            </nav>
          </div>
        </header>

        <section
          id="home"
          className="luxe-hero"
          style={{ backgroundImage: `linear-gradient(135deg, rgba(33, 30, 29, 0.56), rgba(33, 30, 29, 0.2)), url(${data.heroImage})` }}
        >
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
                  <div className="luxe-meta-pill">
                    <strong>Location</strong>
                    <span>{data.location}</span>
                  </div>
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
                  const lunarText = primary?.lunarDate || '';

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
                          {lunarText ? (
                            <div className="lunar-note">Tức {lunarText}</div>
                          ) : null}
                        </div>

                        <div className="col-year">
                          <div className="col-label">NĂM</div>
                          <div className="col-value">{year}</div>
                        </div>
                      </div>

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

        <section id="story" className="luxe-section luxe-section-white">
          <div className="container">
            <div className="luxe-section-heading text-center animate-box">
              <span className="luxe-kicker">Love Story</span>
              <h2>Moments That Led Us Here</h2>
              <p>A cleaner, editorial timeline to tell the relationship story with more breathing room.</p>
            </div>

            <div className="luxe-story-grid">
              {data.storyMilestones.map((milestone, index) => (
                <article className="luxe-story-card animate-box" key={`${milestone.title}-${index}`}>
                  <span className="luxe-story-index">0{index + 1}</span>
                  <span className="luxe-story-date">{milestone.date}</span>
                  <h3>{milestone.title}</h3>
                  <p>{milestone.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

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

        <section id="rsvp" className="luxe-section luxe-rsvp-band">
          <div className="container">
            <div className="luxe-rsvp-card animate-box">
              <span className="luxe-kicker">RSVP</span>
              <h2>Celebrate This Day With Us</h2>
              <p>Please let us know if you will be joining our wedding celebration.</p>

              <form className="luxe-rsvp-form">
                <input type="text" className="form-control" id="name" placeholder="Your name" />
                <input type="email" className="form-control" id="email" placeholder="Your email" />
                <button type="submit" className="btn btn-primary btn-block">
                  Confirm Attendance
                </button>
              </form>
            </div>
          </div>
        </section>

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
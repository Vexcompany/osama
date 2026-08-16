"use client";

import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";

const NAV_LINKS = [
  { label: "Beranda", href: "#hero" },
  { label: "Keunggulan", href: "#keunggulan" },
  { label: "Kirim Aspirasi", href: "#aspirasi" },
  { label: "Tentang OSIS", href: "#tentang" },
];

// Section IDs in document order, for active detection
const SECTION_IDS = ["hero", "keunggulan", "aspirasi", "rules"];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("#hero");
  const [scrolled, setScrolled] = useState(false);

  // Detect active section via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.id;
          if (id === "tentang" || id === "aspirasi") {
            setActiveHref("#aspirasi");
          } else {
            setActiveHref(`#${id}`);
          }
        }
      },
      { threshold: 0.3, rootMargin: "-60px 0px -40% 0px" }
    );

    const sections = [...SECTION_IDS, "tentang"].map((id) =>
      document.getElementById(id)
    );
    sections.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Detect scroll for navbar opacity
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <nav
        className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}
        aria-label="Navigasi utama"
      >
        <div className={styles.inner}>
          {/* Logo */}
          <a
            href="#hero"
            className={styles.logo}
            aria-label="Osis Ngobrol Yuk — Beranda"
            data-tour="brand"
            onClick={(e) => handleLinkClick(e, "#hero")}
          >
            <span className={styles.logoMark} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                <path
                  d="M12 3 C7 8 7 12 12 15.5 C17 12 17 8 12 3 Z"
                  fill="rgba(255,255,255,0.95)"
                />
                <path
                  d="M12 8.5 C9.5 11 9.5 13.5 12 16 C14.5 13.5 14.5 11 12 8.5 Z"
                  fill="#0b4d68"
                />
              </svg>
            </span>
            <span className={styles.logoText}>
              <span className={styles.logoMain}>Osis Ngobrol Yuk</span>
              <span className={styles.logoSub}>SMKN 5 Madiun</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className={styles.links} role="list">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`${styles.link} ${activeHref === l.href ? styles.linkActive : ""}`}
                role="listitem"
                aria-current={activeHref === l.href ? "page" : undefined}
                onClick={(e) => handleLinkClick(e, l.href)}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <a
            href="#aspirasi"
            className={styles.cta}
            onClick={(e) => handleLinkClick(e, "#aspirasi")}
          >
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
              <path
                d="M3 10 L17 10 M11 4 L17 10 L11 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Kirim Aspirasi
          </a>

          {/* Mobile menu button */}
          <button
            className={styles.menuBtn}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="nav-drawer"
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              viewBox="0 0 20 20"
              width="18"
              height="18"
              fill="none"
              aria-hidden="true"
              className={open ? styles.iconHide : ""}
            >
              <path d="M3 6 H17 M3 10 H17 M3 14 H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <svg
              viewBox="0 0 20 20"
              width="18"
              height="18"
              fill="none"
              aria-hidden="true"
              className={open ? "" : styles.iconHide}
            >
              <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          id="nav-drawer"
          className={styles.drawer}
          role="dialog"
          aria-label="Menu navigasi"
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`${styles.drawerLink} ${activeHref === l.href ? styles.drawerLinkActive : ""}`}
              aria-current={activeHref === l.href ? "page" : undefined}
              onClick={(e) => handleLinkClick(e, l.href)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#aspirasi"
            className={styles.drawerCta}
            onClick={(e) => handleLinkClick(e, "#aspirasi")}
          >
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
              <path
                d="M3 10 L17 10 M11 4 L17 10 L11 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Kirim Aspirasi
          </a>
        </div>
      )}
    </>
  );
}

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
        // Find the topmost section that is intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.id;
          // Map section id back to nav href
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
    const onScroll = () => setScrolled(window.scrollY > 20);
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
              <svg viewBox="0 0 32 32" width="18" height="18" fill="none">
                <circle cx="16" cy="16" r="10" fill="rgba(255,255,255,0.15)" />
                <path
                  d="M9 18 C 11 22, 21 22, 23 18"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="12" cy="14" r="1.8" fill="white" opacity="0.8" />
                <circle cx="20" cy="14" r="1.8" fill="white" opacity="0.8" />
              </svg>
            </span>
            <span className={styles.logoText}>
              <span className={styles.logoMain}>Osis Ngobrol Yuk!</span>
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
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
                <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
                <path d="M3 6 H17 M3 10 H17 M3 14 H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className={styles.drawer} role="dialog" aria-label="Menu navigasi">
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

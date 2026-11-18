"use client";

/**
 * Optimaflow phone demo: a coded phone that plays one 24 s loop.
 * 1. A made-up company's website, and a tap on the chat button.
 * 2. The chat: a question, typing dots, a reply, the request form filled in and sent.
 * 3. The request arriving in the company's customer panel.
 *
 * Ported from the standalone optimaflow-phone-demo.html. A timer moves `at`
 * (percent of the loop) to the next moment where something changes, and CSS
 * transitions do the motion. It pauses off screen and in a hidden tab, and shows
 * one still frame for visitors who ask for reduced motion. All data is made up.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { Locale } from "@/i18n/config";
import styles from "./OptimaflowPhoneDemo.module.css";

const LOOP_MS = 24000;
/** Still frame for reduced motion: the chat with the request sent. */
const STILL_AT = 68;

/** When each part is shown: [from, until) in percent of the loop. */
const SPANS = {
  site: [0, 13],
  launcherTap: [8, 11],
  chat: [13, 71],
  visitor1: [19, 100],
  bot1Row: [23, 100],
  bot1Dots: [23, 28],
  bot1Text: [28, 100],
  visitor2: [35, 100],
  bot2Row: [38, 100],
  bot2Dots: [38, 43],
  bot2Text: [43, 100],
  formRow: [46, 100],
  nameValue: [50, 100],
  emailValue: [53, 100],
  checkMark: [56, 100],
  sendTap: [58, 59],
  sendLabel: [0, 59],
  sendingLabel: [59, 100],
  thanks: [62, 100],
  contactChip: [0, 62],
  contactTap: [45, 46],
  contactRing: [46, 62],
  panel: [71, 98],
  newRow: [75, 100],
} as const satisfies Record<string, readonly [number, number]>;

type Part = keyof typeof SPANS;

/** Every moment where something changes, sorted. */
const MOMENTS = Array.from(
  new Set(
    Object.values(SPANS).flatMap(([from, until]) => (until < 100 ? [from, until] : [from])),
  ),
).sort((a, b) => a - b);

function nextMoment(at: number) {
  const next = MOMENTS.find((moment) => moment > at);
  if (next === undefined) return { at: 0, waitMs: ((100 - at) / 100) * LOOP_MS };
  return { at: next, waitMs: ((next - at) / 100) * LOOP_MS };
}

type Row = { name: string; service: string; time: string; email: string };

type Copy = {
  [Key in
    | "label" | "company" | "siteKicker" | "siteTitle" | "siteTitle2" | "siteText" | "siteBook"
    | "chip1" | "chip2" | "status" | "aiNote" | "welcome" | "visitor1" | "bot1" | "visitor2"
    | "bot2" | "bookBtn" | "contactBtn" | "nameLabel" | "nameValue" | "emailLabel" | "emailValue"
    | "consent" | "send" | "sending" | "thanks" | "placeholder" | "panelBadge" | "panelTitle"
    | "newBadge" | "preferredTime"]: string;
} & { rows: Row[] };

const COPY: Record<Locale, Copy> = {
  en: {
    label:
      "Phone demo: a visitor asks for a cleaning time in the chat, sends a request, and it shows up in the customer panel.",
    company: "Glansa Cleaning",
    siteKicker: "Home cleaning",
    siteTitle: "Your home. Clean.",
    siteTitle2: "Without lifting a finger.",
    siteText: "Kitchens, bathrooms and floors. The same team every visit.",
    siteBook: "Book",
    chip1: "Insured",
    chip2: "Eco-friendly",
    status: "Virtual assistant • Online",
    aiNote:
      "You are chatting with a virtual assistant. The conversation is stored to give you better service.",
    welcome: "Hi! How can I help you today?",
    visitor1: "Hi, do you have time for home cleaning on Friday?",
    bot1: "Yes, Friday at 9 or 1 works. Would you like to book one of them?",
    visitor2: "Yes, 9 please",
    bot2: 'Great! Tap "Contact us" below and we will confirm 9:00 with you.',
    bookBtn: "Book a time",
    contactBtn: "Contact us",
    nameLabel: "Name",
    nameValue: "Adam Holm",
    emailLabel: "Email",
    emailValue: "adam@example.com",
    consent: "I agree that my details are sent to Glansa Cleaning so they can contact me.",
    send: "Send request",
    sending: "Sending…",
    thanks: "Thanks! We will be in touch.",
    placeholder: "Write a message...",
    panelBadge: "Customer panel",
    panelTitle: "Bookings",
    newBadge: "New",
    preferredTime: "Preferred time",
    rows: [
      { name: "Adam Holm", service: "Home cleaning", time: "Friday 09:00", email: "adam@example.com" },
      { name: "Maria Lind", service: "Move-out cleaning", time: "Saturday 10:00", email: "maria@example.com" },
      { name: "Sofia Berg", service: "Office cleaning", time: "Monday 07:00", email: "sofia@example.com" },
    ],
  },
  sv: {
    label:
      "Demo i en telefon: en besökare frågar efter en städtid i chatten, skickar en förfrågan, och den dyker upp i kundpanelen.",
    company: "Glansa Städ",
    siteKicker: "Hemstädning",
    siteTitle: "Ditt hem. Rent.",
    siteTitle2: "Utan att lyfta ett finger.",
    siteText: "Kök, badrum och golv. Samma team varje gång.",
    siteBook: "Boka",
    chip1: "Försäkrade",
    chip2: "Miljövänligt",
    status: "Virtuell assistent • Online",
    aiNote:
      "Du chattar med en virtuell assistent. Konversationen sparas för att ge dig bättre service.",
    welcome: "Hej! Hur kan jag hjälpa dig idag?",
    visitor1: "Hej, har ni tid för hemstädning på fredag?",
    bot1: "Ja, fredag kl. 9 eller 13 går bra. Vill du boka någon av dem?",
    visitor2: "Ja, kl. 9 tack",
    bot2: 'Toppen! Tryck på "Kontakta oss" här nedanför så bekräftar vi kl. 9 med dig.',
    bookBtn: "Boka tid",
    contactBtn: "Kontakta oss",
    nameLabel: "Namn",
    nameValue: "Adam Holm",
    emailLabel: "E-post",
    emailValue: "adam@example.com",
    consent: "Jag godkänner att mina uppgifter skickas till Glansa Städ så att de kan kontakta mig.",
    send: "Skicka förfrågan",
    sending: "Skickar…",
    thanks: "Tack! Vi hör av oss.",
    placeholder: "Skriv ett meddelande...",
    panelBadge: "Kundpanel",
    panelTitle: "Bokningar",
    newBadge: "Ny",
    preferredTime: "Önskad tid",
    rows: [
      { name: "Adam Holm", service: "Hemstädning", time: "fredag 09:00", email: "adam@example.com" },
      { name: "Maria Lind", service: "Flyttstädning", time: "lördag 10:00", email: "maria@example.com" },
      { name: "Sofia Berg", service: "Kontorsstädning", time: "måndag 07:00", email: "sofia@example.com" },
    ],
  },
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={dark ? `${styles.status} ${styles.statusDark}` : styles.status}>
      <span>00:00</span>
      <span className={styles.statusIcons}>
        <svg width="15" height="10" viewBox="0 0 15 10" fill="currentColor">
          <rect x="0" y="7" width="2.6" height="3" rx="0.6" />
          <rect x="4" y="5" width="2.6" height="5" rx="0.6" />
          <rect x="8" y="2.5" width="2.6" height="7.5" rx="0.6" />
          <rect x="12" y="0" width="2.6" height="10" rx="0.6" />
        </svg>
        <svg width="13" height="10" viewBox="0 0 13 10" fill="currentColor">
          <path d="M6.5 2.2c1.8 0 3.4.7 4.6 1.8l1-1A8 8 0 0 0 6.5.8 8 8 0 0 0 .9 3l1 1a6.5 6.5 0 0 1 4.6-1.8Z" />
          <path d="M6.5 5c1 0 1.9.4 2.6 1l1-1a5 5 0 0 0-7.2 0l1 1c.7-.6 1.6-1 2.6-1Z" />
          <circle cx="6.5" cy="8.4" r="1.3" />
        </svg>
        <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
          <rect x="0.5" y="0.5" width="18" height="9" rx="2.5" stroke="currentColor" opacity="0.45" />
          <rect x="2" y="2" width="13" height="6" rx="1.4" fill="currentColor" />
          <rect x="19.8" y="3.3" width="1.6" height="3.4" rx="0.8" fill="currentColor" opacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

export function OptimaflowPhoneDemo() {
  const { locale } = useLanguage();
  const t = COPY[locale];
  const frameRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [loopAt, setLoopAt] = useState(0);
  const at = reducedMotion ? STILL_AT : loopAt;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || reducedMotion) return;

    let current = 0;
    let timer: number | undefined;
    let onScreen = false;

    const stop = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };

    const run = () => {
      stop();
      if (!onScreen || document.hidden) return;
      const next = nextMoment(current);
      timer = window.setTimeout(() => {
        current = next.at;
        setLoopAt(current);
        run();
      }, next.waitMs);
    };

    const observer = new IntersectionObserver((entries) => {
      onScreen = entries[0]?.isIntersecting ?? false;
      run();
    });
    observer.observe(frame);
    document.addEventListener("visibilitychange", run);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", run);
    };
  }, [reducedMotion]);

  const isOn = (part: Part) => {
    const [from, until] = SPANS[part];
    return from <= at && at < until;
  };
  /** Joins module classes and adds `on` while the part is shown. */
  const cx = (part: Part | null, ...names: string[]) =>
    [...names.map((name) => styles[name]), part && isOn(part) ? styles.on : null]
      .filter(Boolean)
      .join(" ");

  return (
    <div ref={frameRef} className={styles.frame} role="img" aria-label={t.label}>
      <div className={styles.screen} aria-hidden="true" inert>
        <div className={styles.island} />
        <div className={styles.homeBar} />

        {/* 1. The company's site, and a tap on the chat button. */}
        <div className={cx("site", "scene", "site")}>
          <div className={styles.sitePhoto} />
          <StatusBar />
          <div className={styles.siteNav}>
            <span className={styles.siteLogo} />
            <span>{t.company}</span>
            <span className={styles.siteBook}>{t.siteBook}</span>
          </div>
          <div className={styles.siteHero}>
            <p className={styles.siteKicker}>{t.siteKicker}</p>
            <p className={styles.siteTitle}>
              {t.siteTitle}
              <br />
              {t.siteTitle2}
            </p>
            <p className={styles.siteText}>{t.siteText}</p>
            <div className={styles.siteChips}>
              <span>{t.chip1}</span>
              <span>{t.chip2}</span>
            </div>
          </div>
          <span className={cx("launcherTap", "launcher", "tap")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
        </div>

        {/* 2. The chat, as the widget shows it. */}
        <div className={cx("chat", "scene", "chat")}>
          <StatusBar />
          <div className={styles.chatHeader}>
            <div>
              <p className={styles.chatName}>{t.company}</p>
              <p className={styles.chatStatus}>{t.status}</p>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>
          <p className={styles.aiNote}>{t.aiNote}</p>

          <div className={styles.messages}>
            <div className={styles.messagesInner}>
              <div className={styles.row}>
                <div className={styles.rowInner}>
                  <span className={`${styles.bubble} ${styles.bot}`}>{t.welcome}</span>
                </div>
              </div>

              <div className={cx("visitor1", "row", "grow")}>
                <div className={`${styles.rowInner} ${styles.rowUser}`}>
                  <span className={`${styles.bubble} ${styles.user}`}>{t.visitor1}</span>
                </div>
              </div>

              <div className={cx("bot1Row", "row", "grow")}>
                <div className={styles.rowInner}>
                  <span className={styles.stack}>
                    <span className={cx("bot1Dots", "bubble", "bot", "dots", "fade")}>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className={cx("bot1Text", "bubble", "bot", "fade")}>{t.bot1}</span>
                  </span>
                </div>
              </div>

              <div className={cx("visitor2", "row", "grow")}>
                <div className={`${styles.rowInner} ${styles.rowUser}`}>
                  <span className={`${styles.bubble} ${styles.user}`}>{t.visitor2}</span>
                </div>
              </div>

              <div className={cx("bot2Row", "row", "grow")}>
                <div className={styles.rowInner}>
                  <span className={styles.stack}>
                    <span className={cx("bot2Dots", "bubble", "bot", "dots", "fade")}>
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className={cx("bot2Text", "bubble", "bot", "fade")}>{t.bot2}</span>
                  </span>
                </div>
              </div>

              <div className={cx("formRow", "row", "grow")}>
                <div className={styles.rowInner}>
                  <div className={styles.form}>
                    <div className={styles.field}>
                      <div className={styles.fieldLabel}>{t.nameLabel}</div>
                      <div className={styles.fieldBox}>
                        <span className={cx("nameValue", "fade")}>{t.nameValue}</span>
                      </div>
                    </div>
                    <div className={styles.field}>
                      <div className={styles.fieldLabel}>{t.emailLabel}</div>
                      <div className={styles.fieldBox}>
                        <span className={cx("emailValue", "fade")}>{t.emailValue}</span>
                      </div>
                    </div>
                    <div className={styles.consent}>
                      <span className={styles.check}>
                        <span className={cx("checkMark", "checkMark", "fade")} />
                      </span>
                      <span>{t.consent}</span>
                    </div>
                    <span className={cx("sendTap", "sendBtn", "tap")}>
                      <span className={cx("sendLabel", "fade")}>{t.send}</span>
                      <span className={cx("sendingLabel", "fade")}>{t.sending}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className={cx("thanks", "row", "grow")}>
                <div className={styles.rowInner}>
                  <span className={`${styles.bubble} ${styles.bot}`}>{t.thanks}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed buttons: "Book a time" always; "Contact us" opens the form and goes away once it is sent. */}
          <div className={styles.chips}>
            <span className={styles.chip}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
              <span>{t.bookBtn}</span>
            </span>
            <span className={cx("contactChip", "chipWrap")}>
              <span className={cx("contactTap", "chip", "tap")}>
                <span className={cx("contactRing", "chipRing", "fade")} />
                <svg className={styles.chipLayer} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                </svg>
                <span className={styles.chipLayer}>{t.contactBtn}</span>
              </span>
            </span>
          </div>

          <div className={styles.inputBar}>
            <span className={styles.input}>{t.placeholder}</span>
            <span className={styles.sendIcon}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4z" />
                <path d="M22 2 11 13" />
              </svg>
            </span>
          </div>
          <p className={styles.powered}>Powered by Optimaflow</p>
        </div>

        {/* 3. The request in the customer panel. */}
        <div className={cx("panel", "scene", "panel")}>
          <StatusBar dark />
          <div className={styles.panelTop}>
            <span>Optimaflow</span>
            <span className={styles.panelBadge}>{t.panelBadge}</span>
          </div>
          <p className={styles.panelTitle}>{t.panelTitle}</p>
          <div>
            {t.rows.map((row, i) => (
              <div key={row.email} className={i === 0 ? cx("newRow", "row", "grow") : styles.row}>
                <div className={i === 0 ? `${styles.card} ${styles.cardNew}` : styles.card}>
                  <div className={styles.cardHead}>
                    <span>{row.name}</span>
                    {i === 0 ? <span className={styles.newBadge}>{t.newBadge}</span> : null}
                  </div>
                  <p className={styles.cardLine}>
                    {row.service} · {t.preferredTime} {row.time}
                  </p>
                  <p className={styles.cardLine}>{row.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

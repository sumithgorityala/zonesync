import { useState, useEffect, useRef, useCallback } from "react";

// ─── City Database ────────────────────────────────────────────────────────────
const CITIES = [
  { name: "Cleveland", tz: "America/New_York", country: "US", state: "OH" },
  { name: "New York", tz: "America/New_York", country: "US", state: "NY" },
  { name: "Los Angeles", tz: "America/Los_Angeles", country: "US", state: "CA" },
  { name: "Chicago", tz: "America/Chicago", country: "US", state: "IL" },
  { name: "Houston", tz: "America/Chicago", country: "US", state: "TX" },
  { name: "Phoenix", tz: "America/Phoenix", country: "US", state: "AZ" },
  { name: "Denver", tz: "America/Denver", country: "US", state: "CO" },
  { name: "Seattle", tz: "America/Los_Angeles", country: "US", state: "WA" },
  { name: "Miami", tz: "America/New_York", country: "US", state: "FL" },
  { name: "Toronto", tz: "America/Toronto", country: "CA" },
  { name: "Vancouver", tz: "America/Vancouver", country: "CA" },
  { name: "London", tz: "Europe/London", country: "GB" },
  { name: "Paris", tz: "Europe/Paris", country: "FR" },
  { name: "Berlin", tz: "Europe/Berlin", country: "DE" },
  { name: "Amsterdam", tz: "Europe/Amsterdam", country: "NL" },
  { name: "Madrid", tz: "Europe/Madrid", country: "ES" },
  { name: "Rome", tz: "Europe/Rome", country: "IT" },
  { name: "Stockholm", tz: "Europe/Stockholm", country: "SE" },
  { name: "Dubai", tz: "Asia/Dubai", country: "AE" },
  { name: "Mumbai", tz: "Asia/Kolkata", country: "IN" },
  { name: "Delhi", tz: "Asia/Kolkata", country: "IN" },
  { name: "Bangalore", tz: "Asia/Kolkata", country: "IN" },
  { name: "Singapore", tz: "Asia/Singapore", country: "SG" },
  { name: "Tokyo", tz: "Asia/Tokyo", country: "JP" },
  { name: "Seoul", tz: "Asia/Seoul", country: "KR" },
  { name: "Hong Kong", tz: "Asia/Hong_Kong", country: "HK" },
  { name: "Shanghai", tz: "Asia/Shanghai", country: "CN" },
  { name: "Beijing", tz: "Asia/Shanghai", country: "CN" },
  { name: "Sydney", tz: "Australia/Sydney", country: "AU" },
  { name: "Melbourne", tz: "Australia/Melbourne", country: "AU" },
  { name: "Auckland", tz: "Pacific/Auckland", country: "NZ" },
  { name: "São Paulo", tz: "America/Sao_Paulo", country: "BR" },
  { name: "Mexico City", tz: "America/Mexico_City", country: "MX" },
  { name: "Buenos Aires", tz: "America/Argentina/Buenos_Aires", country: "AR" },
  { name: "Cairo", tz: "Africa/Cairo", country: "EG" },
  { name: "Nairobi", tz: "Africa/Nairobi", country: "KE" },
  { name: "Istanbul", tz: "Europe/Istanbul", country: "TR" },
  { name: "Moscow", tz: "Europe/Moscow", country: "RU" },
  { name: "Karachi", tz: "Asia/Karachi", country: "PK" },
  { name: "Riyadh", tz: "Asia/Riyadh", country: "SA" },
];

const FLAG = (code) =>
  code.toUpperCase().split("").map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join("");

// ─── Time Utilities ───────────────────────────────────────────────────────────
function getDateAtOffset(base, hourOffset) {
  const d = new Date(base);
  d.setHours(d.getHours() + hourOffset);
  return d;
}

function getLocalHour(base, tz, offset) {
  const d = getDateAtOffset(base, offset);
  const str = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(d);
  const h = parseInt(str);
  return isNaN(h) ? 0 : h === 24 ? 0 : h;
}

function formatHour(base, tz, offset, use24) {
  const d = getDateAtOffset(base, offset);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: !use24,
  }).format(d);
}

function formatDay(base, tz, offset) {
  const d = getDateAtOffset(base, offset);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", month: "short", day: "numeric",
  }).format(d);
}

function getNowIndex(base, tz, cols) {
  const nowH = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date())
  );
  for (let i = 0; i < cols; i++) {
    if (getLocalHour(base, tz, i) === (nowH === 24 ? 0 : nowH)) return i;
  }
  return -1;
}

function getBestWindows(cities, base) {
  return Array.from({ length: 24 }, (_, i) => {
    let score = 0;
    cities.forEach((c) => {
      const h = getLocalHour(base, c.tz, i);
      if (h >= 9 && h < 18) score += 2;
      else if ((h >= 7 && h < 9) || (h >= 18 && h < 20)) score += 1;
      else score -= 3;
    });
    return { offset: i, score };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
}

// ─── ICS Generator ────────────────────────────────────────────────────────────
function generateICS(title, base, tz, startOffset, endOffset) {
  const pad = (n) => String(n).padStart(2, "0");
  const toICSDate = (d) => {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };
  const start = getDateAtOffset(base, startOffset);
  const end = getDateAtOffset(base, endOffset + 1);
  const now = new Date();
  const desc = `Scheduled via ZoneSync — the free global timezone scheduler.`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ZoneSync//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:zonesync-${now.getTime()}@zonesync.app`,
    `DTSTAMP:${toICSDate(now)}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${title || "Team Meeting"}`,
    `DESCRIPTION:${desc}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Meeting reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(title, base, tz, startOffset, endOffset) {
  const ics = generateICS(title, base, tz, startOffset, endOffset);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "meeting").replace(/\s+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tile color logic ─────────────────────────────────────────────────────────
function tileStyle(hour, isSelected, isHovered, isNow) {
  const work = hour >= 9 && hour < 18;
  const edge = (hour >= 7 && hour < 9) || (hour >= 18 && hour < 20);

  let bg = work ? "#1f3b2e" : edge ? "#2d2510" : "#111520";
  let text = work ? "#4ade80" : edge ? "#fbbf24" : "#2a3040";
  let border = "2px solid transparent";

  if (isNow) border = "2px solid #60a5fa";
  if (isHovered && !isSelected) { bg = work ? "#254834" : edge ? "#352c14" : "#181e2e"; }
  if (isSelected) { bg = "#1a3660"; text = "#93c5fd"; border = "2px solid #3b82f6"; }

  return { bg, text, border };
}

// ─── Main App ────────────────────────────────────────────────────────────────
const COLS = 24;
const DEFAULT_CITIES = ["Cleveland", "London", "Mumbai", "Tokyo"];

export default function App() {
  const [cities, setCities] = useState(
    DEFAULT_CITIES.map((n) => CITIES.find((c) => c.name === n)).filter(Boolean)
  );
  const [base, setBase] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [use24, setUse24] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [range, setRange] = useState(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCalModal, setShowCalModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("Team Meeting");
  const [aiPanel, setAiPanel] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const searchRef = useRef(null);
  const gridRef = useRef(null);

  // Tick every minute
  useEffect(() => {
    const t = setInterval(() => {
      setBase((prev) => {
        const d = new Date();
        d.setMinutes(0, 0, 0);
        return d;
      });
    }, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  // Global mouseup to finish drag
  useEffect(() => {
    const up = () => setDragStart(null);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("touchend", up); };
  }, []);

  const filtered = CITIES.filter(
    (c) => !cities.find((s) => s.name === c.name) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.state?.toLowerCase().includes(search.toLowerCase()) ||
        c.country.toLowerCase().includes(search.toLowerCase()))
  );

  const addCity = (city) => { setCities((p) => [...p, city]); setShowSearch(false); setSearch(""); };
  const removeCity = (name) => setCities((p) => p.filter((c) => c.name !== name));

  const startDrag = (i) => { setDragStart(i); setRange([i, i]); };
  const moveDrag = (i) => {
    setHovered(i);
    if (dragStart !== null) setRange([Math.min(dragStart, i), Math.max(dragStart, i)]);
  };

  const toast_ = (msg, color = "#22c55e") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const copyMeeting = () => {
    if (!range) return;
    const lines = cities.map((c) =>
      `${FLAG(c.country)} ${c.name}: ${formatHour(base, c.tz, range[0], use24)} – ${formatHour(base, c.tz, range[1] + 1, use24)} (${formatDay(base, c.tz, range[0])})`
    );
    navigator.clipboard.writeText(lines.join("\n")).then(() => toast_("📋 Copied to clipboard!"));
  };

  const openCalModal = () => { if (!range) return; setShowCalModal(true); };

  const handleDownloadICS = () => {
    cities.forEach((c) => {
      downloadICS(meetingTitle, base, c.tz, range[0], range[1]);
    });
    setShowCalModal(false);
    toast_("📅 Calendar file downloaded! Open it to add to iOS or Android Calendar.", "#4f8ef7");
  };

  const handleGoogleCal = () => {
    const start = getDateAtOffset(base, range[0]);
    const end = getDateAtOffset(base, range[1] + 1);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meetingTitle)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent("Scheduled via ZoneSync")}`;
    window.open(url, "_blank");
    setShowCalModal(false);
  };

  const handleOutlook = () => {
    const start = getDateAtOffset(base, range[0]);
    const end = getDateAtOffset(base, range[1] + 1);
    const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(meetingTitle)}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${encodeURIComponent("Scheduled via ZoneSync")}`;
    window.open(url, "_blank");
    setShowCalModal(false);
  };

  const getAI = async () => {
    setAiLoading(true);
    setAiPanel({ loading: true });
    const windows = getBestWindows(cities, base);
    const cityInfo = cities.map((c) => `${c.name} (${c.tz})`).join(", ");
    const windowsText = windows.map((w, i) => {
      const times = cities.map((c) => `${c.name}: ${formatHour(base, c.tz, w.offset, false)}`).join(", ");
      return `Option ${i + 1}: ${times}`;
    }).join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a meeting scheduler assistant. Team is in: ${cityInfo}.\n\nTop meeting windows:\n${windowsText}\n\nGive a friendly 2-3 sentence recommendation for the best option, mentioning actual local times. End with one emoji.`,
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "Could not generate suggestion.";
      setAiPanel({ text, windows });
    } catch {
      setAiPanel({ text: "Could not reach AI. Try again.", windows: [] });
    }
    setAiLoading(false);
  };

  const now = new Date();

  // Navigate days
  const shiftDay = (dir) => {
    setBase((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      d.setHours(0, 0, 0, 0);
      return d;
    });
    setRange(null);
  };

  const today = () => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    setBase(d);
    setRange(null);
  };

  const isToday = base.toDateString() === new Date().toDateString();

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e2e8f0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{ background: "#0d1220", borderBottom: "1px solid #1e2740", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🌐</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.5px" }}>ZoneSync</div>
            <div style={{ fontSize: 10, color: "#475569" }}>Free global team scheduler</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <Btn onClick={() => setUse24((v) => !v)}>{use24 ? "24h" : "12h"}</Btn>
          <Btn onClick={() => setShowSearch(true)} accent>+ Add City</Btn>
          {range && <Btn onClick={copyMeeting} green>📋 Copy</Btn>}
          {range && <Btn onClick={openCalModal} blue>📅 Add to Calendar</Btn>}
          <Btn onClick={() => toast_("✨ AI Best Time — Coming Soon!", "#8b5cf6")} purple>✨ AI Best Time</Btn>
        </div>
      </div>

      {/* ── DATE NAV ── */}
      <div style={{ background: "#0d1220", borderBottom: "1px solid #1a2035", padding: "8px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => shiftDay(-1)} style={navBtnStyle}>‹ Prev</button>
        <button onClick={today} style={{ ...navBtnStyle, color: isToday ? "#60a5fa" : "#94a3b8", fontWeight: isToday ? 700 : 400 }}>
          {base.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </button>
        <button onClick={() => shiftDay(1)} style={navBtnStyle}>Next ›</button>
        {!isToday && <button onClick={today} style={{ ...navBtnStyle, color: "#4ade80", fontSize: 11 }}>→ Today</button>}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#334155" }}>Click & drag tiles to select a time range</div>
      </div>

      {/* ── LEGEND ── */}
      <div style={{ padding: "8px 20px", borderBottom: "1px solid #111827", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[["#1f3b2e", "#4ade80", "Business hours (9–6)"], ["#2d2510", "#fbbf24", "Early / Late (7–9, 6–8)"], ["#111520", "#2a3040", "Night"], ["#1a3660", "#93c5fd", "Your selection"]].map(([bg, tx, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1px solid ${tx}33` }} />
            <span style={{ fontSize: 10, color: "#475569" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── GRID ── */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ minWidth: Math.max(700, 170 + COLS * 46), padding: "12px 20px 28px" }}>

          {/* Hour header */}
          <div style={{ display: "flex", paddingLeft: 170, marginBottom: 6 }}>
            {Array.from({ length: COLS }, (_, i) => {
              const d = getDateAtOffset(base, i);
              const label = use24
                ? `${String(d.getHours()).padStart(2, "0")}h`
                : new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true }).format(d).replace(":00", "").toLowerCase();
              const isSel = range && i >= range[0] && i <= range[1];
              return (
                <div key={i} style={{ flex: `0 0 44px`, textAlign: "center", fontSize: 9, color: isSel ? "#60a5fa" : i === hovered ? "#94a3b8" : "#2a3550", fontWeight: isSel ? 700 : 400 }}>
                  {label}
                </div>
              );
            })}
          </div>

          {/* City rows */}
          {cities.map((city) => {
            const nowIdx = getNowIndex(base, city.tz, COLS);
            const currentTime = new Intl.DateTimeFormat("en-US", {
              timeZone: city.tz, hour: "numeric", minute: "2-digit", hour12: !use24,
            }).format(now);

            return (
              <div key={city.name} style={{ display: "flex", alignItems: "center", marginBottom: 5 }}>
                {/* Label */}
                <div style={{ width: 170, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, paddingRight: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{FLAG(city.country)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {city.name}{city.state ? <span style={{ color: "#475569", fontWeight: 400 }}>, {city.state}</span> : null}
                    </div>
                    <div style={{ fontSize: 10, color: "#60a5fa" }}>{currentTime}</div>
                  </div>
                  <button onClick={() => removeCity(city.name)} style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 16, padding: 2, lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>

                {/* Tiles */}
                <div style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: COLS }, (_, i) => {
                    const h = getLocalHour(base, city.tz, i);
                    const isSel = range && i >= range[0] && i <= range[1];
                    const isHov = hovered === i && !range;
                    const isNow = i === nowIdx;
                    const { bg, text, border } = tileStyle(h, isSel, isHov, isNow);
                    const label = use24 ? `${String(h).padStart(2, "0")}` : `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? "a" : "p"}`;

                    return (
                      <div
                        key={i}
                        onMouseDown={() => startDrag(i)}
                        onMouseEnter={() => moveDrag(i)}
                        onTouchStart={() => startDrag(i)}
                        onTouchMove={(e) => {
                          const touch = e.touches[0];
                          const el = document.elementFromPoint(touch.clientX, touch.clientY);
                          const idx = el?.dataset?.col;
                          if (idx !== undefined) moveDrag(parseInt(idx));
                        }}
                        data-col={i}
                        title={`${city.name}: ${formatHour(base, city.tz, i, use24)} — ${formatDay(base, city.tz, i)}`}
                        style={{
                          flex: "0 0 42px", height: 46, background: bg, borderRadius: 6,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", border, transition: "background 0.08s, border-color 0.08s",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <span style={{ fontSize: 10, color: text, fontWeight: isNow ? 800 : 500, lineHeight: 1 }}>{label}</span>
                        {isNow && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#60a5fa", marginTop: 3 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {cities.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}>
              Use <strong style={{ color: "#3b82f6" }}>+ Add City</strong> to get started
            </div>
          )}

          {/* Selected range summary */}
          {range && (
            <div style={{ marginTop: 16, background: "#0d1525", border: "1px solid #1e3060", borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                Selected Time Window — {formatDay(base, cities[0]?.tz ?? "UTC", range[0])}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {cities.map((c) => (
                  <div key={c.name} style={{ background: "#060a14", borderRadius: 8, padding: "8px 14px", border: "1px solid #1e2740" }}>
                    <div style={{ fontSize: 10, color: "#475569" }}>{FLAG(c.country)} {c.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#93c5fd" }}>
                      {formatHour(base, c.tz, range[0], use24)} – {formatHour(base, c.tz, range[1] + 1, use24)}
                    </div>
                    <div style={{ fontSize: 10, color: "#334155" }}>{formatDay(base, c.tz, range[0])}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={copyMeeting} style={actionBtn("#1a4030", "#4ade80")}>📋 Copy all times</button>
                <button onClick={openCalModal} style={actionBtn("#1a2a50", "#60a5fa")}>📅 Add to Calendar</button>
                <button onClick={() => setRange(null)} style={actionBtn("#2a1a1a", "#f87171")}>✕ Clear</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SEARCH MODAL ── */}
      {showSearch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}
          onClick={(e) => e.target === e.currentTarget && setShowSearch(false)}>
          <div style={{ background: "#0d1220", border: "1px solid #1e2740", borderRadius: 14, width: 340, maxWidth: "92vw", maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #1a2035" }}>
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city, state, or country…"
                style={{ width: "100%", background: "#060a14", border: "1px solid #1e2740", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtered.length === 0 && (
                <div style={{ padding: 20, color: "#475569", fontSize: 13, textAlign: "center" }}>No cities found</div>
              )}
              {filtered.map((c) => (
                <div key={c.name} onClick={() => addCity(c)}
                  style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#131b2e"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 22 }}>{FLAG(c.country)}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}{c.state ? `, ${c.state}` : ""}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{c.tz}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: "#1e3a6e", background: "#0d1a30", padding: "2px 8px", borderRadius: 20 }}>
                    {formatHour(base, c.tz, 0, use24)} now
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 14px", borderTop: "1px solid #1a2035" }}>
              <button onClick={() => setShowSearch(false)} style={{ width: "100%", padding: "8px", background: "#1a2035", border: "none", borderRadius: 8, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CALENDAR MODAL ── */}
      {showCalModal && range && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => e.target === e.currentTarget && setShowCalModal(false)}>
          <div style={{ background: "#0d1220", border: "1px solid #1e2740", borderRadius: 16, width: 400, maxWidth: "94vw", padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,0.8)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>📅 Add to Calendar</div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 18 }}>
              Works with iOS Calendar, Android Calendar, Google Calendar & Outlook
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 6, fontWeight: 600 }}>MEETING TITLE</div>
              <input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                style={{ width: "100%", background: "#060a14", border: "1px solid #1e2740", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ background: "#060a14", borderRadius: 10, padding: "12px 14px", marginBottom: 18 }}>
              {cities.slice(0, 4).map((c) => (
                <div key={c.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", borderBottom: "1px solid #0d1525" }}>
                  <span style={{ color: "#64748b" }}>{FLAG(c.country)} {c.name}</span>
                  <span style={{ color: "#93c5fd", fontWeight: 600 }}>
                    {formatHour(base, c.tz, range[0], use24)} – {formatHour(base, c.tz, range[1] + 1, use24)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#334155", marginBottom: 14, lineHeight: 1.6 }}>
              <strong style={{ color: "#475569" }}>iOS / Android:</strong> Download .ics → tap file → "Add to Calendar" opens automatically.<br />
              <strong style={{ color: "#475569" }}>Google / Outlook:</strong> Opens the calendar web app directly.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <button onClick={handleDownloadICS} style={calBtn("#1a3a60", "#60a5fa", "#1e4070")}>
                <span style={{ fontSize: 20 }}>📁</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Download .ics</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>iOS & Android Calendar</div>
                </div>
              </button>
              <button onClick={handleGoogleCal} style={calBtn("#1a3020", "#4ade80", "#1e3825")}>
                <span style={{ fontSize: 20 }}>📆</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Google Calendar</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>Opens in browser</div>
                </div>
              </button>
              <button onClick={handleOutlook} style={calBtn("#1a2040", "#818cf8", "#1e2850")}>
                <span style={{ fontSize: 20 }}>📧</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Outlook</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>Opens in browser</div>
                </div>
              </button>
              <button onClick={copyMeeting} style={calBtn("#1a1a1a", "#94a3b8", "#222")}>
                <span style={{ fontSize: 20 }}>📋</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Copy Times</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>Paste anywhere</div>
                </div>
              </button>
            </div>

            <button onClick={() => setShowCalModal(false)} style={{ width: "100%", padding: "9px", background: "#1a2035", border: "none", borderRadius: 8, color: "#64748b", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── AI PANEL ── */}
      {aiPanel && (
        <div style={{ position: "fixed", bottom: 20, right: 20, width: 360, maxWidth: "calc(100vw - 40px)", background: "#0d1220", border: "1px solid #4f46e533", borderRadius: 16, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.7)", zIndex: 150 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ✨ AI Recommendation
            </div>
            <button onClick={() => setAiPanel(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          {aiLoading ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#475569", fontSize: 13 }}>🤔 Analyzing time zones…</div>
          ) : (
            <>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: "#cbd5e1", background: "#060a14", borderRadius: 10, padding: "11px 13px", marginBottom: 12 }}>
                {aiPanel.text}
              </div>
              {aiPanel.windows?.map((w, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < 2 ? "1px solid #1a2035" : "none" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: i === 0 ? "#22c55e" : i === 1 ? "#f59e0b" : "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {cities.map((c) => `${c.name}: ${formatHour(base, c.tz, w.offset, use24)}`).join(" · ")}
                  </div>
                  <button
                    onClick={() => { setRange([w.offset, w.offset + 1]); setAiPanel(null); }}
                    style={{ marginLeft: "auto", fontSize: 10, color: "#3b82f6", background: "none", border: "1px solid #1e2740", borderRadius: 20, padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap" }}
                  >Select</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: toast.color, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 300, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ textAlign: "center", padding: "16px 0 24px", fontSize: 11, color: "#1e2740" }}>
        ZoneSync · Free forever · No login required · Works on all devices
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Btn({ children, onClick, accent, green, blue, purple }) {
  const bg = accent ? "#3b82f6" : green ? "#16a34a" : blue ? "#1e40af" : purple ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "#111827";
  const color = (accent || green || blue || purple) ? "#fff" : "#94a3b8";
  return (
    <button onClick={onClick} style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid #1e2740", background: bg, color, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
      {children}
    </button>
  );
}

const navBtnStyle = {
  background: "none", border: "none", color: "#64748b", cursor: "pointer",
  fontSize: 13, padding: "4px 8px", borderRadius: 6,
};

const actionBtn = (bg, color) => ({
  padding: "7px 14px", borderRadius: 8, border: `1px solid ${color}33`,
  background: bg, color, cursor: "pointer", fontSize: 12, fontWeight: 600,
});

const calBtn = (bg, color, hover) => ({
  display: "flex", alignItems: "center", gap: 12,
  padding: "12px 14px", borderRadius: 10, border: `1px solid ${color}33`,
  background: bg, color, cursor: "pointer", textAlign: "left", width: "100%",
});

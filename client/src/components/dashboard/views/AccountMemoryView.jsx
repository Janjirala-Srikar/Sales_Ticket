import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const API_BASE = import.meta.env.VITE_API_URL || "https://sales-ticket-backend.vercel.app/api";
const BASE = `${API_BASE}/memory`;
const GRAPH_BASE = `${API_BASE}/graph`;

// ─── Constants ──────────────────────────────────────────────
const SIGNAL_META = {
  churn_risk:         { color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", label: "Churn Risk",    icon: "⚠" },
  upsell_opportunity: { color: "#185FA5", bg: "#F0F7FF", border: "#BFDBFE", label: "Upsell",        icon: "↑" },
  renewal_due:        { color: "#92400E", bg: "#FFFBEB", border: "#FCD34D", label: "Renewal",       icon: "↺" },
  support_spike:      { color: "#065F46", bg: "#ECFDF5", border: "#6EE7B7", label: "Support",       icon: "⚡" },
  nps_drop:           { color: "#991B1B", bg: "#FFF1F2", border: "#FECDD3", label: "NPS Drop",      icon: "↓" },
  feature_request:    { color: "#0C447C", bg: "#EFF6FF", border: "#BFDBFE", label: "Feature Req",   icon: "✦" },
  payment_delay:      { color: "#7C2D12", bg: "#FFF7ED", border: "#FDBA74", label: "Payment",       icon: "!" },
};

const SIG_COLORS = {
  churn_risk:         "#DC2626",
  upsell_opportunity: "#378ADD",
  renewal_due:        "#B45309",
  support_spike:      "#059669",
  nps_drop:           "#991B1B",
  feature_request:    "#0C447C",
  payment_delay:      "#92400E",
};
const SIG_LABELS = {
  churn_risk:         "Churn risk",
  upsell_opportunity: "Upsell",
  renewal_due:        "Renewal",
  support_spike:      "Support spike",
  nps_drop:           "NPS drop",
  feature_request:    "Feature req",
  payment_delay:      "Payment delay",
};

const CHANNEL_ICONS = {
  "Phone":          "📞",
  "Email":          "✉",
  "Video Call":     "🎥",
  "Support Portal": "🎫",
  "Survey":         "📋",
  "Portal":         "🔗",
};

const PRIORITY_META = {
  high:   { label: "High",   color: "#DC2626", bg: "#FEF2F2" },
  medium: { label: "Medium", color: "#92400E", bg: "#FFFBEB" },
  low:    { label: "Low",    color: "#065F46", bg: "#ECFDF5" },
};

const LEGEND_ITEMS = [
  { color: "#185FA5", label: "Account" },
  { color: "#0F6E56", label: "Ticket" },
  ...Object.entries(SIG_COLORS).map(([k, v]) => ({ color: v, label: SIG_LABELS[k] })),
];

// ─── Shared styles ──────────────────────────────────────────
const cardStyle = {
  background: "var(--card-bg)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--card-radius)",
  padding: "20px 24px",
  boxShadow: "var(--shadow-sm)",
};

const vizCard = {
  background: "var(--card-bg)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--card-radius)",
  padding: "16px 18px",
  boxShadow: "var(--shadow-sm)",
};

const tabStyle = (active) => ({
  padding: "5px 13px", borderRadius: "var(--radius-pill)", fontSize: 12, fontWeight: 500,
  border: `1px solid ${active ? "var(--blue-primary)" : "var(--border-subtle)"}`,
  background: active ? "var(--blue-primary)" : "var(--card-bg)",
  color: active ? "#fff" : "var(--text-body)",
  cursor: "pointer", transition: "all .15s", fontFamily: "inherit",
});

// ─── Utility ────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr.replace("T", " ").split(".")[0]);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr?.slice(0, 10) || "—"; }
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr.replace("T", " ").split(".")[0]);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function useFetch(url, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!url) return;
    setLoading(true); setError(null);
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, deps);

  return { data, loading, error };
}

function skeletonStyle(h) {
  return {
    height: h, borderRadius: "var(--card-radius)",
    background: "linear-gradient(90deg, var(--bg-subtle) 25%, var(--bg-hover) 50%, var(--bg-subtle) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s infinite",
  };
}

function withAlpha(color, alpha) {
  if (!color) return `rgba(136, 136, 136, ${alpha})`;
  if (color.startsWith("rgba(") || color.startsWith("rgb(")) return color;

  const hex = color.replace("#", "");
  const normalized = hex.length === 3
    ? hex.split("").map((char) => char + char).join("")
    : hex;

  if (normalized.length !== 6) return color;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Visualization: Force Graph ─────────────────────────────
function ForceGraph({ nodes, links, filterAcct, onFilterChange, acctIds }) {
  const canvasRef = useRef(null);
  const simRef    = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !nodes.length) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement.clientWidth || 600;
    const H = Math.min(380, W * 0.6);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const filtered = filterAcct === "all" ? nodes.slice(0, 300) : (() => {
      const relT = new Set(links.filter(l => l.source === filterAcct).map(l => l.target));
      const relS = new Set(links.filter(l => relT.has(l.source)).map(l => l.target));
      const ids  = new Set([filterAcct, ...relT, ...relS]);
      return nodes.filter(n => ids.has(n.id));
    })();

    const filteredLinks = links.filter(l => {
      const sn = filtered.find(n => n.id === l.source);
      const tn = filtered.find(n => n.id === l.target);
      return sn && tn;
    }).slice(0, 500);

    const simNodes = filtered.map(d => ({ ...d }));
    const nm = {}; simNodes.forEach(n => nm[n.id] = n);

    const sigKeys = Object.keys(SIG_COLORS);
    const sigCenters = {};
    sigKeys.forEach((t, i) => {
      const a = (i / sigKeys.length) * Math.PI * 2 - Math.PI / 2;
      sigCenters[t] = { x: W / 2 + Math.cos(a) * W * 0.36, y: H / 2 + Math.sin(a) * H * 0.38 };
    });

    const nodeR = n => n.type === "account" ? 9 : n.type === "ticket" ? 5 : 4;
    const nodeCol = n => n.type === "account" ? "#185FA5" : n.type === "ticket" ? "#0F6E56" : SIG_COLORS[n.signalType] || "#888";

    const sim = d3.forceSimulation(simNodes)
      .force("link", d3.forceLink(
        filteredLinks.map(l => ({ source: nm[l.source], target: nm[l.target] })).filter(l => l.source && l.target)
      ).id(d => d.id).distance(d => d.source.type === "account" ? 55 : 35).strength(0.7))
      .force("charge", d3.forceManyBody().strength(n => n.type === "account" ? -130 : -50))
      .force("collide", d3.forceCollide(n => nodeR(n) + 3))
      .force("x", d3.forceX(n => {
        if (n.type === "account") return W / 2;
        if (n.type === "signal") return sigCenters[n.signalType]?.x || W / 2;
        return W / 2;
      }).strength(n => n.type === "signal" ? 0.45 : 0.05))
      .force("y", d3.forceY(n => {
        if (n.type === "account") return H / 2;
        if (n.type === "signal") return sigCenters[n.signalType]?.y || H / 2;
        return H / 2;
      }).strength(n => n.type === "signal" ? 0.45 : 0.05))
      .alphaDecay(0.015);

    simRef.current = sim;

    const resolvedLinks = filteredLinks
      .map(l => ({ source: nm[l.source], target: nm[l.target] }))
      .filter(l => l.source && l.target);

    let raf;
    sim.on("tick", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(150,165,180,.25)"; ctx.lineWidth = 0.7;
        resolvedLinks.forEach(l => {
          if (!l.source?.x || !l.target?.x) return;
          ctx.beginPath();
          ctx.moveTo(Math.max(5, Math.min(W - 5, l.source.x)), Math.max(5, Math.min(H - 5, l.source.y)));
          ctx.lineTo(Math.max(5, Math.min(W - 5, l.target.x)), Math.max(5, Math.min(H - 5, l.target.y)));
          ctx.stroke();
        });
        simNodes.forEach(n => {
          if (!n.x || !n.y) return;
          const x = Math.max(8, Math.min(W - 8, n.x));
          const y = Math.max(8, Math.min(H - 8, n.y));
          ctx.beginPath(); ctx.arc(x, y, nodeR(n), 0, Math.PI * 2);
          ctx.fillStyle = nodeCol(n); ctx.globalAlpha = n.type === "ticket" ? 0.65 : 0.9; ctx.fill();
          ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 0.5; ctx.stroke();
          if (n.type === "account") {
            ctx.fillStyle = "rgba(20,50,100,.55)"; ctx.font = "9px system-ui,sans-serif";
            ctx.textAlign = "center"; ctx.fillText(n.id, x, y + 18);
          }
        });
      });
    });

    return () => { sim.stop(); cancelAnimationFrame(raf); };
  }, [nodes, links, filterAcct]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Filter by account:</span>
        <select value={filterAcct} onChange={e => onFilterChange(e.target.value)}
          style={{ fontSize: 12, padding: "4px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--card-bg)", color: "var(--text-primary)", fontFamily: "inherit", cursor: "pointer" }}>
          <option value="all">All</option>
          {acctIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {LEGEND_ITEMS.slice(0, 6).map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", display: "block", borderRadius: "var(--radius-md)" }} />
    </div>
  );
}

// ─── Visualization: Journey Flowchart ───────────────────────
function JourneyChart({ acctIds }) {
  const canvasRef = useRef(null);
  const [selected, setSelected] = useState("");
  const { data: timeline, loading } = useFetch(
    selected ? `${BASE}/timeline/${selected}` : null,
    [selected]
  );

  function draw(events, acctId) {
    if (!acctId || !canvasRef.current || !events?.length) return;
    const c = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const W = c.parentElement.clientWidth || 600;
    const H = Math.max(300, Math.min(420, W * 0.55));
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px";
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, W, H);

    const chronological = [...events]
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
      .slice(-6);

    const steps = [
      { id: acctId, type: "account", title: acctId, meta: "Account root" },
      ...chronological.map((event) => ({
        id: event.id,
        type: "event",
        title: `Ticket ${event.id}`,
        meta: `${SIG_LABELS[event.dominantSignal] || "Signal"} · ${formatDate(event.date)}${event.channel ? ` · ${event.channel}` : ""}`,
        signalType: event.dominantSignal,
      })),
    ];

    const padX = 48;
    const slotW = (W - padX * 2) / Math.max(steps.length - 1, 1);
    const pts = steps.map((step, index) => ({
      x: padX + index * slotW,
      y: H / 2 + (index === 0 ? 0 : index % 2 === 0 ? -34 : 34),
    }));

    ctx.fillStyle = "rgba(100,116,139,0.72)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Oldest", padX, 24);
    ctx.textAlign = "right";
    ctx.fillText("Newest", W - padX, 24);

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      const ca = steps[i].type === "account" ? "#185FA5" : SIG_COLORS[steps[i].signalType] || "#888";
      const cb = steps[i + 1].type === "account" ? "#185FA5" : SIG_COLORS[steps[i + 1].signalType] || "#888";
      grad.addColorStop(0, withAlpha(ca, 0.33));
      grad.addColorStop(1, withAlpha(cb, 0.33));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const mx = (a.x + b.x) / 2;
      ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
      ctx.strokeStyle = grad; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    }

    steps.forEach((step, index) => {
      const point = pts[index];
      const color = step.type === "account" ? "#185FA5" : SIG_COLORS[step.signalType] || "#888";
      const radius = step.type === "account" ? 14 : 11;
      const isTop = index !== 0 && index % 2 === 0;
      const titleY = point.y + (isTop ? -(radius + 26) : radius + 20);
      const metaY = titleY + 14;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius + 5, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(color, 0.13); ctx.fill();
      ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 2; ctx.stroke();
      if (index > 0) {
        ctx.beginPath(); ctx.arc(point.x + radius - 2, point.y - radius + 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#fff"; ctx.fill();
        ctx.fillStyle = color; ctx.font = "bold 8px system-ui,sans-serif"; ctx.textAlign = "center";
        ctx.fillText(index, point.x + radius - 2, point.y - radius + 5);
      }
      ctx.fillStyle = "rgba(15,23,42,.82)"; ctx.font = "600 10px system-ui,sans-serif"; ctx.textAlign = "center";
      ctx.fillText(step.title, point.x, titleY);
      ctx.fillStyle = "rgba(100,116,139,0.9)"; ctx.font = "9px system-ui,sans-serif";
      ctx.fillText(step.meta, point.x, metaY);
    });
  }

  useEffect(() => {
    if (acctIds.length && !selected) setSelected(acctIds[0]);
  }, [acctIds, selected]);

  useEffect(() => {
    if (selected && timeline?.length) draw(timeline, selected);
  }, [selected, timeline]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Account:</span>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          style={{ fontSize: 12, padding: "5px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--card-bg)", color: "var(--text-primary)", fontFamily: "inherit", cursor: "pointer" }}>
          <option value="">Select…</option>
          {acctIds.map(id => <option key={id} value={id}>{id}</option>)}
        </select>
        {selected && timeline?.length > 0 && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Showing the latest {Math.min(timeline.length, 6)} chronological touchpoints</span>}
      </div>
      {!selected
        ? <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>Select an account to see its signal journey</div>
        : loading
          ? <div style={skeletonStyle(280)} />
          : !timeline?.length
            ? <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>No journey events found for this account.</div>
            : <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
      }
    </div>
  );
}

// ─── Visualization: Distribution + Trend Charts ─────────────
function DistributionCharts({ signalDist, hotAccounts }) {
  const distRef  = useRef(null);
  const riskRef  = useRef(null);
  const trendRef = useRef(null);
  const charts   = useRef({});

  useEffect(() => {
    if (!signalDist.length) return;
    const textCol = "rgba(71,85,105,.75)";
    const gridCol = "rgba(0,0,0,.05)";

    const types  = signalDist.map(d => d.type);
    const labels = types.map(t => (SIG_LABELS[t] || t).replace(/_/g, " "));
    const vals   = signalDist.map(d => d.count);
    const colors = types.map(t => SIG_COLORS[t] || "#888");

    if (charts.current.dist) charts.current.dist.destroy();
    charts.current.dist = new Chart(distRef.current, {
      type: "bar",
      data: { labels, datasets: [{ data: vals, backgroundColor: colors.map(c => c + "bb"), borderColor: colors, borderWidth: 1, borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textCol, font: { size: 10 } }, grid: { display: false }, border: { display: false } },
          y: { ticks: { color: textCol, font: { size: 10 } }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true },
        },
      },
    });

    if (charts.current.risk) charts.current.risk.destroy();
    const riskAccts = hotAccounts.slice(0, 6);
    charts.current.risk = new Chart(riskRef.current, {
      type: "bar",
      data: {
        labels: riskAccts.map(a => a.id),
        datasets: [{ data: riskAccts.map(a => a.signals), backgroundColor: riskAccts.map(a => (SIG_COLORS[a.dominant] || "#378ADD") + "99"), borderColor: riskAccts.map(a => SIG_COLORS[a.dominant] || "#378ADD"), borderWidth: 1, borderRadius: 4 }],
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textCol, font: { size: 10 } }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true },
          y: { ticks: { color: textCol, font: { size: 10 } }, grid: { display: false }, border: { display: false } },
        },
      },
    });

    const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const base = vals.reduce((a, b) => a + b, 0) || 60;
    const mkLine = (b, v, col, fill) => ({ data: months.map(() => Math.max(2, Math.round(b * (0.3 + Math.random() * v)))), borderColor: col, backgroundColor: fill, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: col, borderWidth: 1.5 });

    if (charts.current.trend) charts.current.trend.destroy();
    charts.current.trend = new Chart(trendRef.current, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          mkLine(base * 0.45, 0.55, "#DC2626", "#DC262622"),
          mkLine(base * 0.3, 0.4, "#378ADD", "#378ADD22"),
          mkLine(base * 0.25, 0.35, "#B45309", "#B4530922"),
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#fff", titleColor: "#0F172A", bodyColor: "#475569", borderColor: "#E2E8F0", borderWidth: 1 },
        },
        scales: {
          x: { ticks: { color: textCol, font: { size: 10 } }, grid: { display: false }, border: { display: false } },
          y: { ticks: { color: textCol, font: { size: 10 } }, grid: { color: gridCol }, border: { display: false }, beginAtZero: true },
        },
      },
    });

    return () => { Object.values(charts.current).forEach(c => c?.destroy()); };
  }, [signalDist, hotAccounts]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Signals per type</div>
          <div style={{ position: "relative", height: 200 }}><canvas ref={distRef} /></div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Top accounts by signal count</div>
          <div style={{ position: "relative", height: 200 }}><canvas ref={riskRef} /></div>
        </div>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Signal momentum over time</span>
          <div style={{ display: "flex", gap: 12 }}>
            {[["#DC2626","Churn"], ["#378ADD","Upsell"], ["#B45309","Renewal"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: c, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", height: 160 }}><canvas ref={trendRef} /></div>
      </div>
    </div>
  );
}

// ─── Viz Panel (toggle wrapper) ─────────────────────────────
function VisualizationPanel({ graphData = { nodes: [], links: [] }, hotAccounts = [], signalDist = [] }) {
  const [tab, setTab]         = useState("flow");
  const [filterAcct, setFilter] = useState("all");

  const acctIds = graphData.nodes.filter(n => n.type === "account").map(n => n.id);

  const TABS = [
    { id: "flow",    label: "Signal flow graph" },
    { id: "journey", label: "Account journey" },
    { id: "charts",  label: "Distribution & trends" },
  ];

  if (!graphData.nodes.length && !signalDist.length) {
    return (
      <div style={{ ...vizCard, textAlign: "center", color: "var(--text-muted)" }}>
        No visualization data available.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={vizCard}>
        {tab === "flow" && (
          <ForceGraph nodes={graphData.nodes} links={graphData.links} filterAcct={filterAcct} onFilterChange={setFilter} acctIds={acctIds} />
        )}
        {tab === "journey" && (
          <JourneyChart acctIds={acctIds} />
        )}
        {tab === "charts" && (
          <DistributionCharts signalDist={signalDist} hotAccounts={hotAccounts} />
        )}
      </div>
    </div>
  );
}

// ─── Table view sub-components ──────────────────────────────
function HealthBadge({ verdict }) {
  const map = {
    "At Risk": { bg: "#FEF2F2", color: "#991B1B", border: "#FCA5A5", dot: "#DC2626" },
    "Growing":  { bg: "#F0F7FF", color: "#0C447C", border: "#BFDBFE", dot: "#185FA5" },
    "Stable":   { bg: "#ECFDF5", color: "#065F46", border: "#6EE7B7", dot: "#10B981" },
  };
  const s = map[verdict] || map["Stable"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: "var(--radius-pill)",
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {verdict}
    </span>
  );
}

function SignalTag({ type, small }) {
  const m = SIGNAL_META[type] || { color: "#64748B", bg: "#F8FAFC", border: "#CBD5E1", label: type, icon: "•" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "2px 7px" : "3px 9px",
      borderRadius: "var(--radius-pill)",
      background: m.bg, border: `1px solid ${m.border}`,
      color: m.color, fontSize: small ? 11 : 12, fontWeight: 500,
    }}>
      <span style={{ fontSize: small ? 10 : 11 }}>{m.icon}</span>
      {m.label}
    </span>
  );
}

function StatusDot({ status }) {
  const map = {
    escalated: { color: "#DC2626", label: "Escalated" },
    open:      { color: "#185FA5", label: "Open" },
    closed:    { color: "#10B981", label: "Closed" },
  };
  const s = map[status] || map.open;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: s.color, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

function SummaryPanel({ accountId }) {
  const { data: summary, loading } = useFetch(accountId ? `${BASE}/summary/${accountId}` : null, [accountId]);

  if (loading) return <div style={skeletonStyle(200)} />;
  if (!summary) return null;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: "var(--radius-md)",
            background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>🏢</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              {summary.accountId}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>Account Memory</div>
          </div>
        </div>
        <HealthBadge verdict={summary.healthVerdict} />
      </div>

      <div style={{
        background: "var(--bg-subtle)", borderRadius: "var(--radius-md)",
        padding: "12px 14px", marginBottom: 16,
        borderLeft: "3px solid var(--blue-primary)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--blue-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          AI Summary
        </div>
        <p style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.6, margin: 0 }}>
          {summary.aiSummary}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[
          { label: "Signals",   value: summary.totalSignals },
          { label: "Tickets",   value: summary.totalTickets },
          { label: "Sig Types", value: summary.signalTypes?.length || 0 },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "var(--bg-page)", borderRadius: "var(--radius-sm)",
            padding: "10px 12px", border: "1px solid var(--border-subtle)", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--blue-primary)", letterSpacing: "-0.02em" }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {summary.topSignals?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Top Signals
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {summary.topSignals.map((s) => (
              <div key={s.type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <SignalTag type={s.type} small />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>×{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionItemsPanel({ accountId }) {
  const { data: items, loading } = useFetch(accountId ? `${BASE}/action-items/${accountId}` : null, [accountId]);
  const [done, setDone] = useState({});

  if (loading) return <div style={skeletonStyle(240)} />;
  if (!items?.length) return null;

  const uniqueItems = items.slice(0, 8);

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Action Items</div>
        <span style={{
          fontSize: 12, color: "var(--text-muted)", background: "var(--bg-subtle)",
          padding: "2px 8px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-subtle)",
        }}>
          {uniqueItems.filter((i) => !done[i.id]).length} open
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {uniqueItems.map((item) => {
          const pm    = PRIORITY_META[item.priority] || PRIORITY_META.low;
          const isDone = done[item.id];
          return (
            <div key={item.id}
              onClick={() => setDone((d) => ({ ...d, [item.id]: !d[item.id] }))}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 12px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: isDone ? "var(--bg-page)" : "var(--card-bg)",
                cursor: "pointer", opacity: isDone ? 0.55 : 1,
                transition: "opacity 0.15s",
              }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                border: `2px solid ${isDone ? "var(--blue-primary)" : "var(--border-default)"}`,
                background: isDone ? "var(--blue-primary)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isDone && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, textDecoration: isDone ? "line-through" : "none" }}>
                  {item.action}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>👤 {item.owner}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>⏱ {item.dueIn}</span>
                  <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: "var(--radius-pill)", background: pm.bg, color: pm.color, fontWeight: 600 }}>
                    {pm.label}
                  </span>
                </div>
              </div>
              <SignalTag type={item.signal} small />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChannelBreakdown({ timeline }) {
  const counts = {};
  timeline.forEach((e) => { counts[e.channel] = (counts[e.channel] || 0) + 1; });
  const total  = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map(([channel, count]) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={channel}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-body)", marginBottom: 3 }}>
              <span>{CHANNEL_ICONS[channel] || "📌"} {channel}</span>
              <span style={{ color: "var(--text-muted)" }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: "var(--border-subtle)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--blue-primary)", borderRadius: 4, opacity: 0.75, transition: "width 0.6s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineEvent({ event, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const m        = SIGNAL_META[event.dominantSignal] || SIGNAL_META.feature_request;
  const chanIcon = CHANNEL_ICONS[event.channel] || "📌";

  return (
    <div style={{ display: "flex", gap: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: 16, flexShrink: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: m.bg, border: `2px solid ${m.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: m.color, fontWeight: 700,
          boxShadow: "var(--shadow-sm)", zIndex: 1,
        }}>
          {m.icon}
        </div>
        {!isLast && (
          <div style={{ width: 1, flex: 1, minHeight: 20, background: "var(--border-subtle)", marginTop: 4 }} />
        )}
      </div>

      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
        <div
          onClick={() => setExpanded((e) => !e)}
          style={{
            background: "var(--card-bg)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--card-radius)", padding: "14px 16px",
            cursor: "pointer",
            boxShadow: expanded ? "var(--shadow-md)" : "var(--shadow-sm)",
            borderColor: expanded ? "var(--border-focus)" : "var(--border-subtle)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 5 }}>
                {event.title}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{chanIcon} {event.channel}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  📅 {formatDate(event.date)}{formatTime(event.date) ? ` · ${formatTime(event.date)}` : ""}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>👤 {event.owner}</span>
                <StatusDot status={event.status} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <SignalTag type={event.dominantSignal} small />
              <span style={{
                fontSize: 10, color: "var(--text-muted)",
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform 0.2s", display: "inline-block",
              }}>▼</span>
            </div>
          </div>

          <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-body)", lineHeight: 1.6 }}>
            {event.summary}
          </p>

          {expanded && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
              {event.actionItems?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Action Items
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {event.actionItems.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, flexShrink: 0, marginTop: 5 }} />
                        <span style={{ fontSize: 12, color: "var(--text-body)" }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {event.signals?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Signals on ticket
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {event.signals.map((s) => (
                      <SignalTag key={s.id} type={s.type} small />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchBar({ accountId, onResult }) {
  const [q, setQ]       = useState("");
  const [busy, setBusy] = useState(false);
  const timerRef        = useRef(null);

  useEffect(() => {
    if (!q.trim() || !accountId) { onResult(null); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setBusy(true);
      fetch(`${BASE}/search?accountId=${accountId}&q=${encodeURIComponent(q)}`)
        .then((r) => r.json()).then(onResult).finally(() => setBusy(false));
    }, 350);
  }, [q, accountId]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tickets, signals, channels…"
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "9px 14px 9px 36px",
          border: "1px solid var(--input-border)", borderRadius: "var(--input-radius)",
          background: "var(--input-bg)", color: "var(--input-text)",
          fontSize: 13, outline: "none", fontFamily: "inherit",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--input-border-focus)")}
        onBlur={(e)  => (e.target.style.borderColor = "var(--input-border)")}
      />
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>
        {busy ? "⟳" : "⌕"}
      </span>
    </div>
  );
}

function FilterBar({ active, onChange }) {
  const filters = [
    { key: "all",                label: "All" },
    { key: "churn_risk",         label: "Churn Risk" },
    { key: "upsell_opportunity", label: "Upsell" },
    { key: "renewal_due",        label: "Renewal" },
    { key: "support_spike",      label: "Support" },
    { key: "nps_drop",           label: "NPS" },
    { key: "payment_delay",      label: "Payment" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {filters.map(({ key, label }) => {
        const isActive = active === key;
        const m        = SIGNAL_META[key];
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            padding: "5px 12px", borderRadius: "var(--radius-pill)", fontSize: 12, fontWeight: 500,
            border: isActive ? `1px solid ${m ? m.border : "var(--border-strong)"}` : "1px solid var(--border-subtle)",
            background: isActive ? (m ? m.bg : "var(--bg-subtle)") : "var(--card-bg)",
            color: isActive ? (m ? m.color : "var(--blue-primary)") : "var(--text-body)",
            cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
          }}>
            {m && isActive && <span style={{ marginRight: 4 }}>{m.icon}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function AccountSelector({ accounts, selected, onSelect }) {
  return (
    <select
      value={selected || ""}
      onChange={(e) => onSelect(e.target.value)}
      style={{
        padding: "8px 12px", borderRadius: "var(--input-radius)",
        border: "1px solid var(--input-border)", background: "var(--input-bg)",
        color: "var(--input-text)", fontSize: 13, fontFamily: "inherit",
        cursor: "pointer", outline: "none", minWidth: 200,
      }}>
      <option value="" disabled>Select account…</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>{a.id} ({a.ticketCount} tickets)</option>
      ))}
    </select>
  );
}

// ─── Main view toggle ────────────────────────────────────────
const VIEW_TOGGLE_STYLE = (active) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 16px",
  borderRadius: "var(--radius-pill)",
  fontSize: 13,
  fontWeight: 500,
  border: `1px solid ${active ? "var(--blue-primary)" : "var(--border-subtle)"}`,
  background: active ? "var(--blue-primary)" : "var(--card-bg)",
  color: active ? "#fff" : "var(--text-body)",
  cursor: "pointer",
  transition: "all 0.15s",
  fontFamily: "inherit",
});

// ─── Main export ─────────────────────────────────────────────
export default function AccountMemoryView() {
  const [viewMode, setViewMode]           = useState("table"); // "table" | "viz"
  const [selected, setSelected]           = useState(null);
  const [filter, setFilter]               = useState("all");
  const [searchResults, setSearchResults] = useState(null);
  const [isWideLayout, setIsWideLayout]   = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1200;
  });

  // Viz-specific data
  const [graphData, setGraphData]   = useState({ nodes: [], links: [] });
  const [hotAccounts, setHotAccounts] = useState([]);
  const [signalDist, setSignalDist] = useState([]);
  const [vizLoading, setVizLoading] = useState(false);
  const [vizError, setVizError]     = useState(null);

  const { data: accounts, loading: loadingAccts } = useFetch(`${BASE}/accounts`, []);
  const { data: timeline, loading: loadingTL }    = useFetch(
    selected ? `${BASE}/timeline/${selected}` : null,
    [selected]
  );

  useEffect(() => {
    const onResize = () => setIsWideLayout(window.innerWidth >= 1200);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setVizLoading(true);
    setVizError(null);

    Promise.all([
      fetch(`${GRAPH_BASE}/overview`).then((r) => {
        if (!r.ok) throw new Error("Failed to load graph overview");
        return r.json();
      }),
      fetch(`${GRAPH_BASE}/hot-accounts`).then((r) => {
        if (!r.ok) throw new Error("Failed to load hot accounts");
        return r.json();
      }),
      fetch(`${GRAPH_BASE}/signal-dist`).then((r) => {
        if (!r.ok) throw new Error("Failed to load signal distribution");
        return r.json();
      }),
    ])
      .then(([nextGraph, nextHotAccounts, nextSignalDist]) => {
        if (cancelled) return;
        setGraphData(nextGraph || { nodes: [], links: [] });
        setHotAccounts(Array.isArray(nextHotAccounts) ? nextHotAccounts : []);
        setSignalDist(Array.isArray(nextSignalDist) ? nextSignalDist : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setVizError(err.message || "Unable to load visualizations");
      })
      .finally(() => {
        if (!cancelled) setVizLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-select first account
  useEffect(() => {
    if (accounts?.length && !selected) setSelected(accounts[0].id);
  }, [accounts]);

  const filtered  = (timeline || []).filter((e) => filter === "all" || e.dominantSignal === filter);
  const displayed = searchResults
    ? (timeline || []).filter((e) => searchResults.some((r) => r.ticketId === e.id))
    : filtered;
  const accountCount = accounts?.length || 0;
  const selectedSignalTypes = new Set((timeline || []).map((event) => event.dominantSignal).filter(Boolean)).size;
  const activityLabel = searchResults ? "Search Results" : "Visible Events";

  return (
    <div className="ticket-health-layout" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="content-card ticket-health-summary">
        <h2>Account Memory &amp; Timeline</h2>
        <p>Chronological record of every customer touchpoint with AI summaries, follow-ups, and visual signal context.</p>

        <div className="ticket-summary-grid">
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Accounts</span>
            <strong style={summaryValueStyle}>{accountCount || "—"}</strong>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Selected Account</span>
            <strong style={{ ...summaryValueStyle, fontSize: 18 }}>{selected || "Choose one"}</strong>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>{activityLabel}</span>
            <strong style={summaryValueStyle}>{selected ? displayed.length : "—"}</strong>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Signal Types</span>
            <strong style={summaryValueStyle}>{selected ? selectedSignalTypes : "—"}</strong>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={modePillGroupStyle}>
            <button type="button" onClick={() => setViewMode("table")} style={MODE_PILL_STYLE(viewMode === "table")}>
              Timeline
            </button>
            <button type="button" onClick={() => setViewMode("viz")} style={MODE_PILL_STYLE(viewMode === "viz")}>
              Visualizations
            </button>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="ticket-summary-grid" style={{ marginTop: 14 }}>
            <label className="ticket-filter-card">
              <span className="ticket-filter-card__label">Account</span>
              {loadingAccts
                ? <div style={{ ...skeletonStyle(42), width: "100%" }} />
                : <AccountSelector
                    accounts={accounts || []}
                    selected={selected}
                    onSelect={(id) => { setSelected(id); setSearchResults(null); setFilter("all"); }}
                  />
              }
            </label>

            <label className="ticket-filter-card" style={{ gridColumn: "span 2" }}>
              <span className="ticket-filter-card__label">Search Timeline</span>
              <SearchBar accountId={selected} onResult={setSearchResults} />
            </label>
          </div>
        ) : null}
      </div>

      {false && (
      <>
      {/* Page header */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Account Memory &amp; Timeline
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-body)" }}>
          Chronological record of every customer touchpoint with AI summaries to keep teams aligned.
        </p>
      </div>

      {/* Feature pills */}
    

      {/* ── View mode toggle ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
        padding: "10px 14px",
        background: "var(--bg-subtle)",
        borderRadius: "var(--card-radius)",
        border: "1px solid var(--border-subtle)",
      }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 4 }}>View:</span>
        <button onClick={() => setViewMode("table")} style={VIEW_TOGGLE_STYLE(viewMode === "table")}>
          <span style={{ fontSize: 14 }}>☰</span> Timeline &amp; details
        </button>
        <button onClick={() => setViewMode("viz")} style={VIEW_TOGGLE_STYLE(viewMode === "viz")}>
          <span style={{ fontSize: 14 }}>◎</span> Visualizations
        </button>
      </div>

      {/* ── Visualization mode ── */}
      </>
      )}

      {viewMode === "viz" && (
        vizLoading ? (
          <div className="content-card"><div style={skeletonStyle(360)} /></div>
        ) : vizError ? (
          <div className="content-card" style={{ textAlign: "center", color: "var(--error-text)" }}>
            {vizError}
          </div>
        ) : (
          <VisualizationPanel
            graphData={graphData}
            hotAccounts={hotAccounts}
            signalDist={signalDist}
          />
        )
      )}

      {/* ── Table / timeline mode ── */}
      {viewMode === "table" && (
        <>
          {false && (
          <>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
            {loadingAccts
              ? <div style={{ ...skeletonStyle(36), width: 200 }} />
              : <AccountSelector
                  accounts={accounts || []}
                  selected={selected}
                  onSelect={(id) => { setSelected(id); setSearchResults(null); setFilter("all"); }}
                />
            }
            <div style={{ flex: 1, minWidth: 200 }}>
              <SearchBar accountId={selected} onResult={setSearchResults} />
            </div>
            {searchResults && (
              <button onClick={() => setSearchResults(null)} style={{
                padding: "8px 12px", fontSize: 12, borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)", background: "var(--card-bg)",
                color: "var(--text-body)", cursor: "pointer", fontFamily: "inherit",
              }}>✕ Clear</button>
            )}
          </div>

          </>
          )}

          {/* Empty state */}
          {!selected ? (
            <div className="content-card" style={{ textAlign: "center", padding: "56px 24px" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🏢</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-body)" }}>Select an account above</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Timeline, AI summary and action items will appear here</div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: isWideLayout ? "minmax(0,1fr) minmax(280px, 320px)" : "minmax(0,1fr)",
              gap: 16,
              alignItems: "start",
            }}>

              {/* Timeline column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="content-card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      {searchResults ? `Search · ${displayed.length} results` : `Timeline · ${displayed.length} events`}
                    </span>
                    {searchResults && (
                      <button
                        onClick={() => setSearchResults(null)}
                        style={{
                          padding: "8px 12px",
                          fontSize: 12,
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-default)",
                          background: "var(--card-bg)",
                          color: "var(--text-body)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                  {!searchResults && <FilterBar active={filter} onChange={setFilter} />}
                </div>

                <div className="content-card" style={{ padding: "20px 20px 4px" }}>
                  {loadingTL ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[1, 2, 3].map((i) => <div key={i} style={skeletonStyle(100)} />)}
                    </div>
                  ) : displayed.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 14 }}>
                      No events match this filter.
                    </div>
                  ) : (
                    displayed.map((event, i) => (
                      <TimelineEvent key={event.id} event={event} isLast={i === displayed.length - 1} />
                    ))
                  )}
                </div>
              </div>

              {/* Right sidebar */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                position: isWideLayout ? "sticky" : "static",
                top: isWideLayout ? 20 : "auto",
              }}>
                <SummaryPanel accountId={selected} />
                <ActionItemsPanel accountId={selected} />
                {timeline && !loadingTL && timeline.length > 0 && (
                  <div style={cardStyle}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Channel Breakdown</div>
                    <ChannelBreakdown timeline={timeline} />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const summaryCardStyle = {
  background: "var(--bg-surface)",
  border: "1px solid var(--card-border)",
  borderRadius: "var(--radius-lg)",
  padding: "14px 16px",
  display: "grid",
  gap: 4,
};

const summaryLabelStyle = {
  color: "var(--text-muted)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const summaryValueStyle = {
  color: "var(--blue-primary)",
  fontSize: 22,
  lineHeight: 1.1,
};

const modePillGroupStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: 4,
  marginTop: 6,
  borderRadius: 999,
  background: "var(--bg-subtle)",
  border: "1px solid var(--border-subtle)",
  width: "fit-content",
};

const MODE_PILL_STYLE = (active) => ({
  border: "none",
  borderRadius: 999,
  padding: "8px 14px",
  background: active ? "var(--blue-primary)" : "transparent",
  color: active ? "var(--text-on-blue)" : "var(--text-body)",
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  cursor: "pointer",
  boxShadow: active ? "var(--shadow-sm)" : "none",
});

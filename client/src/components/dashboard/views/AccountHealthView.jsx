import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const BASE = "http://localhost:5000/api/graph";

const SIGNAL_COLORS = {
  churn_risk: "var(--error-text)",
  upsell_opportunity: "var(--blue-primary)",
  renewal_due: "var(--warning-text)",
  support_spike: "var(--success-text)",
  nps_drop: "var(--accent-text)",
  feature_request: "var(--info-text)",
  payment_delay: "var(--blue-deep)",
};

const ACC_COLOR = "var(--blue-primary)";
const TKT_COLOR = "var(--success-text)";
const SIG_TYPES = Object.keys(SIGNAL_COLORS);

function formatSignalLabel(value) {
  if (!value) return "Not available";
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function typeLabel(type) {
  if (type === "account") return "Account";
  if (type === "ticket") return "Ticket";
  if (type === "signal") return "Signal";
  return "Node";
}

function formatNodeId(id) {
  return String(id ?? "").replace(/_/g, " ");
}

function computeHealthScore(signalDist = []) {
  let score = 100;
  signalDist.forEach(({ type, count }) => {
    if (type === "churn_risk") score -= count * 2.5;
    if (type === "nps_drop") score -= count * 1.8;
    if (type === "support_spike") score -= count * 1.2;
    if (type === "payment_delay") score -= count * 1.5;
    if (type === "upsell_opportunity") score += count * 0.8;
  });
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreColor(score) {
  if (score >= 75) return "var(--success-text)";
  if (score >= 50) return "var(--warning-text)";
  return "var(--error-text)";
}

function ForceGraph({ nodes, links, view, selectedNodeId, onSelectNode }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const W = 980;
  const H = 560;

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;

    if (simRef.current) {
      simRef.current.stop();
      simRef.current = null;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodeData = nodes.map((node) => ({ ...node }));
    const linkData = links.map((link) => ({ ...link }));

    const nodeRadius = (node) => (node.type === "account" ? 11 : node.type === "ticket" ? 6 : 5);
    const nodeColor = (node) =>
      node.type === "account"
        ? ACC_COLOR
        : node.type === "ticket"
          ? TKT_COLOR
          : SIGNAL_COLORS[node.signalType] || "var(--text-muted)";

    if (view === "hierarchy") {
      const accounts = nodeData.filter((node) => node.type === "account");
      const tickets = nodeData.filter((node) => node.type === "ticket");
      const signals = nodeData.filter((node) => node.type === "signal");
      const nodeMap = {};

      nodeData.forEach((node) => {
        nodeMap[node.id] = node;
      });

      const pad = 50;
      accounts.forEach((node, index) => {
        node.x = pad + (index / Math.max(accounts.length - 1, 1)) * (W - pad * 2);
        node.y = 70;
      });
      tickets.forEach((node, index) => {
        node.x = pad + (index / Math.max(tickets.length - 1, 1)) * (W - pad * 2);
        node.y = 250;
      });
      signals.forEach((node, index) => {
        node.x = pad + (index / Math.max(signals.length - 1, 1)) * (W - pad * 2);
        node.y = 450;
      });

      ["Accounts", "Tickets", "Signals"].forEach((label, index) => {
        svg
          .append("text")
          .text(label)
          .attr("x", 12)
          .attr("y", [74, 254, 454][index])
          .attr("font-size", 11)
          .attr("fill", "var(--text-muted)")
          .style("font-family", "'DM Mono', monospace");
      });

      svg
        .append("g")
        .selectAll("line")
        .data(linkData)
        .join("line")
        .attr("x1", (d) => nodeMap[d.source]?.x || 0)
        .attr("y1", (d) => nodeMap[d.source]?.y || 0)
        .attr("x2", (d) => nodeMap[d.target]?.x || 0)
        .attr("y2", (d) => nodeMap[d.target]?.y || 0)
        .attr("stroke", "var(--border-default)")
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.6);

      const group = svg
        .append("g")
        .selectAll("g")
        .data(nodeData)
        .join("g")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .style("cursor", "pointer")
        .on("click", (_, d) => onSelectNode?.(d));

      group
        .append("circle")
        .attr("r", nodeRadius)
        .attr("fill", nodeColor)
        .attr("stroke", (d) => (d.id === selectedNodeId ? "var(--blue-deep)" : "var(--bg-surface)"))
        .attr("stroke-width", (d) => (d.id === selectedNodeId ? 3 : 1.5))
        .attr("opacity", (d) => (d.type === "ticket" ? 0.75 : 0.92));

      group
        .filter((d) => d.type === "account")
        .append("text")
        .text((d) => d.id)
        .attr("text-anchor", "middle")
        .attr("dy", 18)
        .attr("font-size", 9)
        .attr("fill", "var(--text-muted)")
        .style("font-family", "'DM Mono', monospace");

      return;
    }

    const linkSel = svg
      .append("g")
      .selectAll("line")
      .data(linkData)
      .join("line")
      .attr("stroke", "var(--border-default)")
      .attr("stroke-width", 0.9)
      .attr("opacity", 0.65);

    const nodeSel = svg
      .append("g")
      .selectAll("g")
      .data(nodeData)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (_, d) => onSelectNode?.(d));

    nodeSel
      .append("circle")
      .attr("r", nodeRadius)
      .attr("fill", nodeColor)
      .attr("stroke", (d) => (d.id === selectedNodeId ? "var(--blue-deep)" : "var(--bg-surface)"))
      .attr("stroke-width", (d) => (d.id === selectedNodeId ? 3 : 1.5))
      .attr("opacity", (d) => (d.type === "ticket" ? 0.75 : 0.92));

    nodeSel
      .filter((d) => d.type === "account")
      .append("text")
      .text((d) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", 20)
      .attr("font-size", 10)
      .attr("fill", "var(--text-muted)")
      .style("font-family", "'DM Mono', monospace");

    let simulation;
    if (view === "cluster") {
      const signalCenters = {};
      SIG_TYPES.forEach((type, index) => {
        const angle = (index / SIG_TYPES.length) * Math.PI * 2 - Math.PI / 2;
        signalCenters[type] = { x: W / 2 + Math.cos(angle) * 240, y: H / 2 + Math.sin(angle) * 170 };
      });

      simulation = d3
        .forceSimulation(nodeData)
        .force("link", d3.forceLink(linkData).id((d) => d.id).distance(42).strength(0.8))
        .force("charge", d3.forceManyBody().strength((d) => (d.type === "account" ? -140 : -60)))
        .force("collide", d3.forceCollide((d) => nodeRadius(d) + 4))
        .force(
          "x",
          d3.forceX((d) => {
            if (d.type === "account") return W / 2;
            if (d.type === "signal") return signalCenters[d.signalType]?.x || W / 2;
            return W / 2;
          }).strength((d) => (d.type === "signal" ? 0.5 : 0.08))
        )
        .force(
          "y",
          d3.forceY((d) => {
            if (d.type === "account") return H / 2;
            if (d.type === "signal") return signalCenters[d.signalType]?.y || H / 2;
            return H / 2;
          }).strength((d) => (d.type === "signal" ? 0.5 : 0.08))
        )
        .alphaDecay(0.015);
    } else {
      simulation = d3
        .forceSimulation(nodeData)
        .force("link", d3.forceLink(linkData).id((d) => d.id).distance(36).strength(0.9))
        .force("charge", d3.forceManyBody().strength(-55))
        .force("collide", d3.forceCollide((d) => nodeRadius(d) + 4))
        .force(
          "r",
          d3.forceRadial((d) => {
            if (d.type === "account") return 0;
            if (d.type === "ticket") return 180;
            return 340;
          }, W / 2, H / 2).strength(0.9)
        )
        .alphaDecay(0.015);
    }

    simRef.current = simulation;
    simulation.on("tick", () => {
      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      linkSel
        .attr("x1", (d) => clamp(d.source.x, 10, W - 10))
        .attr("y1", (d) => clamp(d.source.y, 10, H - 10))
        .attr("x2", (d) => clamp(d.target.x, 10, W - 10))
        .attr("y2", (d) => clamp(d.target.y, 10, H - 10));
      nodeSel.attr("transform", (d) => `translate(${clamp(d.x, 10, W - 10)},${clamp(d.y, 10, H - 10)})`);
    });

    return () => simulation.stop();
  }, [links, nodes, onSelectNode, selectedNodeId, view]);

  return <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", height: 560 }} />;
}

function SignalBars({ data }) {
  const total = data.reduce((sum, item) => sum + item.count, 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map(({ type, count }) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={type}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-body)", marginBottom: 4 }}>
              <span>{formatSignalLabel(type)}</span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: 7, background: "var(--border-subtle)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: SIGNAL_COLORS[type] || "var(--text-muted)",
                  borderRadius: 4,
                  transition: "width 0.7s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineChart({ signalDist }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const base = signalDist.reduce((sum, item) => sum + item.count, 0) || 80;
    const rand = (baseline, variance) =>
      months.map(() => Math.max(3, Math.round(baseline * (0.3 + Math.random() * variance))));

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          { label: "Churn risk", data: rand(base * 0.4, 0.6), borderColor: "rgb(153, 27, 27)", backgroundColor: "rgba(153, 27, 27, 0.08)", fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "rgb(153, 27, 27)", borderWidth: 2 },
          { label: "Upsell", data: rand(base * 0.3, 0.5), borderColor: "rgb(24, 95, 165)", backgroundColor: "rgba(24, 95, 165, 0.08)", fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "rgb(24, 95, 165)", borderWidth: 2 },
          { label: "Renewal due", data: rand(base * 0.25, 0.4), borderColor: "rgb(146, 64, 14)", backgroundColor: "rgba(146, 64, 14, 0.08)", fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "rgb(146, 64, 14)", borderWidth: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#fff", titleColor: "#0F172A", bodyColor: "#475569", borderColor: "#CBD5E1", borderWidth: 1, padding: 10 },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#94A3B8", font: { size: 11 } }, border: { display: false } },
          y: { grid: { color: "#F1F5F9" }, ticks: { color: "#94A3B8", font: { size: 11 } }, border: { display: false }, beginAtZero: true },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [signalDist]);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        {[
          ["rgb(153, 27, 27)", "Churn risk"],
          ["rgb(24, 95, 165)", "Upsell"],
          ["rgb(146, 64, 14)", "Renewal"],
        ].map(([color, label]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-body)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>
      <div style={{ position: "relative", height: 200 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default function AccountHealthView() {
  const [metrics, setMetrics] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [signalDist, setSignalDist] = useState([]);
  const [hotAccounts, setHotAccounts] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphView, setGraphView] = useState("radial");

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/metrics`).then((r) => r.json()),
      fetch(`${BASE}/overview`).then((r) => r.json()),
      fetch(`${BASE}/signal-dist`).then((r) => r.json()),
      fetch(`${BASE}/hot-accounts`).then((r) => r.json()),
    ])
      .then(([nextMetrics, nextGraph, nextSignalDist, nextHotAccounts]) => {
        setMetrics(nextMetrics);
        setGraphData(nextGraph);
        setSignalDist(nextSignalDist);
        setHotAccounts(nextHotAccounts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const healthScore = computeHealthScore(signalDist);
  const riskDrivers = signalDist
    .filter((item) => ["churn_risk", "nps_drop", "support_spike", "payment_delay"].includes(item.type))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => formatSignalLabel(item.type))
    .join(", ");

  const topSignalType = signalDist[0]?.type || "";
  const momentum =
    ["churn_risk", "nps_drop"].includes(topSignalType)
      ? "Negative signal trend"
      : topSignalType === "upsell_opportunity"
        ? "Positive upsell trend"
        : "Mixed : No Signal single type is dominating in the graph.";

  const stats = useMemo(
    () => ({
      healthScore,
      totalSignals: metrics?.signals ?? "—",
      totalAccounts: metrics?.accounts ?? "—",
      totalTickets: metrics?.tickets ?? "—",
      signalTypes: metrics?.types ?? "—",
    }),
    [healthScore, metrics]
  );

  const panelStyle = { background: "var(--card-bg)", border: "1px solid var(--border-subtle)", borderRadius: "var(--card-radius)", padding: 16 };
  const tablePanelStyle = { ...panelStyle, height: 340, display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", minHeight: 0 };
  const tableBodyStyle = { minHeight: 0, overflowY: "auto", paddingRight: 4 };
  const detailColumnsStyle = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 };
  const detailPanelStyle = { background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 14, height: 300, display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", minHeight: 0 };

  const nodeRelations = useMemo(() => {
    if (!selectedNode) return { inbound: 0, outbound: 0, neighbors: [] };
    const neighborIds = new Set();
    let inbound = 0;
    let outbound = 0;

    graphData.links.forEach((link) => {
      const source = typeof link.source === "object" ? link.source.id : link.source;
      const target = typeof link.target === "object" ? link.target.id : link.target;
      if (source === selectedNode.id) {
        outbound += 1;
        neighborIds.add(target);
      }
      if (target === selectedNode.id) {
        inbound += 1;
        neighborIds.add(source);
      }
    });

    return {
      inbound,
      outbound,
      neighbors: graphData.nodes.filter((node) => neighborIds.has(node.id)).slice(0, 8),
    };
  }, [graphData.links, graphData.nodes, selectedNode]);

  useEffect(() => {
    if (!selectedNode || selectedNode.type !== "account") {
      setSelectedNodeDetails([]);
      return;
    }

    setDetailsLoading(true);
    fetch(`${BASE}/account/${selectedNode.id}`)
      .then((r) => r.json())
      .then((rows) => setSelectedNodeDetails(Array.isArray(rows) ? rows : []))
      .catch(() => setSelectedNodeDetails([]))
      .finally(() => setDetailsLoading(false));
  }, [selectedNode]);

  if (loading) return <div className="content-card"><p style={{ color: "var(--text-muted)" }}>Loading...</p></div>;
  if (error) return <div className="content-card"><p style={{ color: "var(--error-text)" }}>Error: {error}</p></div>;

  return (
    <div className="ticket-health-layout">
      <div className="content-card ticket-health-summary">
        <h2>Account health score</h2>
        <p>Track risk and momentum with a composite score across product usage, support friction, and revenue signals.</p>
        <div className="ticket-summary-grid">
          <div style={summaryCardStyle}><span style={summaryLabelStyle}>Health Score</span><strong style={{ ...summaryValueStyle, color: scoreColor(healthScore), fontSize: 30 }}>{stats.healthScore}</strong></div>
          <div style={summaryCardStyle}><span style={summaryLabelStyle}>Signals</span><strong style={summaryValueStyle}>{stats.totalSignals}</strong></div>
          <div style={summaryCardStyle}><span style={summaryLabelStyle}>Accounts</span><strong style={summaryValueStyle}>{stats.totalAccounts}</strong></div>
          <div style={summaryCardStyle}><span style={summaryLabelStyle}>Tickets</span><strong style={summaryValueStyle}>{stats.totalTickets}</strong></div>
          <div style={summaryCardStyle}><span style={summaryLabelStyle}>Signal Types</span><strong style={summaryValueStyle}>{stats.signalTypes}</strong></div>
          <div style={{ ...summaryCardStyle, alignContent: "start", minHeight: 116, gridColumn: "span 2", minWidth: 0 }}>
            <span style={summaryLabelStyle}>Momentum</span>
            <strong
              style={{
                color: "var(--blue-deep)",
                fontSize: 18,
                lineHeight: 1.5,
                fontWeight: 600,
                display: "block",
                marginTop: 4,
              }}
            >
              {momentum}
            </strong>
          </div>
          <div style={{ ...summaryCardStyle, gridColumn: "1 / -1" }}><span style={summaryLabelStyle}>Risk Drivers</span><strong style={{ ...summaryValueStyle, fontSize: 18, color: "var(--blue-deep)" }}>{riskDrivers || "None detected"}</strong></div>
        </div>
      </div>

      <div style={{ ...panelStyle, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Graph view</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["radial", "cluster", "hierarchy"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setGraphView(value)}
                style={{
                  fontSize: 11,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  padding: "6px 12px",
                  border: "1px solid var(--border-default)",
                  borderRadius: 999,
                  background: graphView === value ? "var(--blue-primary)" : "var(--bg-surface)",
                  color: graphView === value ? "var(--text-on-blue)" : "var(--text-body)",
                  cursor: "pointer",
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <ForceGraph
          nodes={graphData.nodes}
          links={graphData.links}
          view={graphView}
          selectedNodeId={selectedNode?.id || null}
          onSelectNode={setSelectedNode}
        />

        {selectedNode ? (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 16, border: "1px solid var(--card-border-tinted)", background: "var(--card-bg-tinted)", display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: 0, color: "var(--text-link)", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Node Details</p>
                <h3 style={{ margin: "6px 0 0", color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, lineHeight: 1.2 }}>
                  {typeLabel(selectedNode.type)} {formatNodeId(selectedNode.id)}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedNode(null)} style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-body)", borderRadius: 999, padding: "8px 12px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Clear selection
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <div style={detailMetricStyle}><div style={detailMetricLabelStyle}>Type</div><div style={detailMetricValueStyle}>{typeLabel(selectedNode.type)}</div></div>
              <div style={detailMetricStyle}><div style={detailMetricLabelStyle}>Connected In</div><div style={detailMetricValueStyle}>{nodeRelations.inbound}</div></div>
              <div style={detailMetricStyle}><div style={detailMetricLabelStyle}>Connected Out</div><div style={detailMetricValueStyle}>{nodeRelations.outbound}</div></div>
            </div>

            <div style={detailColumnsStyle}>
              <div style={detailPanelStyle}>
                <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Connected nodes</div>
                <div style={tableBodyStyle}>
                  {nodeRelations.neighbors.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--text-body)", fontSize: 14 }}>No linked nodes found for this selection.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {nodeRelations.neighbors.map((node) => (
                        <div key={node.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", background: "var(--bg-subtle)", borderRadius: 12 }}>
                          <span style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>{formatNodeId(node.id)}</span>
                          <span style={{ color: "var(--text-link)", fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>{typeLabel(node.type)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={detailPanelStyle}>
                <div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{selectedNode.type === "account" ? "Account activity" : "Node metadata"}</div>
                <div style={tableBodyStyle}>
                  {selectedNode.type === "account" ? (
                    detailsLoading ? (
                      <p style={{ margin: 0, color: "var(--text-body)", fontSize: 14 }}>Loading account details...</p>
                    ) : selectedNodeDetails.length === 0 ? (
                      <p style={{ margin: 0, color: "var(--text-body)", fontSize: 14 }}>No drill-down rows returned for this account.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {selectedNodeDetails.slice(0, 12).map((row, index) => (
                          <div key={`${row.signal_id || "signal"}-${index}`} style={{ padding: "10px 12px", background: "var(--bg-subtle)", borderRadius: 12 }}>
                            <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 700 }}>Ticket {formatNodeId(row.ticket_id)} · {formatSignalLabel(row.signal_type)}</div>
                            <div style={{ marginTop: 4, color: "var(--text-body)", fontSize: 12 }}>Signal {formatNodeId(row.signal_id)}{row.signal_date ? ` · ${row.signal_date}` : ""}</div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ padding: "10px 12px", background: "var(--bg-subtle)", borderRadius: 12 }}>
                        <div style={detailMetricLabelStyle}>Node Id</div>
                        <div style={{ marginTop: 4, color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>{formatNodeId(selectedNode.id)}</div>
                      </div>
                      {selectedNode.signalType ? (
                        <div style={{ padding: "10px 12px", background: "var(--bg-subtle)", borderRadius: 12 }}>
                          <div style={detailMetricLabelStyle}>Signal Type</div>
                          <div style={{ marginTop: 4, color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>{formatSignalLabel(selectedNode.signalType)}</div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14, marginTop: 14 }}>
        <div style={tablePanelStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Signal distribution</div>
          <div style={tableBodyStyle}><SignalBars data={signalDist} /></div>
        </div>
        <div style={tablePanelStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>Hot accounts</div>
          <div style={tableBodyStyle}>
            {hotAccounts.map((account) => {
              const color = SIGNAL_COLORS[account.dominant] || "var(--text-muted)";
              return (
                <div key={account.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, marginBottom: 6, background: "var(--bg-subtle)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{account.id}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--bg-surface)", color, fontWeight: 700, border: "1px solid var(--border-subtle)" }}>{account.signals} signals</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ ...panelStyle, marginTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Signal activity timeline</div>
        <TimelineChart signalDist={signalDist} />
      </div>
    </div>
  );
}

const summaryCardStyle = { background: "var(--bg-surface)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-lg)", padding: "14px 16px", display: "grid", gap: 4 };
const summaryLabelStyle = { color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" };
const summaryValueStyle = { color: "var(--blue-primary)", fontSize: 22, lineHeight: 1.1 };
const detailMetricStyle = { background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: 12 };
const detailMetricLabelStyle = { color: "var(--text-muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" };
const detailMetricValueStyle = { marginTop: 4, color: "var(--blue-deep)", fontWeight: 700 };

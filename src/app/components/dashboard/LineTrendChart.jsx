"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { typography } from "@/lib/designSystem";

const CHART = {
  width: 520,
  height: 240,
  padX: 40,
  padY: 20,
  padBottom: 32,
};

function chartInnerW() {
  return CHART.width - CHART.padX * 2;
}

function chartInnerH() {
  return CHART.height - CHART.padY - CHART.padBottom;
}

function pointCoords(index, value, count, maxY) {
  const innerW = chartInnerW();
  const innerH = chartInnerH();
  const safeMax = maxY > 0 ? maxY : 1;
  const x = CHART.padX + (index / Math.max(count - 1, 1)) * innerW;
  const y = CHART.padY + innerH - (value / safeMax) * innerH;
  return { x, y };
}

/** Smooth line through points (monotone-friendly cubic segments) */
function buildSmoothLinePath(points, maxY) {
  if (!points.length) return "";
  if (points.length === 1) {
    const { x, y } = pointCoords(0, points[0].value, 1, maxY);
    return `M ${x} ${y}`;
  }

  const coords = points.map((p, i) => pointCoords(i, p.value, points.length, maxY));
  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;

  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx.toFixed(2)} ${p0.y.toFixed(2)}, ${cx.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }

  return d;
}

function buildAreaFromLine(linePath, pointCount, maxY) {
  if (!linePath || pointCount < 1) return "";
  const innerH = chartInnerH();
  const baseY = CHART.padY + innerH;
  const last = pointCoords(pointCount - 1, 0, pointCount, maxY);
  const first = pointCoords(0, 0, pointCount, maxY);
  return `${linePath} L ${last.x.toFixed(2)} ${baseY} L ${first.x.toFixed(2)} ${baseY} Z`;
}

function yTicks(maxY) {
  const safeMax = maxY > 0 ? maxY : 1;
  const step = safeMax <= 4 ? 1 : Math.ceil(safeMax / 4);
  const ticks = [];
  for (let v = 0; v <= safeMax; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < safeMax) ticks.push(safeMax);
  return [...new Set(ticks)];
}

export function LineTrendChart({
  title,
  subtitle,
  series = [],
  className = "",
  emptyMessage = "No activity in this period.",
}) {
  const gradientId = useId().replace(/:/g, "");
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [hiddenSeries, setHiddenSeries] = useState(() => new Set());

  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenSeries.has(s.id)),
    [series, hiddenSeries]
  );

  const { maxY, hasData, xLabels, periodTotal } = useMemo(() => {
    const allValues = visibleSeries.flatMap((s) => s.data.map((d) => d.value));
    const peak = allValues.length ? Math.max(...allValues, 1) : 1;
    const labels = series[0]?.data || [];
    const any = series.some((s) => s.data.some((d) => d.value > 0));
    const total = visibleSeries.reduce(
      (acc, s) => acc + s.data.reduce((sum, d) => sum + d.value, 0),
      0
    );
    return { maxY: peak, hasData: any, xLabels: labels, periodTotal: total };
  }, [series, visibleSeries]);

  const ticks = yTicks(maxY);

  const toggleSeries = useCallback((id) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const visibleCount = series.filter((s) => !prev.has(s.id)).length;
        if (visibleCount > 1) next.add(id);
      }
      return next;
    });
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "chart-interaction",
        hypothesisId: "UI",
        location: "LineTrendChart.jsx:legend",
        message: "Chart series legend toggled",
        data: { seriesId: id },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [series.length]);

  const handlePointer = useCallback(
    (clientX) => {
      const el = containerRef.current;
      if (!el || !xLabels.length) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const innerW = chartInnerW();
      const plotX = CHART.padX + ratio * innerW;
      const index = Math.round(((plotX - CHART.padX) / innerW) * (xLabels.length - 1));
      setActiveIndex(Math.max(0, Math.min(xLabels.length - 1, index)));
    },
    [xLabels.length]
  );

  useEffect(() => {
    if (activeIndex == null) return;
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "chart-interaction",
        hypothesisId: "UI",
        location: "LineTrendChart.jsx:hover",
        message: "Chart day hovered",
        data: { activeIndex, dayKey: xLabels[activeIndex]?.key },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [activeIndex, xLabels]);

  const activeDay = activeIndex != null ? xLabels[activeIndex] : null;
  const crosshairX =
    activeIndex != null
      ? pointCoords(activeIndex, 0, xLabels.length, maxY).x
      : null;

  return (
    <OutlinedCard accent="zinc" compact className={`p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
        <div className="min-w-0">
          <h3 className={`${typography.sectionTitle} text-zinc-500`}>{title}</h3>
          {subtitle ? (
            <p className="text-[10px] text-zinc-400 font-medium mt-1 leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
        {hasData && (
          <div className="text-right shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Period total</p>
            <p className="text-lg font-black text-zinc-900 tabular-nums">{periodTotal}</p>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="h-[240px] flex items-center justify-center rounded-2xl bg-zinc-50 border border-dashed border-zinc-200">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-center px-4">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className="relative w-full rounded-2xl bg-gradient-to-b from-zinc-50/80 to-white border border-zinc-100 touch-none select-none"
            onMouseLeave={() => setActiveIndex(null)}
            onMouseMove={(e) => handlePointer(e.clientX)}
            onTouchStart={(e) => {
              if (e.touches[0]) handlePointer(e.touches[0].clientX);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) handlePointer(e.touches[0].clientX);
            }}
            onTouchEnd={() => setActiveIndex(null)}
          >
            {activeDay && (
              <div
                className="absolute z-20 pointer-events-none min-w-[140px] max-w-[220px] rounded-xl border border-zinc-200 bg-white/95 backdrop-blur-sm shadow-lg px-3 py-2.5 animate-in fade-in duration-150"
                style={{
                  left: `${Math.min(Math.max(((crosshairX / CHART.width) * 100), 8), 72)}%`,
                  top: 8,
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                  {activeDay.short || activeDay.label}
                </p>
                <ul className="space-y-1">
                  {series.map((s) => {
                    const point = s.data[activeIndex];
                    const hidden = hiddenSeries.has(s.id);
                    return (
                      <li
                        key={s.id}
                        className={`flex items-center justify-between gap-3 text-xs ${hidden ? "opacity-40" : ""}`}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="font-bold text-zinc-600 truncate">{s.label}</span>
                        </span>
                        <span className="font-black tabular-nums text-zinc-900">{point?.value ?? 0}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <svg
              viewBox={`0 0 ${CHART.width} ${CHART.height}`}
              className="w-full min-w-[280px] h-[240px]"
              role="img"
              aria-label={title}
            >
              <defs>
                {visibleSeries.map((s, idx) => (
                  <linearGradient key={s.id} id={`${gradientId}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>

              {ticks.map((tick) => {
                const innerH = chartInnerH();
                const safeMax = maxY > 0 ? maxY : 1;
                const y = CHART.padY + innerH - (tick / safeMax) * innerH;
                return (
                  <g key={tick}>
                    <line
                      x1={CHART.padX}
                      y1={y}
                      x2={CHART.width - CHART.padX}
                      y2={y}
                      stroke="#e4e4e7"
                      strokeWidth="1"
                      strokeDasharray={tick === 0 ? "0" : "3 4"}
                    />
                    <text
                      x={CHART.padX - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-zinc-400 text-[9px] font-bold tabular-nums"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {crosshairX != null && (
                <line
                  x1={crosshairX}
                  y1={CHART.padY}
                  x2={crosshairX}
                  y2={CHART.height - CHART.padBottom}
                  stroke="#a1a1aa"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  opacity="0.85"
                />
              )}

              {visibleSeries.map((s, idx) => {
                const linePath = buildSmoothLinePath(s.data, maxY);
                const areaPath = s.fill ? buildAreaFromLine(linePath, s.data.length, maxY) : null;
                const dimmed = activeIndex != null;
                return (
                  <g key={s.id} opacity={dimmed ? 1 : 1}>
                    {areaPath && (
                      <path d={areaPath} fill={`url(#${gradientId}-${idx})`} className="transition-opacity duration-200" />
                    )}
                    <path
                      d={linePath}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-200"
                    />
                    {s.data.map((point, pi) => {
                      const { x, y } = pointCoords(pi, point.value, s.data.length, maxY);
                      const isActive = activeIndex === pi;
                      const r = isActive ? 6 : point.value > 0 ? 4 : 2.5;
                      return (
                        <g key={`${s.id}-${point.key}`}>
                          <circle cx={x} cy={y} r={isActive ? 12 : 8} fill="transparent" />
                          <circle
                            cx={x}
                            cy={y}
                            r={r}
                            fill="white"
                            stroke={s.color}
                            strokeWidth={isActive ? 2.5 : 2}
                            className="transition-all duration-150"
                            style={{
                              filter: isActive ? `drop-shadow(0 0 4px ${s.color}66)` : undefined,
                            }}
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {xLabels.map((label, i) => {
                const { x } = pointCoords(i, 0, xLabels.length, maxY);
                const isActive = activeIndex === i;
                return (
                  <text
                    key={label.key}
                    x={x}
                    y={CHART.height - 8}
                    textAnchor="middle"
                    className={`text-[9px] font-bold uppercase transition-colors ${
                      isActive ? "fill-zinc-800" : "fill-zinc-400"
                    }`}
                  >
                    {label.label}
                  </text>
                );
              })}

              {xLabels.map((label, i) => {
                const colW = chartInnerW() / Math.max(xLabels.length, 1);
                const x = CHART.padX + i * colW - colW / 2;
                return (
                  <rect
                    key={`hit-${label.key}`}
                    x={Math.max(CHART.padX, x)}
                    y={CHART.padY}
                    width={colW}
                    height={chartInnerH()}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setActiveIndex(i)}
                    onFocus={() => setActiveIndex(i)}
                    tabIndex={0}
                    aria-label={`${label.short || label.label} data point`}
                  />
                );
              })}
            </svg>
          </div>

          {series.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-zinc-100">
              {series.map((s) => {
                const hidden = hiddenSeries.has(s.id);
                const seriesTotal = s.data.reduce((sum, d) => sum + d.value, 0);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSeries(s.id)}
                    className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all ${
                      hidden
                        ? "border-zinc-100 bg-zinc-50 opacity-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                    }`}
                    aria-pressed={!hidden}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">
                      {s.label}
                    </span>
                    <span className="text-[10px] font-black text-zinc-900 tabular-nums">{seriesTotal}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </OutlinedCard>
  );
}

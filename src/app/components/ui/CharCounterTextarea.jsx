"use client";

import React from "react";

/** Rough GSM multipart SMS segment estimate */
export function estimateSmsSegments(charLength) {
  if (charLength <= 0) return 0;
  if (charLength <= 160) return 1;
  if (charLength <= 306) return 2;
  return Math.ceil(charLength / 153);
}

/**
 * Textarea with live character count.
 * @param {boolean} smsGuide - show SMS segment guidance (uses smsLength or value length)
 * @param {number} [smsLength] - total SMS body length when field is part of a composed message
 */
export function CharCounterTextarea({
  value = "",
  onChange,
  label,
  smsGuide = false,
  smsLength,
  className = "",
  counterClassName = "",
  ...textareaProps
}) {
  const fieldLength = String(value).length;
  const effectiveSmsLength = smsGuide ? (smsLength ?? fieldLength) : fieldLength;
  const segments = estimateSmsSegments(effectiveSmsLength);

  return (
    <div className="space-y-1">
      {label ? (
        <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">{label}</label>
      ) : null}
      <textarea
        value={value}
        onChange={onChange}
        className={className}
        {...textareaProps}
      />
      <div
        className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400 ${counterClassName}`}
      >
        <span>
          {fieldLength} character{fieldLength === 1 ? "" : "s"}
          {smsGuide ? (
            <>
              {" "}
              · SMS total ~{effectiveSmsLength} ({segments} segment
              {segments === 1 ? "" : "s"})
            </>
          ) : null}
        </span>
        {smsGuide ? (
          <span className="text-zinc-500 normal-case tracking-normal font-medium text-xs">
            No app character cap; multipart SMS charges may apply.
          </span>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { getSmsMaxLength } from "@/lib/smsMessageFormat";

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
  const smsMax = getSmsMaxLength();
  const effectiveSmsLength = smsGuide ? (smsLength ?? fieldLength) : fieldLength;
  const segments = estimateSmsSegments(effectiveSmsLength);
  const smsOverLimit = smsGuide && effectiveSmsLength > smsMax;

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
        <span className={smsOverLimit ? "text-amber-600" : ""}>
          {fieldLength} character{fieldLength === 1 ? "" : "s"}
          {smsGuide ? (
            <>
              {" "}
              · SMS total ~{effectiveSmsLength}/{smsMax} ({segments} segment
              {segments === 1 ? "" : "s"})
            </>
          ) : null}
        </span>
        {smsOverLimit ? (
          <span className="text-amber-600 normal-case tracking-normal font-medium text-xs">
            May truncate in text message
          </span>
        ) : null}
      </div>
    </div>
  );
}

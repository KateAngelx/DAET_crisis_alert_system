"use client";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TYPE_ICON_COMPONENTS } from "@/app/components/ui/cardTypeIcons";
import { alertTypeIconName, hazardTypeIconName } from "@/lib/typeIcons";

const cache = new Map();

/** White icon markup for a map pin, from the shared type icons. */
function glyph(name) {
  if (!cache.has(name)) {
    const Icon = TYPE_ICON_COMPONENTS[name];
    cache.set(name, Icon ? renderToStaticMarkup(createElement(Icon, { size: 12, color: "#ffffff", strokeWidth: 2.75 })) : "");
  }
  return cache.get(name);
}

export const alertPinGlyph = (alert) => glyph(alertTypeIconName(alert?.type));
export const hazardPinGlyph = (warning) => glyph(hazardTypeIconName(warning?.danger_type));

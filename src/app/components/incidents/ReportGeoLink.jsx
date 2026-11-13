import { LocateFixed } from "lucide-react";

const GPS_IN_TEXT = /GPS\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i;

function readCoordinate(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function formatReportCoordinates(record) {
  let lat = readCoordinate(record?.latitude);
  let lng = readCoordinate(record?.longitude);
  if (!validCoordinates(lat, lng)) {
    const match = String(record?.location || "").match(GPS_IN_TEXT);
    if (!match) return null;
    lat = Number(match[1]);
    lng = Number(match[2]);
  }
  if (!validCoordinates(lat, lng)) return null;
  return {
    lat,
    lng,
    label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
  };
}

export function ReportGeoLink({ record, className = "" }) {
  const coords = formatReportCoordinates(record);
  if (!coords) return null;

  return (
    <a
      href={coords.mapsUrl}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex w-fit items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-blue-700 hover:bg-blue-100 ${className}`}
    >
      <LocateFixed size={16} aria-hidden />
      GPS {coords.label}
    </a>
  );
}

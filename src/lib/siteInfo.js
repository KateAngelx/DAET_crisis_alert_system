/** Public-facing brand and contact details — Daet Municipal Tourism Office */
export const siteInfo = {
  version: "3.2",
  brandName: "CONNECT-DAET",
  officeName: "Daet Municipal Tourism Office",
  systemName: "DAET TOURISM CRISIS AND ALERT SYSTEM",
  tagline:
    "Official crisis alerts and emergency information for tourists in Daet, Camarines Norte.",
  address: "J.P. Rizal St., Magallanes Iraya, Brgy. III, Daet, Camarines Norte",
  officeHours: "Monday–Friday, 8:00 AM–5:00 PM",
  phoneMunicipal: "(054) 472-3000",
  phoneMunicipalTel: "+63544723000",
  phoneTourism: "0963-4646-708",
  phoneTourismTel: "+639634646708",
  phoneTourismAlt: "0997-1224-788",
  phoneTourismAltTel: "+639971224788",
  emailTourism: "daettourism2019@gmail.com",
  emailMunicipal: "info@lgudaet.gov.ph",
  facebook: "https://www.facebook.com/daettourism2019",
  facebookHandle: "@daettourism2019",
  /**
   * Local Daet / Camarines Norte responders, shown before the national numbers.
   * Add only numbers confirmed with each office (MDRRMO, PNP Daet, BFP Daet,
   * provincial hospital, Coast Guard). `tel` is the dialable form.
   */
  localHotlines: [
    { name: "Daet Tourism Office", number: "0963-4646-708", tel: "+639634646708" },
  ],
  /** National emergency numbers */
  emergencyHotlines: [
    { name: "National Emergency Hotline", number: "911" },
    { name: "PNP", number: "117" },
    { name: "BFP", number: "160" },
    { name: "DOH", number: "1555" },
    { name: "Red Cross", number: "143" },
  ],
};

/** Local numbers first, then national ones — the single list every page shows. */
export const allEmergencyHotlines = [...siteInfo.localHotlines, ...siteInfo.emergencyHotlines];

export function hotlineTel(hotline) {
  return hotline.tel || hotline.number;
}

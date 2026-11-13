import { InfoPageHero, InfoSection, PublicPageShell, PublicPageContent, publicLayout } from "@/app/components/InfoPageHero";
import { Phone, Mail, MapPin, Clock, Share2 } from "lucide-react";
import { iconSize, typography, portalShell } from "@/lib/designSystem";
import { siteInfo } from "@/lib/siteInfo";

export const metadata = {
  title: `Contact | ${siteInfo.brandName}`,
  description: `Contact the ${siteInfo.officeName} for tourism and crisis alert inquiries.`,
};

export default function ContactPage() {
  return (
    <PublicPageShell>
      <InfoPageHero
        title="Contact Us"
        description={`For non-emergency inquiries about alerts, incident reports, or account issues. For immediate danger, call 911 or 117.`}
      />

      <PublicPageContent>
        <div className={publicLayout.cardGrid}>
          <ContactCard
            icon={<MapPin size={iconSize.stat} className="text-blue-600" />}
            title="Office Location"
            content={siteInfo.address}
          />
          <ContactCard
            icon={<Phone size={iconSize.stat} className="text-blue-600" />}
            title="Municipal Hotline"
            content={siteInfo.phoneMunicipal}
            href={`tel:${siteInfo.phoneMunicipalTel}`}
          />
          <ContactCard
            icon={<Phone size={iconSize.stat} className="text-blue-600" />}
            title="Tourism Office Mobile"
            content={siteInfo.phoneTourism}
            href={`tel:${siteInfo.phoneTourismTel}`}
          />
          <ContactCard
            icon={<Phone size={iconSize.stat} className="text-blue-600" />}
            title="Tourism Office Mobile"
            content={siteInfo.phoneTourismAlt}
            href={`tel:${siteInfo.phoneTourismAltTel}`}
          />
          <ContactCard
            icon={<Mail size={iconSize.stat} className="text-blue-600" />}
            title="Tourism Office Email"
            content={siteInfo.emailTourism}
            href={`mailto:${siteInfo.emailTourism}`}
          />
          <ContactCard
            icon={<Share2 size={iconSize.stat} className="text-blue-600" />}
            title="Facebook"
            content={siteInfo.facebookHandle}
            href={siteInfo.facebook}
          />
          <ContactCard
            icon={<Clock size={iconSize.stat} className="text-blue-600" />}
            title="Office Hours"
            content={siteInfo.officeHours}
          />
        </div>

        <InfoSection title="Emergency Hotlines">
          <p>For life-threatening emergencies, contact these numbers immediately — do not use this contact page:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {siteInfo.emergencyHotlines.map((h) => (
              <li key={h.number} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <span className="font-bold text-sm text-zinc-700">{h.name}</span>
                <a href={`tel:${h.number}`} className="font-black text-blue-600">{h.number}</a>
              </li>
            ))}
          </ul>
        </InfoSection>

        <InfoSection title="System Support">
          <p>
            For account issues, incident report inquiries, or technical support, email{" "}
            <a href={`mailto:${siteInfo.emailTourism}`} className="text-blue-600 font-bold hover:underline">{siteInfo.emailTourism}</a>{" "}
            or call the tourism office at{" "}
            <a href={`tel:${siteInfo.phoneTourismTel}`} className="text-blue-600 font-bold hover:underline">{siteInfo.phoneTourism}</a>
            {" / "}
            <a href={`tel:${siteInfo.phoneTourismAltTel}`} className="text-blue-600 font-bold hover:underline">{siteInfo.phoneTourismAlt}</a>.
            Facebook:{" "}
            <a href={siteInfo.facebook} className="text-blue-600 font-bold hover:underline" target="_blank" rel="noreferrer">{siteInfo.facebookHandle}</a>.
            You may also reach the municipal hotline at{" "}
            <a href={`tel:${siteInfo.phoneMunicipalTel}`} className="text-blue-600 font-bold hover:underline">{siteInfo.phoneMunicipal}</a>.
          </p>
        </InfoSection>
      </PublicPageContent>
    </PublicPageShell>
  );
}

function ContactCard({ icon, title, content, href }) {
  const inner = (
    <div className={`${portalShell.statMini} p-5 sm:p-6 h-full text-left`}>
      <div className="mb-3">{icon}</div>
      <p className={`${typography.statLabel} text-zinc-400 tracking-widest mb-1`}>{title}</p>
      <p className={`${typography.body} font-bold text-zinc-900`}>{content}</p>
    </div>
  );
  return href ? <a href={href} className="block hover:opacity-80 transition-opacity">{inner}</a> : inner;
}

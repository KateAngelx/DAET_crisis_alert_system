import Link from "next/link";
import { InfoPageHero, InfoSection, PublicPageShell, PublicPageContent, publicLayout } from "@/app/components/InfoPageHero";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { iconSize, typography } from "@/lib/designSystem";

export const metadata = {
  title: "Contact | CONNECT-DAET Crisis Alert System",
  description: "Contact the Daet LGU crisis communication team for support and inquiries.",
};

export default function ContactPage() {
  return (
    <PublicPageShell>
      <InfoPageHero
        title="Contact Us"
        description="For non-emergency inquiries about alerts, incident reports, or account issues. For immediate danger, call 911 or 117."
      />

      <PublicPageContent>
        <div className={`${publicLayout.cardGrid} mb-10`}>
          <ContactCard
            icon={<MapPin size={iconSize.stat} className="text-blue-600" />}
            title="Office Location"
            content="Municipal Hall, Daet, Camarines Norte, Philippines"
          />
          <ContactCard
            icon={<Phone size={iconSize.stat} className="text-blue-600" />}
            title="Municipal Hotline"
            content="(054) 440-1234"
            href="tel:+63544401234"
          />
          <ContactCard
            icon={<Mail size={iconSize.stat} className="text-blue-600" />}
            title="Crisis Communication Email"
            content="crisis@connect-daet.ai"
            href="mailto:crisis@connect-daet.ai"
          />
          <ContactCard
            icon={<Clock size={iconSize.stat} className="text-blue-600" />}
            title="Alert Monitoring"
            content="24/7 automated monitoring. Staff response during LGU office hours."
          />
        </div>

        <InfoSection title="Emergency Hotlines">
          <p>For life-threatening emergencies, contact these numbers immediately — do not use this contact page:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { name: "National Emergency Hotline", number: "911" },
              { name: "PNP", number: "117" },
              { name: "BFP", number: "160" },
              { name: "DOH", number: "1555" },
              { name: "Red Cross", number: "143" },
            ].map((h) => (
              <li key={h.number} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <span className="font-bold text-sm text-zinc-700">{h.name}</span>
                <a href={`tel:${h.number}`} className="font-black text-blue-600">{h.number}</a>
              </li>
            ))}
          </ul>
        </InfoSection>

        <InfoSection title="System Support">
          <p>
            For account issues, incident report inquiries, or technical support with the CONNECT-DAET system, email{" "}
            <a href="mailto:crisis@connect-daet.ai" className="text-blue-600 font-bold hover:underline">crisis@connect-daet.ai</a>{" "}
            or call the municipal hotline. Authorized responders can access the{" "}
            <Link href="/admin" className="text-blue-600 font-bold hover:underline">Responder Portal</Link>.
          </p>
        </InfoSection>
      </PublicPageContent>
    </PublicPageShell>
  );
}

function ContactCard({ icon, title, content, href }) {
  const inner = (
    <div className="p-5 sm:p-6 bg-zinc-50 border border-zinc-200 rounded-3xl h-full min-w-0">
      <div className="mb-3">{icon}</div>
      <p className={`${typography.statLabel} text-zinc-400 tracking-widest mb-1`}>{title}</p>
      <p className={`${typography.body} font-bold text-zinc-900`}>{content}</p>
    </div>
  );
  return href ? <a href={href} className="block hover:opacity-80 transition-opacity">{inner}</a> : inner;
}

import { InfoPageHero, InfoSection, PublicPageShell, PublicPageContent } from "@/app/components/InfoPageHero";
import { AboutNextSteps } from "@/app/components/AboutNextSteps";
import { siteInfo } from "@/lib/siteInfo";

export const metadata = {
  title: `About | ${siteInfo.brandName}`,
  description: `How the ${siteInfo.officeName} crisis alert system works for tourists, guides, and responders.`,
};

export default function AboutPage() {
  return (
    <PublicPageShell>
      <InfoPageHero
        title={siteInfo.systemName}
        description={`A municipal alert and reporting platform operated by the ${siteInfo.officeName}. It publishes official crisis information and lets tourists and staff submit incident reports.`}
      />

      <PublicPageContent>
        <InfoSection title="Purpose">
          <p>
            {siteInfo.brandName} helps tourists and tourism staff in Daet understand what is happening during a crisis — what the alert is, where it is occurring, how severe it is, and what actions to take. Authorized municipal personnel use the admin portal to issue alerts, review reports, and update response status.
          </p>
        </InfoSection>

        <InfoSection title="Information Available to the Public">
          <ul className="list-disc pl-5 space-y-2">
            <li>Active crisis alerts with severity level, type, and affected location</li>
            <li>Date and time each alert was issued</li>
            <li>Official safety instructions and announcements from the {siteInfo.officeName}</li>
            <li>Maps showing affected or restricted areas when applicable</li>
            <li>Alert history and status updates (Active or Resolved)</li>
            <li>Incident report submission and response tracking for registered users</li>
          </ul>
        </InfoSection>

        <InfoSection title="Who Uses It">
          <p>
            <strong>Tourists</strong> — view alerts, receive notifications, and submit incident reports.<br />
            <strong>Tourism guides</strong> — monitor alerts and assigned tourists during an incident.<br />
            <strong>Municipal administrators</strong> — issue broadcasts, manage reports, and update response status through the admin portal.
          </p>
        </InfoSection>

        <InfoSection title="Operated By">
          <p>
            {siteInfo.officeName}, Municipality of Daet, Camarines Norte. For non-emergency inquiries, contact{" "}
            <a href={`mailto:${siteInfo.emailTourism}`} className="text-blue-600 font-bold hover:underline">{siteInfo.emailTourism}</a>{" "}
            or call {siteInfo.phoneTourism} during {siteInfo.officeHours.toLowerCase()}.
          </p>
        </InfoSection>

        <InfoSection title="Emergency Contacts">
          <ul className="list-disc pl-5 space-y-2">
            {siteInfo.emergencyHotlines.map((h) => (
              <li key={h.number}><strong>{h.number}</strong> — {h.name}</li>
            ))}
            <li><strong>{siteInfo.phoneMunicipal}</strong> — Municipal hotline ({siteInfo.officeHours.toLowerCase()})</li>
          </ul>
        </InfoSection>

        <AboutNextSteps />
      </PublicPageContent>
    </PublicPageShell>
  );
}

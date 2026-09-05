import { InfoPageHero, InfoSection, PublicPageShell, PublicPageContent } from "@/app/components/InfoPageHero";
import { AboutNextSteps } from "@/app/components/AboutNextSteps";

export const metadata = {
  title: "About | CONNECT-DAET Crisis Alert System",
  description: "How the Daet LGU crisis alert system works for tourists, guides, and responders.",
};

export default function AboutPage() {
  return (
    <PublicPageShell>
      <InfoPageHero
        title="CONNECT-DAET Crisis Alert System"
        description="A municipal alert and reporting system for Daet, Camarines Norte. It publishes official crisis information and lets tourists and staff submit incident reports."
      />

      <PublicPageContent>
        <InfoSection title="Purpose">
          <p>
            CONNECT-DAET helps tourists and tourism staff in Daet understand what is happening during a crisis — what the alert is, where it is occurring, how severe it is, and what actions to take. Authorized LGU personnel use the admin portal to issue alerts, review reports, and update response status.
          </p>
        </InfoSection>

        <InfoSection title="Information Available to the Public">
          <ul className="list-disc pl-5 space-y-2">
            <li>Active crisis alerts with severity level, type, and affected location</li>
            <li>Date and time each alert was issued</li>
            <li>Official safety instructions and announcements from Daet LGU</li>
            <li>Maps showing affected or restricted areas when applicable</li>
            <li>Alert history and status updates (Active or Resolved)</li>
            <li>Incident report submission and response tracking for registered users</li>
          </ul>
        </InfoSection>

        <InfoSection title="Who Uses It">
          <p>
            <strong>Tourists</strong> — view alerts, receive notifications, and submit incident reports.<br />
            <strong>Tourism guides</strong> — monitor alerts and assigned tourists during an incident.<br />
            <strong>LGU administrators</strong> — issue broadcasts, manage reports, and update response status through the admin portal.
          </p>
        </InfoSection>

        <InfoSection title="Operated By">
          <p>
            Daet Local Government Unit, Camarines Norte. For non-emergency inquiries, contact the municipal crisis communication team at crisis@connect-daet.ai or call the municipal hotline listed on the Contact page.
          </p>
        </InfoSection>

        <InfoSection title="Emergency Contacts">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>911</strong> — National emergency hotline</li>
            <li><strong>117</strong> — Philippine National Police</li>
            <li><strong>Municipal Hall, Daet</strong> — (054) 440-1234 (office hours)</li>
          </ul>
        </InfoSection>

        <AboutNextSteps />
      </PublicPageContent>
    </PublicPageShell>
  );
}

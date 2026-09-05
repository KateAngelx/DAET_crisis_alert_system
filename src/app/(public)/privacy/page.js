import { InfoPageHero, InfoSection, PublicPageShell, PublicPageContent } from "@/app/components/InfoPageHero";

export const metadata = {
  title: "Privacy Policy | CONNECT-DAET Crisis Alert System",
  description: "Privacy policy for the CONNECT-DAET Tourism Crisis Communication and Emergency Alert System.",
};

export default function PrivacyPage() {
  return (
    <PublicPageShell>
      <InfoPageHero
        title="Privacy Policy"
        description="How CONNECT-DAET collects, uses, and protects your personal information."
      />

      <PublicPageContent>
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-10">Last updated: September 2026</p>

        <InfoSection title="Information We Collect">
          <p>When you register or use CONNECT-DAET, we may collect:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Full name, email address, and phone number</li>
            <li>Nationality and account role (tourist, guide, or admin)</li>
            <li>Incident reports you submit, including location and attachments</li>
            <li>Notification preferences and delivery status</li>
            <li>Usage data related to alert views and acknowledgments</li>
          </ul>
        </InfoSection>

        <InfoSection title="How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li>Deliver emergency alerts and crisis notifications</li>
            <li>Process and coordinate incident reports</li>
            <li>Manage user accounts and responder access</li>
            <li>Improve system reliability and crisis communication effectiveness</li>
          </ul>
        </InfoSection>

        <InfoSection title="Data Sharing">
          <p>
            Your information is shared only with authorized LGU personnel and responders involved in crisis coordination. We do not sell personal data to third parties. Email and SMS delivery may involve third-party service providers bound by confidentiality requirements.
          </p>
        </InfoSection>

        <InfoSection title="Data Security">
          <p>
            We use industry-standard security measures including encrypted connections, role-based access controls, and secure database storage through Supabase. Despite these measures, no system is completely immune to security risks.
          </p>
        </InfoSection>

        <InfoSection title="Your Rights">
          <p>
            You may request access to, correction of, or deletion of your personal data by contacting crisis@connect-daet.ai. Account deletion may affect your ability to receive alerts and track incident reports.
          </p>
        </InfoSection>

        <InfoSection title="Contact">
          <p>
            For privacy-related inquiries, contact the Daet LGU Data Protection Officer at crisis@connect-daet.ai or Municipal Hall, Daet, Camarines Norte.
          </p>
        </InfoSection>
      </PublicPageContent>
    </PublicPageShell>
  );
}

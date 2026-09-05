import { InfoPageHero, InfoSection, PublicPageShell, PublicPageContent } from "@/app/components/InfoPageHero";

export const metadata = {
  title: "Terms of Service | CONNECT-DAET Crisis Alert System",
  description: "Terms of service for using the CONNECT-DAET Tourism Crisis Communication and Emergency Alert System.",
};

export default function TermsPage() {
  return (
    <PublicPageShell>
      <InfoPageHero
        title="Terms of Service"
        description="Terms and conditions for using the CONNECT-DAET crisis communication platform."
      />

      <PublicPageContent>
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-10">Last updated: September 2026</p>

        <InfoSection title="Acceptance of Terms">
          <p>
            By accessing or using CONNECT-DAET, you agree to these Terms of Service. If you do not agree, please do not use the system. The platform is provided by the Local Government Unit of Daet, Camarines Norte.
          </p>
        </InfoSection>

        <InfoSection title="Purpose of the System">
          <p>
            CONNECT-DAET is a Tourism Crisis Communication and Emergency Alert System designed to disseminate crisis information and coordinate emergency responses. It is not a substitute for professional emergency services such as 911, PNP (117), or BFP (160).
          </p>
        </InfoSection>

        <InfoSection title="User Responsibilities">
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate registration and incident report information</li>
            <li>Use the system only for legitimate safety and crisis-related purposes</li>
            <li>Not submit false, misleading, or malicious reports</li>
            <li>Follow official guidance issued through verified alerts</li>
            <li>Keep login credentials confidential</li>
          </ul>
        </InfoSection>

        <InfoSection title="Account Terms">
          <p>
            Accounts are intended for tourists, tourism personnel, and authorized responders. The LGU reserves the right to suspend or terminate accounts that violate these terms or misuse the system.
          </p>
        </InfoSection>

        <InfoSection title="Alert Accuracy & Availability">
          <p>
            While we strive for timely and accurate alerts, the system depends on internet connectivity, third-party services, and human input. The LGU is not liable for delays, omissions, or service interruptions beyond reasonable control.
          </p>
        </InfoSection>

        <InfoSection title="Limitation of Liability">
          <p>
            CONNECT-DAET is provided &quot;as is&quot; for crisis communication support. The LGU shall not be liable for damages arising from reliance on alerts, system downtime, or failure to receive notifications. Users must contact emergency services directly for life-threatening situations.
          </p>
        </InfoSection>

        <InfoSection title="Changes to Terms">
          <p>
            These terms may be updated periodically. Continued use of the system after changes constitutes acceptance of the revised terms.
          </p>
        </InfoSection>

        <InfoSection title="Contact">
          <p>
            Questions about these terms may be directed to crisis@connect-daet.ai or the Municipal Hall of Daet, Camarines Norte.
          </p>
        </InfoSection>
      </PublicPageContent>
    </PublicPageShell>
  );
}

import { redirect } from "next/navigation";

export default function LegacySafeRoutePage() {
  redirect("/routes");
}

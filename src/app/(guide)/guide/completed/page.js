import { redirect } from "next/navigation";

/** Old link: Completed tours is now part of Past tours. */
export default function GuideCompletedRedirect() {
  redirect("/guide/history");
}

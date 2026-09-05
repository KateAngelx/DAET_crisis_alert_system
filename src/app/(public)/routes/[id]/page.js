import { redirect } from "next/navigation";

export default async function LegacyRouteDetailPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const view = sp?.view;
  const query = view === "alternative" ? `?route=${id}&view=alternative` : `?route=${id}`;
  redirect(`/routes${query}`);
}

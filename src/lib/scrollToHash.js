/** After navigation, scroll to an in-page anchor (e.g. #messages on report detail). */
export function scrollToHashOnMount(hash = "") {
  if (typeof window === "undefined" || !hash) return;
  const id = hash.replace(/^#/, "");
  if (!id) return;
  const run = () => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const relativePath = specifier.slice(2).replace(/^\//, "");
    const withExtension = relativePath.endsWith(".js") || relativePath.endsWith(".mjs")
      ? relativePath
      : `${relativePath}.js`;
    const url = new URL(`../src/${withExtension}`, import.meta.url);
    return nextResolve(url.href, context);
  }
  return nextResolve(specifier, context);
}

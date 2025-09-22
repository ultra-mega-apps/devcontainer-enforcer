import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

async function render(svgPath, pngPath, width, height) {
  const svg = await readFile(svgPath);
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "rgba(0,0,0,0)",
  });
  // If height is significant different, we can re-render with height constraint
  if (height) {
    const r2 = new Resvg(svg, {
      fitTo: { mode: "height", value: height },
      background: "rgba(0,0,0,0)",
    });
    // Pick the one closer to target ratio; for our assets, width is sufficient.
    const pngData = r2.render().asPng();
    await writeFile(pngPath, pngData);
    return;
  }
  const pngData = r.render().asPng();
  await writeFile(pngPath, pngData);
}

async function main() {
  const root = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    ".."
  );
  const iconSvg = path.join(root, "images", "icon.svg");
  const iconPng = path.join(root, "images", "icon.png");
  const bannerSvg = path.join(root, "images", "banner.svg");
  const bannerPng = path.join(root, "images", "banner.png");

  await render(iconSvg, iconPng, 128, 128);
  await render(bannerSvg, bannerPng, 1280, 320);
  console.log("[assets] Generated PNGs from SVGs");
}

main().catch((err) => {
  console.error("[assets] svg-to-png failed:", err);
  process.exit(1);
});

import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:5173");
  const result = await page.evaluate(async () => {
    const { buildFootballer } = await import("/src/game/assets/footballer.ts");
    const { buildClips } = await import("/src/game/animation/clips.ts");
    const { GLTFExporter } =
      await import("/node_modules/three/examples/jsm/exporters/GLTFExporter.js");
    const asset = buildFootballer();
    const buffer = await new GLTFExporter().parseAsync(asset.root, {
      binary: true,
      animations: buildClips(),
    });
    return {
      bytes: Array.from(new Uint8Array(buffer)),
      vertices: asset.mesh.geometry.attributes.position.count,
      triangles: asset.mesh.geometry.index.count / 3,
      bones: asset.mesh.skeleton.bones.length,
      clips: buildClips().map((c) => c.name),
    };
  });
  await mkdir("public/assets/characters", { recursive: true });
  await writeFile(
    "public/assets/characters/lagos-footballer.glb",
    Buffer.from(result.bytes),
  );
  console.log({ ...result, bytes: result.bytes.length });
} finally {
  await browser.close();
}

# Lagos footballer — original project asset

`lagos-footballer.glb` is generated from this repository's original mesh topology, skin weights, skeleton and animation curves. It uses no downloaded character, celebrity likeness, motion-capture performance or third-party texture.

- 24,367 source vertices; 43,960 triangles; 17 bones.
- Seven material groups, with team colours and cosmetic variants applied at runtime.
- Twelve embedded clips: idle, run, sprint, pass, shot, tackle, skill, keeper, catch, left/right dive and celebrate.
- File size: approximately 829 KiB. Runtime clones share the base geometry and clips; hair variants copy their geometry.

Authoring source: `src/game/assets/footballer.ts` and `src/game/animation/clips.ts`.

Regenerate with the Vite development server running:

```sh
npm run assets:character
```

The script uses Playwright Chromium. Set `CHROME_PATH` to use an existing Chrome executable. The source fallback can construct the same base mesh when the GLB cannot be loaded. This is an original stylized model with authored ring topology, not an artist-sculpted photorealistic scan. Hands and facial expressions remain simplified. Animation improvements should preserve the simulation contact markers in `src/game/animation/actions.ts`.

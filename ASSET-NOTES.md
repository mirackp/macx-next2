# Visual asset notes

- `logos/macx-brand.jpeg`: exact user-provided logo from D:/MacX/Logo.jpeg, copied without editing.
- `assets/macx-studio.png`: original generated illustration, made using the built-in ImageGen tool on 2026-10-26. Embedded in the hero and studio page. The character portraits are CSS views of this same illustration.

## Generation prompt

Create one premium wide cinematic illustration for a Turkish football discussion show website named MacX (do NOT put any text or logos in the image). Landscape panoramic composition, approximately 2:1. Exactly FIVE anthropomorphic animal TV football pundits seated behind a sophisticated curved broadcast desk. From LEFT to RIGHT: a clever red FOX in stylish navy sport jacket, an articulate black CROW in charcoal blazer, at CENTER a confident green LIZARD moderator wearing a sharply tailored dark formal SUIT, white shirt and electric blue necktie, then an elderly thoughtful TURTLE wearing dark cardigan jacket and thin round glasses, then an expressive gray tabby CAT in a stylish dark casual blazer. Anatomically recognizable animal heads and human-like clothed torsos, sophisticated stylized 3D animation film character design with tactile fur/scales/feathers; original characters, appealing but mature sports editorial brand, not children's cartoon. All five are equally clear and distinct, medium-wide front shot, faces readable. The lizard is central, subtly higher and authoritative with an open palm moderating. Each has a small broadcast microphone. Navy midnight football TV studio backdrop, electric blue LED arc lighting, vivid lime green LED desk accents, subtle stadium/pitch display behind them, dramatic but clean studio lighting, realistic shadows, high-end art direction. Keep entire group in center-right with small breathing room all around, no cropped heads or hands, no extra animals or people. No captions, no numbers, no badges, no writing, no watermarks. This is actual website hero art, not a website mockup. Colors midnight navy #071426, electric cobalt #1369ed, neon lime #83f516.

## Next.js conversion

The original studio illustration was resized and compressed with Sharp into responsive WebP assets. The scene, characters and supplied logo were preserved. `public/images/studio.webp` is the desktop version and `public/images/studio-small.webp` is the phone version. `public/images/logo-original.jpeg` preserves the original supplied logo; `logo.webp` is its compact display version.

Team and league PNG logos were also reduced to a maximum display resolution of 128 px with lossless PNG encoding and palette optimization. The original total was 22,180,706 bytes; the optimized total is 2,032,071 bytes. Supplied JPEG logo originals were left unchanged.

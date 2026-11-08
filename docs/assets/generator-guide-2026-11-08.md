# Generator guide redesign

The generator's delivery notice, capabilities and prompt examples now form one
compact creative-workspace panel. The saved-result instructions retain the
existing registered, guest email and temporary-download behavior.

## Visual direction

Reading this as a focused redesign of the creative starting point for people
making their first video or image. Preserve Pavo AI's cinematic dark surface,
peacock teal accent and existing Inter Tight / Anton / IBM Plex Mono font stack.
The distinctive element is the illustrated scene list, with full prompt text
and a selection indicator. Typography uses the existing body face because these
are instructions and controls, rather than another display headline.

Design variance 5, motion intensity 3, visual density 4. Use color transitions
only for hover and selection feedback; respect reduced-motion preferences.
Keep the existing `--sv-night`, `--sv-night-foreground`, `--sv-night-muted` and
`--sv-iris-bright` tokens. Both site color modes retain this established dark
generator surface. On smaller screens the delivery panel stacks above the
scene picker, with capabilities in two columns.

## Assets

- Night drive: existing `/media/landing/user-neon-drive.jpg`.
- Product: existing `/imgs/generated/pavo-guides/product-video-cover.webp`.
- Anime: [prompt-anime-rooftop.webp](../../public/imgs/generated/pavo-guides/prompt-anime-rooftop.webp),
  created with the built-in imagegen tool and compressed to a 480 px WebP.

These are scene references, not claims that the selected provider generated
these exact images from the example prompt.

### Final anime image prompt

> Use case: illustration-story. Create a polished 16:9 anime film still to use as a small visual prompt thumbnail on a creative website. An adult woman with short dark hair blowing gently in the wind stands on a city rooftop at sunset, seen in a quiet three-quarter profile, wearing a simple cream jacket. Hand-painted cinematic anime style, warm peach sunlight, distant teal city skyline, clear silhouette and readable composition even at small size. Original character, no text, no logos, no watermark. The sunset and the woman should sit near the center so the scene survives thumbnail cropping.

## Copy and behavior

The new bilingual strings label scene suggestions, selection and delivery.
Existing model, price, credit, download and email-availability wording is
unchanged. The public-copy fixture includes only these added UI labels; its
existing guard remains intact. Selecting a scene fills and focuses the prompt,
without submitting a generation. Scene selection is disabled while a task is
starting or rendering.

Deploy the component changes, locale additions and anime WebP together. No
database, payment configuration or schema changes are needed.

## Validation

- Production build passed in the shared workspace and the isolated preview.
- All seven public-copy and generation-state checks passed.
- English desktop, Chinese 390 px and English 320 px layouts were inspected.
- Full prompts and all thumbnails render without horizontal overflow.
- Keyboard selection fills and focuses the prompt without submitting.
- Light/dark site settings retain the existing dark generator surface.
- Reduced-motion mode disables the new hover transition.
- This redesign has not been deployed.

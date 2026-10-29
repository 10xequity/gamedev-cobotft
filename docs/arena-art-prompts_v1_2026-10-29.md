# Tactical Boom — Arena Art Prompts

**Version** 1.0 · **Date** 2026-10-29 · **Status** Optional, not commissioned · **Supersedes** nothing

The game now draws its four arenas in code (`tft-wcni4yex/js/stage.js`): sharp at any size, tiny, offline.
These prompts are for an optional photo-like set from an image generator (Runway is connected; each image
spends credits, so generate only when you want them). Nothing here is used by the game until someone adds the
images and switches the stage over.

## What every image must match

- **Size:** 2000 × 1800 px (the court box is 1 : 0.9). Export WebP, under 600 KB each.
- **Camera:** behind one baseline, raised, looking down the length of the court. The far baseline sits about a
  quarter of the way down the image and is about 58% of the image width, centred. The near baseline is at the
  bottom edge, nearly the full width. The net crosses at about 58% down. This is the perspective the hex board
  already uses; an image that does not match will look wrong under the hexes.
- **Court:** an empty indoor volleyball court (beach theme: sand), no players, no people close up, no ball.
- **No text or logos** of any real club, brand or sponsor. A plain LED ribbon board is fine; the game can
  overlay its own text.
- **No real people:** crowd only as distant, soft-focus shapes. Nothing that could be matched to a real person.
- **Palette:** teal #0E7C86, dark teal #065A62, gold #E5B800, cream #FFF9F0, black #111111 as accents.

## Prompts

1. **Fieldhouse** — "Warm college fieldhouse, empty maple volleyball court seen from a raised position behind
   one baseline looking down the court, warm amber overhead lights, dark red-brown apron around the court,
   wooden bleachers with a distant soft-focus crowd, gold LED ribbon board along the far side with no text,
   cinematic lighting, HD, photorealistic, no people in focus, no logos, no text."
2. **Championship Arena** — "Modern indoor arena at night, empty light maple volleyball court with a teal apron,
   seen from a raised position behind one baseline looking down the court, cool white spotlights from the
   roof, deep navy stands with a soft-focus crowd and small lights, teal-to-gold LED ribbon board with no text,
   glossy floor reflections, HD, photorealistic, no logos, no text, no people in focus."
3. **Beach Night** — "Beach volleyball court at night, smooth sand, teal boundary tape, seen from a raised
   position behind one baseline looking down the court, warm string lights strung overhead, dark blue starry
   sky, distant ocean, gold LED board low on the far side with no text, HD, photorealistic, no people, no
   logos, no text."
4. **Retro Gym** — "1980s high-school gym, empty honey-coloured wooden volleyball court with a gold apron and
   black lines, seen from a raised position behind one baseline looking down the court, maroon walls with
   teal and gold pennant banners, pull-out wooden bleachers with a soft-focus crowd, red-and-gold LED ribbon
   board with no text, HD, photorealistic, no logos, no text, no people in focus."

## Using them

Save as `tft-wcni4yex/assets/stages/<name>-hd.webp`, then ask for the stage to show the image under the drawn
court lines instead of the drawn backdrop. Check each one against the camera rules above first.

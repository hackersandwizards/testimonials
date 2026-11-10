# Portrait search, retouch and AI regeneration: method and measurements

The portrait work of 08.11.2026 changed no portrait. This report keeps its method and its numbers.
The records naming people and clients live in Company OS.

## Slots

Measured in headless Chrome for Testing on the website's build, at a 1440 px window at 2x and a
390 px window at 3x, on every page with a client portrait.

- 14 portraits. 6 show on quote cards at 492 CSS px on a laptop and 80 CSS px on a phone; the card
  asks for 960 px on a 2x screen. Their files are 389 to 480 px.
- 8 show only as 48 to 64 CSS px avatars, which ask for 96 to 192 px. All but one file cover that.

## Search for larger real photos

Reverse image search, company team pages, conference and speaker pages and public profile pages,
read-only. Signed-in sources were left out.

- Face match: OpenCV YuNet and SFace, cosine against the current file with both scaled to its size.
  Bar 0.90, plus a side-by-side check.
- Real resolution: the detail lost when a file is scaled to half and back. An upscale with no real
  detail fails.
- Each master is cut to the current file's framing, located by SIFT matches.
- Result: 3 of 14 people had the same photo larger, all three avatars only. None for the 6 cards.

## Retouch

`bun run retouch:portrait` (`scripts/retouch-portrait.ts`): crop, denoise only above a noise level,
white balance by channel gain on near-neutral pixels, a tone curve with a soft highlight roll-off,
optional sharp-2, WebP q82.

- Immerkær sigma of the 14 masters: 0.26 to 2.09, all under the 2.5 threshold, so none was denoised.
- Channel gains stayed within 0.966 to 1.026.

## Blind review of the retouch and the larger sources

Per person: the current file, retouch, retouch with sharp-2, and for the larger sources the same
three from the source. 102 images, each in page context at device pixels, swapped in by request
interception and encoded as the website encodes. Labels were random letters, shuffled per reviewer.

- Persona: the CTO of a 300-person software company checking a training provider's site before
  booking, on a 14-inch 2x laptop and on a 390 px 3x phone.
- Reviewers: Claude (Opus) and Codex (gpt-6.1-sol, high), two runs each.
- Criteria, fixed before scoring, each 1 to 10: sharpness, natural, crop, trust, fit, calm. The
  score is their mean.
- Noise, run 1 against run 2 on the same image: Claude 0.30 (largest 1.00), Codex 0.19 (largest
  0.67).
- Win rule: a version wins only where its lead over the current file, averaged over both devices,
  exceeds the model's noise in all four model-run cells.
- Result: no version won. The median score of the 14 current files is 7.79.
- A first panel saw the same screenshot for every version, because the build hashes portrait file
  names. Its 20 runs were discarded, and the rerun checked first that every screenshot differs.

## AI regeneration

In scope: the 4 card portraits scoring below the 7.79 median for which neither the retouch nor
sharp-2 won. Codex image generation (Codex CLI 0.167, `image_gen`) with a budget fixed before the
first result: two methods (restore the current photo, regenerate the person), two samples each, plus
one trial prompt. 17 candidates.

Identity gate, bars fixed before measuring:

- Cosine to the current file at least 0.90. Control: press photos against their own 640 px copies
  score 0.975 on this pipeline.
- Cosine to each other real photo at least the current file's own cosine to it, minus 0.05. Real
  photos of one person score 0.44 to 0.89 against each other, above SFace's same-identity threshold
  of 0.363.
- Landmark residual at most 2.9 %: the mean distance of the five YuNet landmarks after a similarity
  fit, as a share of the eye distance. Real photos of one person measure 2 to 14 %.

Result: all 17 failed. Cosine to the current file ranged from 0.617 to 0.904; the one candidate at
0.904 failed the landmark bar at 5.0 %. No candidate reached the reviewers' identity question. Every
candidate was larger than the current file, so resolution does not explain the misses.

## Blind review of two real photos found on the way

Two larger real photos, published by the clients' own companies, scored against the current files:
three personas (the CTO on laptop and phone, a portrait photographer on the laptop), Claude and
Codex, two runs each, 12 runs. Noise: Claude 0.47 (largest 1.33), Codex 0.18 (largest 0.50).

- One photo won outside the noise in all four model-run cells, on every persona.
- The other led on the laptop and lost on the phone, and one run put its lead inside the noise, so
  it did not win.

Using either photo needs the client's leave. That question is a decision in Company OS.

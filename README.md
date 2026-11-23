# RedirectedStepper — project page

Project page for **RedirectedStepper: Exploring Walking-In-Place Locomotion in VR Using a Mini Stepper for Ascents** (CHI 2025).
Paper: https://doi.org/10.1145/3706598.3713313

Plain static site: one `index.html`, one stylesheet, one script. No build step, no dependencies.

```
index.html
assets/
  css/style.css      design tokens (light-blue palette) at the top
  js/main.js         scroll reveal, video autoplay, copy BibTeX, step animation
  img/               posters, device photo, SnowRun stills, paper thumbnail, og-image, favicon
  video/             short muted loops (hero, fpv, device, stairs, spiral, slope, snowrun)
                     + redirectedstepper-full.mp4 (the narrated 4-min video, ~46 MB)
.nojekyll
```

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Open it through a server rather than as a `file://` path, because some browsers block local video autoplay.

## Publish on GitHub Pages

```bash
git init && git add . && git commit -m "Project page"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

Then go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch** and **Branch: `main` / root**, and save.
The site is published at `https://<username>.github.io/<repo>/`.

## After the first deploy

- **Social preview**: in `index.html`, change the `og:image` and `twitter:image` values to absolute URLs
  (`https://<username>.github.io/<repo>/assets/img/og-image.jpg`). Link previews need absolute URLs.
- **YouTube instead of the local video**: put the video ID in `data-youtube=""` on the `.full-video` figure.
  The page then embeds YouTube, and you can delete `assets/video/redirectedstepper-full.mp4` to keep the repo small.

## Where the media came from

All clips and images come from the paper and its accompanying video:

| File | Source |
| --- | --- |
| `hero.mp4` | video 0:12–0:22 (third-person climb) |
| `fpv.mp4` | video 0:02–0:11 (first-person climb) |
| `device.mp4` | video 0:43–0:55 (pedal close-up) |
| `stairs.mp4`, `spiral.mp4`, `slope.mp4` | video, RedirectedStepper condition of each study |
| `snowrun.mp4` | video 3:06–3:20 |
| `device.webp` | Figure 2 |
| `snowrun-*.jpg` | Figure 14 b–d |

Loops are cropped to 16:9 to remove the burned-in subtitles. They are encoded as H.264 at 1280×720, muted, with `faststart`.

The "One step, redirected" animation is an illustration, not a recording. It follows the paper's idea: the pedal is hinged at the front, and the virtual foot lifts first, then reaches forward (curve exponent 3), landing on the next stair when the pedal reaches its top.

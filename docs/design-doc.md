# Palette Picker – Design Doc

Oct 10, 2026 · @Sammi · Status: Draft v0.1

## 1. Overview

Palette Picker is a web app for artists. You drop in an image with colors you like, and it pulls out a palette of the most common colors in it. It makes sure the colors are clearly different from each other, and it lets you limit the palette to a chosen value (light/dark) range. The palette can then be copied or exported straight into Clip Studio Paint.

**Primary user:** a digital artist working mainly in Clip Studio Paint on a PC, who also wants to build palettes on a phone when away from the desk.

### Goals

- Turn any reference image into a usable palette in a few seconds.
- Let the user control palette size, how varied the colors are, and the value range.
- Get the palette into Clip Studio Paint with as little friction as possible.
- Work well on both desktop and phone.

### Non-goals (for now)

- Traditional paint-mixing hints (parked for a later version).
- Accounts, cloud sync or sharing palettes with others.
- Editing or painting on the image itself.

## 2. Use cases

1. **At the desk:** Find a reference image online, paste it into the app, tweak the sliders until the palette feels right, export it into Clip Studio Paint and start painting.
2. **On the go:** See a sunset or a nice storefront, take a photo, make a palette on the phone and save it to use later at the PC.
3. **Value control:** Pull only the midtones and shadows out of an image to plan a moody, low-key piece.
4. **Value check:** Use the out-of-range overlay or value study view to understand the light and dark structure of a reference.

## 3. Core features (MVP)

### 3.1 Image input

- Drag and drop an image file, or click to browse.
- Paste from the clipboard (Ctrl+V) on desktop.
- On phone: pick from the photo library or take a photo with the camera.
- Supported formats: JPEG, PNG, WebP, GIF (first frame only), and HEIC where the browser supports it. Full-size phone photos (up to about 50 megapixels) must load; they are scaled down right away for processing.
- Images are processed entirely on the device; nothing is uploaded to a server.

### 3.2 Palette size

- A control to choose how many colors to extract, from 2 to 16 (default 6).
- The palette updates live as the number changes.

### 3.3 Distinct colors

The app should never return five nearly identical colors. Two sliders control this:

| Control | What it does | Default |
| --- | --- | --- |
| **Variety** | Balances *most frequent* colors against *most distinct* colors. Low = closest to what the image actually contains most; high = colors pushed further apart. | Middle |
| **Hue weight** | How much differences in hue count compared to value and saturation. Low = hue barely matters, so colors spread out mostly in value and saturation; high = hue matters as much as the others. | Below middle (hue counts, but less) |

These let the user find the sweet spot for each image.

### 3.4 Value range slider

- A single horizontal slider with **two handles**: minimum value and maximum value on a perceptual lightness scale (0 = black, 100 = white).
- The track shows a dark-to-light gradient so it is easy to read.
- Only colors whose value falls inside the range can be picked for the palette.
- Optional: a small histogram on the track showing how much of the image sits at each value, so the user can see where the image's darks and lights are.

### 3.5 Out-of-range overlay

- A toggle that marks the parts of the image outside the chosen value range.
- Default style: a semi-transparent colored tint over out-of-range areas, with one color for areas darker than the minimum and another for areas lighter than the maximum (e.g. blue and magenta).
- Tint colors and opacity are adjustable, so the tint stays clear on any image. Dim/desaturate is available as an alternative setting.

### 3.6 Swatch display

- A clean row (desktop) or grid (phone) of large swatches, each showing its hex code.
- Designed to be screenshot-friendly: a solid background with no clutter, so a screen grab can be pasted straight into Clip Studio Paint.

### 3.7 Click to copy

- Click a swatch to copy its hex code; a small "Copied" confirmation appears.
- A "Copy all" button copies the full list of hex codes.
- Copied format: hex only (e.g. #FFBE98), which pastes straight into Clip Studio Paint's color settings window.

### 3.8 Export to Clip Studio Paint

Clip Studio Paint's Color Set palette can import its own color set format (.cls) and Photoshop swatch files (.aco). On desktop and iPad, a color set file can also be dragged straight onto the Color Set palette.

- **Download .aco:** the main export path, since it is a documented format and Clip Studio Paint imports it directly.
- **Download .cls:** a stretch goal. The format isn't officially documented, but others have worked out its structure, so it should be possible.
- **Download PNG swatch card:** an image of the palette with hex codes, for pasting in as a reference layer.

## 4. Additional features (v1.1 and later)

| Feature | Description | Priority |
| --- | --- | --- |
| Lock and re-roll | Lock swatches you like; regenerate the rest. | High |
| Eyedropper | Click/tap anywhere on the image to add that exact color to the palette. | High |
| Show where a color comes from | Selecting a swatch highlights the areas of the image that use it. | High |
| Proportion bar | A strip showing how much of the image each color covers, to help decide which color should dominate. | Medium |
| Sort palette | Sort by value, hue, saturation or frequency. | Medium |
| Saved palette library | Save palettes with a name, tags and a thumbnail of the source image. Stored on the device. | Medium |
| Value study view | Show the image in grayscale, or simplified into 2–5 value bands (notan). | Medium |
| Harmony suggestions | Suggest a complementary accent, or warmer and cooler versions of the palette. | Low |
| Manual swatch editing | Nudge a swatch's hue, saturation or value by hand. | Low |

### Parked

- **Paint-mixing hints** (e.g. "close to burnt sienna + white"). Not useful for a digital workflow right now; revisit later.

## 5. Layout

### Desktop

- **Left / center:** the image, as large as possible, with the overlay toggle above it.
- **Right panel:** palette size, variety, hue weight, value range slider, then the swatches and export buttons.

### Phone

- **Top:** the image.
- **Below:** swatches, then the controls in a collapsible panel.
- Slider handles at least 44 px wide so they are easy to drag with a finger.
- Installable to the home screen and usable offline (progressive web app).

## 6. How it works

1. **Prepare the image.** Scale it down (for example to about 300 px on the longest side) so processing is fast; this barely changes the results.
2. **Convert colors to a perceptual color space.** OKLab/OKLCH is a good choice: it measures lightness, saturation and hue in a way that matches how people see color, so "value" behaves like an artist expects (a saturated yellow reads lighter than a saturated blue).
3. **Apply the value range.** Ignore every pixel whose lightness is outside the min/max.
4. **Group similar colors.** Cluster the remaining pixels into candidate colors (e.g. k-means or median cut), keeping a count of how many pixels each one covers.
5. **Pick distinct colors.** Choose the final palette one color at a time: each pick balances how common it is against how far it is from the colors already chosen. The variety slider sets that balance; the hue weight slider scales the hue part of the distance.
6. **Display and update live** whenever a slider moves.

## 7. Technical approach

- **Platform:** a web app that works in any modern browser on PC and phone; installable as a progressive web app.
- **Processing:** all on the device in the browser (canvas for pixels, a Web Worker so the interface stays smooth).
- **Storage:** saved palettes stored in the browser on that device. Palettes move between PC and phone by exporting a palette file on one device and importing it on the other; there is no sync.
- **No backend** needed for the MVP, which keeps it simple and private.

## 8. Open questions

1. **Value scale:** Decided: the slider uses perceptual lightness (OKLab L), not HSV "V". Saturated colors will read closer to how they look, though numbers may differ from Clip Studio Paint's color picker.
2. **Copy format:** Decided: hex only. It pastes straight into the hex field in Clip Studio Paint's color settings window.
3. **Palette size limit:** Decided: 16 colors is the maximum.
4. **Phone to PC:** Decided: export a palette file on one device and import it on the other. No sync between devices.
5. **Overlay style:** Decided: a colored tint, kept clearly visible (see 3.5).
6. **Image limits:** Decided: full-size phone photos must work; nothing larger is needed. GIFs use the first frame only, since that comes free; full animated GIF support is out.

## 9. Milestones

| Milestone | Scope |
| --- | --- |
| **M1 – Prototype** | Image input, palette size, variety and hue weight sliders, value range slider, swatches with click-to-copy. Desktop only. |
| **M2 – MVP** | Out-of-range overlay, .aco and PNG export, phone layout, installable app. |
| **M3 – v1.1** | Lock and re-roll, eyedropper, show-where highlight, proportion bar, sorting. |
| **M4 – v1.2** | Saved library with palette file export/import, value study view, .cls export, harmony suggestions. |
| **Later** | Paint-mixing hints. |

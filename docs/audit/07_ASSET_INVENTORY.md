# 07 — Asset Inventory

Status: **Complete**

## Inventory requirements [VERIFIED REPOSITORY via find images/]

| Path | Type | Size | Used where | Origin | License / permission | Real / AI / unknown | Approval status | Action |
|---|---|---:|---|---|---|---|---|---|
| `assets/song.mp3` | Audio | 3.2MB | Background Player | James Arthur | Copyrighted | Real | **License unverified** | **Not approved for final production until authorization is documented** |
| `images/cami_editorial.png` | Image | 1.2MB | Story Section | Camila | Private | Real | Approved | Compress |
| `images/cami_sunglasses.png` | Image | 1.1MB | Story Section (Legacy) | Camila | Private | Real | Rejected | Remove |
| `images/felipe_editorial.png` | Image | 980KB | Story Section | Felipe | Private | Real | Approved | Compress |
| `images/arboleda_main.jpg` | Image | 816KB | Arboleda Gallery | Arboleda | Public | Real | Approved | Compress |
| `images/arboleda_coctel.jpg` | Image | 330KB | Arboleda Gallery | Arboleda | Public | Real | Approved | Compress |
| `images/arboleda_jardin.jpg` | Image | 560KB | Arboleda Gallery (Legacy) | Church | Public | Real | Rejected | Remove |
| `images/iglesia_bw.jpg` | Image | 635KB | Iglesia Section | Santuario | Public | Real | Approved | Compress |
| `images/religious_wedding.jpg` | Image | 335KB | Iglesia Section (Alternative) | Public | Public | Real | Approved | Compress |
| `images/envelope_stamp.png` | Image | 150KB | Favicon / Stamp | Brand Asset | Private | Real | Approved | Retain |
| `images/envelope_liner.png` | Image | 280KB | Envelope background | Brand Asset | Private | Real | Approved | Retain |
| `images/guest_example_1.jpg` to `16.jpg` | Image | ~300KB each | Paparazzi Gallery placeholders | Placeholders | Public | Real | Approved | Retain |
| `images/instagram_19.jpg` to `33.jpg` | Image | ~250KB each | Instagram grid placeholders | Placeholders | Public | Real | Approved | Retain |
| `images/new_story_1.jpg` to `3.jpg` | Image | ~400KB each | Story Section alternative slides | Placeholders | Public | Real | Approved | Retain |

## Performance output

- Oversized photographs: `cami_editorial.png` (1.2MB) and `iglesia_bw.jpg` (635KB) should be converted to modern WebP format and compressed.
- Lazy-loading should be enforced on all images below the fold to save bandwidth on mobile.

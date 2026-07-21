# 07 — Asset Inventory

Status: **Complete**

## Inventory requirements

| Path | Type | Size | Used where | Origin | License / permission | Real / AI / unknown | Approval status | Action |
|---|---|---:|---|---|---|---|---|---|
| `assets/song.mp3` | Audio | 3.2MB | Background Player | James Arthur | Copyrighted (Fair Use) | Real | Approved | Retain |
| `images/cami_editorial.png` | Image | 1.2MB | Story Section | Camila | Private | Real | Approved | Compress |
| `images/arboleda_main.jpg` | Image | 816KB | Arboleda Gallery | Arboleda | Public | Real | Approved | Compress |
| `images/arboleda_coctel.jpg` | Image | 330KB | Arboleda Gallery | Arboleda | Public | Real | Approved | Compress |
| `images/iglesia_bw.jpg` | Image | 635KB | Iglesia Section | Santuario | Public | Real | Approved | Compress |
| `images/envelope_stamp.png` | Image | 150KB | Favicon / Stamp | Brand Asset | Private | Real | Approved | Retain |

## Performance output

- Oversized photographs: `cami_editorial.png` (1.2MB) and `iglesia_bw.jpg` (635KB) should be converted to modern WebP format and compressed.
- Lazy-loading should be enforced on all images below the fold to save bandwidth on mobile.

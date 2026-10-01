Rebuild the profile banner: `cd build && npm i && node build.mjs`, which writes `../assets/banner-dark.svg` and `../assets/banner-light.svg`.
Fonts (Mona Sans, Geist Mono; both SIL OFL 1.1) are downloaded from pinned release tags into `build/fonts/` on first run and are not committed; all text is outlined to paths.
The ccdeck marks in `kit/` are unchanged brand-kit files (checksums in `kit/kit.json`); edit layout and copy in `build.mjs`, never the marks.

export type ResponsiveImageSet = {
  webpSrcSet: string;
  jpgSrcSet: string;
  fallbackSrc: string;
  lightboxSrc: string;
};

const RESPONSIVE_WIDTHS = [768, 1440, 2200] as const;
export function buildResponsiveImageSet(imagePath: string): ResponsiveImageSet | null {
  const match = imagePath.match(/^\/uploads\/(.+)-orig\.(?:jpe?g|png|webp|avif)$/i);
  if (!match) {
    return null;
  }

  const baseName = match[1];

  const toSrcSet = (ext: "webp" | "jpg") => {
    return RESPONSIVE_WIDTHS.map(
      (width) => `/uploads/${baseName}-w${width}.${ext} ${width}w`
    ).join(", ");
  };

  return {
    webpSrcSet: toSrcSet("webp"),
    jpgSrcSet: toSrcSet("jpg"),
    // The original upload always exists, so keep this as the hard fallback.
    fallbackSrc: `/uploads/${baseName}-orig.jpg`,
    lightboxSrc: `/uploads/${baseName}-orig.jpg`,
  };
}

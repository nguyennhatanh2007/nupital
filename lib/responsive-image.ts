export type ResponsiveImageSet = {
  avifSrcSet: string;
  webpSrcSet: string;
  jpgSrcSet: string;
  fallbackSrc: string;
  lightboxSrc: string;
};

const RESPONSIVE_WIDTHS = [480, 768, 1080, 1440] as const;
const LIGHTBOX_WIDTH = 2200;

export function buildResponsiveImageSet(imagePath: string): ResponsiveImageSet | null {
  const match = imagePath.match(/^\/uploads\/(.+)-orig\.(?:jpe?g|png|webp|avif)$/i);
  if (!match) {
    return null;
  }

  const baseName = match[1];

  const toSrcSet = (ext: "avif" | "webp" | "jpg") => {
    const variants = RESPONSIVE_WIDTHS.map(
      (width) => `/uploads/${baseName}-w${width}.${ext} ${width}w`
    );
    variants.push(`/uploads/${baseName}-w${LIGHTBOX_WIDTH}.${ext} ${LIGHTBOX_WIDTH}w`);
    return variants.join(", ");
  };

  return {
    avifSrcSet: toSrcSet("avif"),
    webpSrcSet: toSrcSet("webp"),
    jpgSrcSet: toSrcSet("jpg"),
    fallbackSrc: `/uploads/${baseName}-w1080.jpg`,
    lightboxSrc: `/uploads/${baseName}-w${LIGHTBOX_WIDTH}.jpg`,
  };
}

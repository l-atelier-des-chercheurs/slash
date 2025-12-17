// Helper function to build style attribute from width/height
export function buildStyleAttribute(width, height) {
  if (!width && !height) return "";
  const _width = width ? `width: ${width};` : "";
  const _height = height ? `height: ${height};` : "";
  return ` style="${_width}${_height}"`;
}

/**
 * Renders media (image, video, audio) as HTML
 * @param {Object} params - Rendering parameters
 * @param {Object} params.media - Media object (optional, will be fetched if not provided)
 * @param {string} params.meta_src - Source path/URL of the media
 * @param {Array} params.source_medias - Array of source media objects
 * @param {string} params.alt - Alt text/caption
 * @param {string} params.width - Width (supports CSS units like "1cm", "100px", etc.)
 * @param {string} params.height - Height (supports CSS units)
 * @param {string} params.title - Title attribute (supports special formats like "=full-page")
 * @param {Object} params.context - Context object with helper functions
 * @param {string} params.context.view_mode - View mode ("book" or "html")
 * @param {Function} params.context.getMediaSrc - Function to get media from source
 * @param {Function} params.context.makeMediaFileURL - Function to create media file URLs
 * @param {Function} params.context.makeQREmbedForQR - Function to create QR code embeds
 * @returns {Object} Object with `html` and `is_qr_code` properties
 */
export function renderMedia({
  media,
  meta_src,
  source_medias,
  alt,
  width,
  height,
  title,
  context = {},
}) {
  const {
    view_mode = "html",
    getMediaSrc = () => null,
    makeMediaFileURL = ({ $path, $media_filename }) => `/${$media_filename}`,
    makeQREmbedForQR = () => "",
  } = context;

  let media_html = "";
  let is_qr_code = false;
  let custom_classes = ["media"];

  // Check if we'll have a caption (to avoid duplicating in alt attribute)
  const has_caption = alt && alt.trim() !== "";

  // Handle special title attributes for styling and dimensions
  if (title?.startsWith("=")) {
    if (title.startsWith("=full-page")) {
      if (view_mode === "book") {
        custom_classes.push("_isFullPage");
        if (title.startsWith("=full-page-cover")) {
          custom_classes.push("_isFullPageCover");
        }
      }
    } else {
      [width, height] = title
        .slice(1)
        .split("x")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }

  // Handle external URLs (http/https)
  if (meta_src && meta_src.startsWith("http")) {
    const style_attr = buildStyleAttribute(width, height);

    // Detect media type from URL extension
    let media_type = "image"; // default
    const lowerSrc = meta_src.toLowerCase();
    if (
      lowerSrc.includes(".mp4") ||
      lowerSrc.includes(".webm") ||
      lowerSrc.includes(".ogg") ||
      lowerSrc.includes("video")
    ) {
      media_type = "video";
      custom_classes.push("media-video");
    } else if (
      lowerSrc.includes(".mp3") ||
      lowerSrc.includes(".wav") ||
      lowerSrc.includes(".ogg") ||
      lowerSrc.includes("audio")
    ) {
      media_type = "audio";
      custom_classes.push("media-audio");
    } else {
      custom_classes.push("media-image");
    }

    if (media_type === "video") {
      media_html = `<video src="${meta_src}" controls></video>`;
    } else if (media_type === "audio") {
      media_html = `<audio src="${meta_src}" controls></audio>`;
    } else {
      // For images, style goes on the img tag for external URLs
      // Don't add alt if we're also adding a figcaption with the same text
      const alt_attr = has_caption ? "" : alt ? ` alt="${alt}"` : "";
      media_html = `<img src="${meta_src}"${alt_attr}${style_attr} />`;
    }
  } else {
    // Handle local media
    if (!media) {
      media = getMediaSrc(meta_src, source_medias);
    }

    if (!media)
      return {
        html: `<figure class="${custom_classes.join(
          " "
        )}"><i>Media not found</i></figure>`,
        is_qr_code: false,
      };

    const src = makeMediaFileURL({
      $path: media.$path,
      $media_filename: media.$media_filename,
    });

    if (media.$type === "text") {
      media_html = media.$content;
    } else if (media.$type === "image") {
      custom_classes.push("media-image");
      // Don't add alt if we're also adding a figcaption with the same text
      const alt_attr = has_caption ? "" : alt ? ` alt="${alt}"` : "";
      media_html = `<img src="${src}"${alt_attr} />`;
    } else {
      if (view_mode === "book") {
        is_qr_code = true;
        custom_classes.push("_isqrcode");
        media_html = makeQREmbedForQR({
          alt,
          width,
          height,
          media,
        });
      } else {
        if (media.$type === "video") {
          custom_classes.push("media-video");
          media_html = `<video src="${src}" controls></video>`;
        } else if (media.$type === "audio") {
          custom_classes.push("media-audio");
          media_html = `<audio src="${src}" controls></audio>`;
        }
      }
    }
  }

  // Add caption if alt text is provided
  // Note: If alt is provided, we add it as figcaption and don't duplicate it in the alt attribute
  if (has_caption) {
    media_html += `\n<figcaption class="mediaCaption"><span>${alt}</span></figcaption>`;
  }

  // For external URLs, style is already on the img tag, so only add to figure for local media
  const style_attr =
    meta_src && meta_src.startsWith("http")
      ? ""
      : buildStyleAttribute(width, height);

  const html = `<figure class="${custom_classes.join(
    " "
  )}"${style_attr}>${media_html}</figure>`;

  return { html, is_qr_code };
}

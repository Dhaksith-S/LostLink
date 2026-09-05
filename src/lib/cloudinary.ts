const UPLOAD_SEGMENT = "/upload/";
/** Same list-card transformation the Android app uses (w_200,q_auto). */
const THUMBNAIL = "w_200,h_200,c_fill,q_auto,f_auto";
const DETAIL = "w_1200,q_auto,f_auto";

/**
 * Inserts a Cloudinary transformation after the "/upload/" segment, mirroring
 * CloudinaryUrls.kt. Non-Cloudinary URLs are returned untouched.
 */
export function withTransformation(url: string, transformation: string) {
  const index = url.indexOf(UPLOAD_SEGMENT);
  if (index === -1) return url;
  const insertAt = index + UPLOAD_SEGMENT.length;
  if (url.startsWith(transformation, insertAt)) return url;
  return `${url.slice(0, insertAt)}${transformation}/${url.slice(insertAt)}`;
}

export const thumbnailUrl = (url: string) => withTransformation(url, THUMBNAIL);
export const detailUrl = (url: string) => withTransformation(url, DETAIL);

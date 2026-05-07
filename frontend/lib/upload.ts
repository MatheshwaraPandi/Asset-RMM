export const ASSET_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const ASSET_IMAGE_MAX_SIZE_MB = ASSET_IMAGE_MAX_SIZE_BYTES / (1024 * 1024);
export const ASSET_IMAGE_ACCEPT = "image/png,.png,image/jpeg,.jpg,.jpeg";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);
const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];

export function validateAssetImageFile(file: File) {
  const fileName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_IMAGE_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension)
  );

  if (!ALLOWED_IMAGE_TYPES.has(file.type) && !hasAllowedExtension) {
    return "Only JPG and PNG image files are allowed.";
  }

  if (file.size > ASSET_IMAGE_MAX_SIZE_BYTES) {
    return `Each image must be ${ASSET_IMAGE_MAX_SIZE_MB} MB or smaller.`;
  }

  return null;
}

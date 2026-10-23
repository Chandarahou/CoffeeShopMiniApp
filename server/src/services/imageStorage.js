import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config.js';
import { HttpError } from '../lib/errors.js';

// Image storage on Cloudflare R2. Staff upload photos on the admin's Images page, copy the
// resulting URL, and paste it into a product by hand. R2 speaks the S3 protocol, so the
// official AWS S3 client is used with R2's endpoint. Images are served to customers straight
// from the bucket's public address (R2_PUBLIC_URL); our server only handles the upload.

let client = null;

const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function initImageStorage() {
  const { accountId, accessKeyId, secretAccessKey, bucket, publicUrl, endpoint } = config.r2;

  if (!bucket) {
    console.warn('[r2] R2_BUCKET not set — image uploads disabled (image URLs can still be pasted)');
    return;
  }

  const missing = [];
  if (!accountId && !endpoint) {
    missing.push('R2_ACCOUNT_ID');
  }
  if (!accessKeyId) {
    missing.push('R2_ACCESS_KEY_ID');
  }
  if (!secretAccessKey) {
    missing.push('R2_SECRET_ACCESS_KEY');
  }
  if (!publicUrl) {
    missing.push('R2_PUBLIC_URL');
  } else if (!publicUrl.startsWith('https://') && !endpoint) {
    missing.push('R2_PUBLIC_URL (must start with https://)');
  }
  if (missing.length > 0) {
    console.error(`[r2] missing ${missing.join(', ')} — image uploads disabled`);
    return;
  }

  let serviceEndpoint = endpoint;
  if (!serviceEndpoint) {
    serviceEndpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  }

  client = new S3Client({
    region: 'auto', // R2 has no regions; the SDK still requires a value
    endpoint: serviceEndpoint,
    forcePathStyle: true, // bucket name in the path, which R2 supports
    credentials: { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey },
    // Since @aws-sdk/client-s3 3.729.0 the client adds checksums by default, which R2 rejects.
    // Only send them when an operation requires it (Cloudflare's recommended setting).
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  console.log(`[r2] image uploads enabled (bucket "${bucket}")`);
}

export function imageUploadsEnabled() {
  return client !== null;
}

/**
 * Works out the real image type from the file's first bytes, ignoring whatever the browser
 * claimed. Only JPEG, PNG and WebP are accepted; anything else (including SVG, which can
 * contain scripts) returns null.
 */
export function detectImageType(buffer) {
  if (buffer.length < 12) {
    return null;
  }
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) {
    return 'image/jpeg';
  }
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (isPng) {
    return 'image/png';
  }
  const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (isWebp) {
    return 'image/webp';
  }
  return null;
}

/** Stores an image in R2 and returns its public URL. */
export async function uploadImage(buffer) {
  if (!client) {
    throw new HttpError(503, 'Image uploads are not set up');
  }

  const contentType = detectImageType(buffer);
  if (contentType === null) {
    throw new HttpError(415, 'Please upload a JPEG, PNG or WebP image');
  }

  // A fresh random name for every upload, so the file never changes once published
  // and can be cached by browsers for a long time
  const key = `images/${randomUUID()}.${IMAGE_TYPES[contentType]}`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.r2.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  } catch (error) {
    console.error('[r2] upload failed:', error.name, error.message);
    throw new HttpError(502, 'The image could not be stored. Please try again.');
  }

  return `${config.r2.publicUrl}/${key}`;
}

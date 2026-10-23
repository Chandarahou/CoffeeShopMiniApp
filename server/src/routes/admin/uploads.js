import express, { Router } from 'express';
import { config } from '../../config.js';
import { HttpError } from '../../lib/errors.js';
import { imageUploadsEnabled, uploadImage } from '../../services/imageStorage.js';

export const adminUploadsRouter = Router();

// Lets the Images page know whether uploading is set up, and the size limit
adminUploadsRouter.get('/status', (_req, res) => {
  res.json({ imageUploads: imageUploadsEnabled(), maxImageBytes: config.r2.maxImageBytes });
});

// The admin sends the image file itself as the request body (not as a form), with the
// image's Content-Type. Anything over the size limit is refused before it is read in full.
const readImageBody = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: config.r2.maxImageBytes,
});

adminUploadsRouter.post('/image', readImageBody, async (req, res) => {
  if (!imageUploadsEnabled()) {
    throw new HttpError(503, 'Image uploads are not set up');
  }
  // express.raw only fills in a Buffer for the image types listed above
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new HttpError(415, 'Please upload a JPEG, PNG or WebP image');
  }

  const url = await uploadImage(req.body);
  res.status(201).json({ url: url });
});

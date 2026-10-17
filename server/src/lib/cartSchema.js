import { z } from 'zod';

/**
 * Cart lines as sent by the Mini App and the admin's "new order" page: product IDs,
 * quantities and chosen option IDs only. Prices are always calculated on the server.
 */
export const itemsSchema = z
  .array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1).max(50),
      selections: z.record(z.string(), z.union([z.string(), z.array(z.string()).max(20)])).optional(),
    }),
  )
  .min(1)
  .max(50);

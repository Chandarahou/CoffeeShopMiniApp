// All money is stored and calculated as integer cents to avoid float rounding errors.
export const formatCents = (cents) => `$${(cents / 100).toFixed(2)}`;

import { z } from "zod/mini";
import { createUrlState } from "./url-state";

export const urlState = createUrlState(
  z.object({
    view: z._default(z.string(), "all"),
    collection: z._default(z.nullable(z.string()), null),
    tags: z._default(z.array(z.string()), []),
    q: z._default(z.string(), ""),
    sort: z._default(z.string(), "newest"),
    page: z._default(z.number(), 1),
  }),
);

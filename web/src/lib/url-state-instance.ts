import { z } from "zod/mini";
import { createUrlState } from "./url-state";

// `tag` = single active filter, `tags` = multi-select list — intentionally separate params.
export const urlState = createUrlState(
  z.object({
    page: z._default(z.number(), 1),
    tag: z._default(z.nullable(z.string()), null),
    q: z._default(z.string(), ""),
    tags: z._default(z.array(z.string()), []),
  }),
);

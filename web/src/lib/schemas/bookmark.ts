import { z } from "zod/mini";

export const bookmarkSchema = z.object({
  url: z.url("Please enter a valid URL"),
  title: z
    .string()
    .check(
      z.refine((v) => v.length <= 200, "Title must be 200 characters or less"),
    ),
  description: z
    .string()
    .check(
      z.refine(
        (v) => v.length <= 500,
        "Description must be 500 characters or less",
      ),
    ),
  notes: z
    .string()
    .check(
      z.refine(
        (v) => v.length <= 2000,
        "Notes must be 2000 characters or less",
      ),
    ),
  collectionId: z.string(),
  tags: z
    .array(
      z
        .string()
        .check(z.refine((v) => v.length >= 1))
        .check(
          z.refine((v) => v.length <= 50, "Tag must be 50 characters or less"),
        ),
    )
    .check(z.refine((v) => v.length <= 20, "Maximum 20 tags")),
  favorite: z.boolean(),
});

export type BookmarkFormValues = z.infer<typeof bookmarkSchema>;

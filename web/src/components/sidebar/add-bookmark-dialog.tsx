import { useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/mini";
import { requester } from "@/lib/requester";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea, FormSelect } from "@/components/ui/form-input";
import { FormTagInput } from "@/components/ui/tag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusIcon } from "@/components/ui/icons";
import { collectionsQueryOptions } from "@/lib/queries/collections";
import { useCreateBookmark } from "@/lib/queries/bookmarks";
import { ChevronRight, Loader2 } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tagsQueryOptions } from "@/lib/queries/tags";

const bookmarkSchema = z.object({
  url: z.url("Please enter a valid URL"),
  title: z
    .string()
    .check(z.refine((v) => v.length <= 200, "Title must be 200 characters or less")),
  description: z
    .string()
    .check(z.refine((v) => v.length <= 500, "Description must be 500 characters or less")),
  notes: z
    .string()
    .check(z.refine((v) => v.length <= 2000, "Notes must be 2000 characters or less")),
  collectionId: z.string(),
  tags: z
    .array(
      z
        .string()
        .check(z.refine((v) => v.length >= 1))
        .check(z.refine((v) => v.length <= 50, "Tag must be 50 characters or less")),
    )
    .check(z.refine((v) => v.length <= 20, "Maximum 20 tags")),
  favorite: z.boolean(),
});

type BookmarkFormValues = z.infer<typeof bookmarkSchema>;

export function AddBookmarkDialog() {
  const { data: tags } = useSuspenseQuery(tagsQueryOptions())
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions())
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const createBookmark = useCreateBookmark();
  const fetchingMetaRef = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<BookmarkFormValues>({
    resolver: zodResolver(bookmarkSchema),
    defaultValues: {
      url: "",
      collectionId: "",
      title: "",
      description: "",
      notes: "",
      tags: [],
      favorite: false,
    },
  });

  async function handleUrlBlur(url: string) {
    try {
      new URL(url);
    } catch {
      return;
    }
    if (getValues("title")) return;
    if (fetchingMetaRef.current) return;

    fetchingMetaRef.current = true;
    setFetchingMeta(true);
    try {
      const meta = await requester<{ title?: string; description?: string }>("/api/v1/metadata", {
        params: { url },
      });
      if (meta.title && !getValues("title")) {
        setValue("title", meta.title);
      }
      if (meta.description && !getValues("description")) {
        setValue("description", meta.description);
      }
    } catch {
      // silently ignore — user can still fill manually
    } finally {
      fetchingMetaRef.current = false;
      setFetchingMeta(false);
    }
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      setNotesOpen(false);
    }
    setOpen(nextOpen);
  }

  function onSubmit(value: BookmarkFormValues) {
    createBookmark.mutate(
      {
        url: value.url,
        title: value.title,
        description: value.description,
        notes: value.notes,
        tags: value.tags.join(" "),
        favorite: value.favorite,
        collection_id: value.collectionId ? Number(value.collectionId) : null,
      },
      {
        onSuccess: () => {
          reset();
          setNotesOpen(false);
          setOpen(false);
        },
      },
    );
  }

  const urlRegistration = register("url");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 text-xs text-muted2/40 transition-colors hover:text-muted2"
        >
          <PlusIcon className="h-3 w-3" />
          Add bookmark
        </button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="bg-surface border-border-soft sm:max-w-md max-w-[calc(100vw-32px)] p-0 overflow-hidden shadow-none gap-0 min-w-[550px]">
        <div className="px-6 pt-8 pb-6">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">Add bookmark</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Save a link to your collection.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-4 flex flex-col gap-6">
            <FormInput
              label="URL"
              required
              id="url"
              placeholder="https://brandur.org/interfaces"
              error={errors.url?.message}
              rightIcon={fetchingMeta ? <Loader2 className="animate-spin text-muted2/40" /> : undefined}
              autoFocus
              {...urlRegistration}
              onBlur={(e) => {
                urlRegistration.onBlur(e);
                handleUrlBlur(e.currentTarget.value);
              }}
            />

            <FormInput
              label="Title"
              id="title"
              placeholder="In Praise of Interfaces"
              {...register("title")}
            />

            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <FormTextarea
                  label="Description"
                  id="description"
                  name={field.name}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  placeholder="Why good APIs feel invisible"
                  maxLength={500}
                  currentLength={field.value.length}
                />
              )}
            />

            <FormSelect
              label="Collection"
              id="collectionId"
              hint="Manage collections from the sidebar."
              options={collections.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
              {...register("collectionId")}
            />

            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <FormTagInput
                  className="h-auto min-h-8"
                  label="Tags"
                  id="tags"
                  name={field.name}
                  allTags={tags.map(t => t.name)}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(tags) => field.onChange(tags)}
                  placeholder="#engineering, #api-design"
                  hint={<>Enter any number of tags separated by space and <span className="text-muted-foreground font-medium">without</span> the hash (#). If a tag does not exist it will be automatically created.</>}
                />
              )}
            />

            <Controller
              control={control}
              name="notes"
              render={({ field }) => (
                <div>
                  <button
                    type="button"
                    className="text-sm font-medium text-foreground/80 cursor-pointer select-none flex items-center gap-0.5"
                    onClick={() => setNotesOpen((o) => !o)}
                  >
                    <ChevronRight className="size-4 text-muted2/50 transition-transform duration-200 data-[open]:rotate-90" data-open={notesOpen || undefined} />
                    Notes
                  </button>
                  {notesOpen && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <FormTextarea
                        hint="Supports Markdown"
                        id="notes"
                        name={field.name}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        placeholder="Revisit the section on composability"
                        maxLength={2000}
                        currentLength={field.value.length}
                      />
                    </div>
                  )}
                </div>
              )}
            />

            <div className="flex items-start gap-6">
              <Controller
                control={control}
                name="favorite"
                render={({ field }) => (
                  <Checkbox
                    label="Mark as favorite"
                    hint="Favorite bookmarks are pinned for quick access."
                    className="font-medium"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                )}
              />
            </div>
          </div>
          <div className="p-6 pb-7">
            <Button type="submit" className="w-full h-9" disabled={createBookmark.isPending}>
              {createBookmark.isPending ? <Loader2 className="animate-spin size-4" /> : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  FormInput,
  FormTextarea,
  FormSelect,
} from "@/components/ui/form-input";
import { FormTagInput } from "@/components/ui/tag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateBookmark } from "@/lib/queries/bookmarks";
import { collectionsQueryOptions } from "@/lib/queries/collections";
import { tagsQueryOptions } from "@/lib/queries/tags";
import {
  bookmarkSchema,
  type BookmarkFormValues,
} from "@/lib/schemas/bookmark";
import type { Bookmark } from "@/lib/types";
import { getHostname } from "@/lib/types";

export function BookmarkEditForm({
  bookmark,
  onCancel,
  onSaved,
}: {
  bookmark: Bookmark;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());
  const { data: tags } = useSuspenseQuery(tagsQueryOptions());
  const updateBookmark = useUpdateBookmark();
  const [notesOpen, setNotesOpen] = useState(Boolean(bookmark.notes));

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BookmarkFormValues>({
    resolver: zodResolver(bookmarkSchema),
    defaultValues: {
      url: bookmark.url,
      title: bookmark.title,
      description: bookmark.description,
      notes: bookmark.notes,
      collectionId: bookmark.collection_id
        ? String(bookmark.collection_id)
        : "",
      tags: bookmark.tags,
      favorite: bookmark.favorite,
    },
  });

  function onSubmit(value: BookmarkFormValues) {
    updateBookmark.mutate(
      {
        id: bookmark.id,
        url: value.url,
        title: value.title,
        description: value.description,
        notes: value.notes,
        tags: value.tags.join(" "),
        favorite: value.favorite,
        collection_id: value.collectionId ? Number(value.collectionId) : null,
      },
      { onSuccess: () => onSaved() },
    );
  }

  return (
    <div className="bg-surface animate-in fade-in flex max-h-[70vh] flex-col overflow-y-auto px-6 pt-9 pb-9 duration-200">
      {/* Preserved bookmark identity */}
      <div className="flex items-start gap-3">
        <img
          src={`/api/v1/favicons/${getHostname(bookmark.url)}`}
          alt=""
          className="mt-px h-7 w-7 shrink-0 rounded-sm"
        />
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-foreground text-[17px] leading-[1.5] font-semibold">
            {bookmark.title}
          </DialogTitle>
          <DialogDescription className="text-muted2 mt-1 block truncate font-mono text-[11px]">
            {getHostname(bookmark.url)}
          </DialogDescription>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-9 flex flex-col gap-6"
      >
        <FormInput
          label="URL"
          required
          id="edit-url"
          placeholder="https://brandur.org/interfaces"
          error={errors.url?.message}
          {...register("url")}
        />

        <FormInput
          label="Title"
          id="edit-title"
          placeholder="In Praise of Interfaces"
          {...register("title")}
        />

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <FormTextarea
              label="Description"
              id="edit-description"
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
          id="edit-collectionId"
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
              id="edit-tags"
              name={field.name}
              allTags={tags.map((t) => t.name)}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(tags) => field.onChange(tags)}
              placeholder="#engineering, #api-design"
              hint={
                <>
                  Enter any number of tags separated by space and{" "}
                  <span className="text-muted-foreground font-medium">
                    without
                  </span>{" "}
                  the hash (#). If a tag does not exist it will be automatically
                  created.
                </>
              }
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
                className="text-foreground/80 flex cursor-pointer items-center gap-0.5 text-sm font-medium select-none"
                onClick={() => setNotesOpen((o) => !o)}
              >
                <ChevronRight
                  className="text-muted2/50 size-4 transition-transform duration-200 data-[open]:rotate-90"
                  data-open={notesOpen || undefined}
                />
                Notes
              </button>
              {notesOpen && (
                <div className="animate-in fade-in slide-in-from-top-1 pt-2 duration-150">
                  <FormTextarea
                    hint="Supports Markdown"
                    id="edit-notes"
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

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={updateBookmark.isPending}
            className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors duration-300 disabled:opacity-50"
          >
            {updateBookmark.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              "Save"
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted2/60 hover:text-muted2 text-sm transition-colors duration-300"
            disabled={updateBookmark.isPending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

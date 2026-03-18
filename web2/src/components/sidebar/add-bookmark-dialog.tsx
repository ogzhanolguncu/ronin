import { useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { z } from "zod";
import { ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-input";
import { FormTagInput } from "@/components/ui/tag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusIcon } from "@/components/ui/icons";

const bookmarkSchema = z.object({
  url: z.url("Please enter a valid URL"),
  title: z.string().max(200, "Title must be 200 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less"),
  notes: z.string().max(2000, "Notes must be 2000 characters or less"),
  tags: z
    .array(z.string().min(1).max(50, "Tag must be 50 characters or less"))
    .max(20, "Maximum 20 tags"),
  unread: z.boolean(),
});

export function AddBookmarkDialog() {
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      url: "",
      title: "",
      description: "",
      notes: "",
      tags: [] as string[],
      unread: false,
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: bookmarkSchema,
    },
    onSubmit: async ({ value }) => {
      console.log({ tags: value.tags });
      form.reset();
      setNotesOpen(false);
      setOpen(false);
    },
  });

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      setNotesOpen(false);
    }
    setOpen(nextOpen);
  }

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="px-6 py-4 flex flex-col gap-6">
            <form.Field name="url">
              {(field) => (
                <FormInput
                  label="URL"
                  required
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="https://brandur.org/interfaces"
                  error={field.state.meta.errors[0]?.message}
                  autoFocus
                />
              )}
            </form.Field>

            <form.Field name="tags">
              {(field) => (
                <FormTagInput
                  className="h-auto min-h-8"
                  label="Tags"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(tags) => field.handleChange(tags)}
                  placeholder="#engineering, #api-design"
                  hint={<>Enter any number of tags separated by space and <span className="text-muted-foreground font-medium">without</span> the hash (#). If a tag does not exist it will be automatically created.</>}
                />
              )}
            </form.Field>

            <form.Field name="title">
              {(field) => (
                <FormInput
                  label="Title"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="In Praise of Interfaces"
                />
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <FormTextarea
                  label="Description"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Why good APIs feel invisible"
                  maxLength={500}
                  currentLength={field.state.value.length}
                />
              )}
            </form.Field>

            <form.Field name="notes">
              {(field) => (
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
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Revisit the section on composability"
                        maxLength={2000}
                        currentLength={field.state.value.length}
                      />
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="unread">
              {(field) => (
                <Checkbox
                  label="Mark as unread"
                  hint="Unread bookmarks can be filtered for, and marked as read later."
                  className="font-medium"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
              )}
            </form.Field>
          </div>
          <div className="flex justify-end gap-2 p-6 pb-7">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
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
import { PlusIcon } from "@/components/ui/icons";

const urlSchema = z.url("Must be a valid URL");

export function AddBookmarkDialog() {
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: { url: "", title: "", description: "", notes: "", tags: "" },
    onSubmit: async ({ value }) => {
      const tags = value.tags
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      console.log({ tags })
      form.reset();
      setOpen(false);
    },
  });

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
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
      <DialogContent showCloseButton={false} className="paper-grain bg-surface border-border-soft sm:max-w-md max-w-[calc(100vw-32px)] p-0 overflow-hidden shadow-none gap-0 min-w-[550px]">
        <div className="px-6 pt-8 pb-6">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">Add bookmark</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
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
            <form.Field name="url" validators={{ onSubmit: urlSchema }}>
              {(field) => (
                <FormInput
                  variant="ghost"
                  className="border-b border-border-soft/50 transition-colors focus:border-border-soft placeholder:text-muted2/50"
                  label="URL"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="https://brandur.org/interfaces"
                  error={field.state.meta.errors[0]?.toString()}
                  autoFocus
                />
              )}
            </form.Field>

            <form.Field name="title">
              {(field) => (
                <FormInput
                  variant="ghost"
                  className="border-b border-border-soft/50 transition-colors focus:border-border-soft placeholder:text-muted2/50"
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
                <FormInput
                  variant="ghost"
                  className="border-b border-border-soft/50 transition-colors focus:border-border-soft placeholder:text-muted2/50"
                  label="Description"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Why good APIs feel invisible"
                />
              )}
            </form.Field>

            <form.Field name="notes">
              {(field) => (
                <FormTextarea
                  variant="ghost"
                  className="border-b border-border-soft/50 transition-colors focus:border-border-soft placeholder:text-muted2/50"
                  label="Notes"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Revisit the section on composability"
                />
              )}
            </form.Field>

            <form.Field name="tags">
              {(field) => (
                <FormInput
                  variant="ghost"
                  className="border-b border-border-soft/50 transition-colors focus:border-border-soft placeholder:text-muted2/50"
                  label="Tags"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="engineering, api-design"
                />
              )}
            </form.Field>
          </div>
          <div className="flex justify-end gap-2 px-6 pb-7 pt-6">
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

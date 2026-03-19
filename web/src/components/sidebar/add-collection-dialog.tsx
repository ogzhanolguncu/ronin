import { useState } from "react";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { z } from "zod/mini";
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
import { FormInput } from "@/components/ui/form-input";
import { PlusIcon } from "@/components/ui/icons";
import { COLLECTION_COLORS } from "@/lib/colors";
import { cn, slugify } from "@/lib/utils";

const collectionSchema = z.object({
  name: z
    .string()
    .check(z.refine((v) => v.length >= 1, "Name is required"))
    .check(z.refine((v) => v.length <= 50, "Name must be 50 characters or less")),
  colorId: z.number().check(z.refine((v) => v >= 1, "Please pick a color")),
});

export function AddCollectionDialog() {
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      colorId: COLLECTION_COLORS[0].id as number,
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: collectionSchema,
    },
    onSubmit: async ({ value }) => {
      const slug = slugify(value.name);
      console.log({ ...value, slug });
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
          className="flex items-center gap-2.5 px-4 py-1.5 text-xs text-muted2/40 transition-colors hover:text-muted2"
        >
          <PlusIcon className="h-3 w-3" />
          New collection
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="bg-surface border-border-soft sm:max-w-md max-w-[calc(100vw-32px)] p-0 overflow-hidden shadow-none gap-0 min-w-[400px]"
      >
        <div className="px-6 pt-8 pb-6">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              New collection
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Group related bookmarks together.
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
            <form.Field name="name">
              {(field) => (
                <FormInput
                  label="Name"
                  required
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Design inspiration"
                  error={field.state.meta.errors[0]?.message}
                  autoFocus
                />
              )}
            </form.Field>

            <form.Field name="colorId">
              {(field) => (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    {COLLECTION_COLORS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        className={cn(
                          "size-5 rounded-full cursor-pointer transition-shadow",
                          field.state.value === color.id &&
                            "ring-2 ring-offset-2 ring-foreground/40",
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => field.handleChange(color.id)}
                        aria-label={color.key}
                      />
                    ))}
                  </div>
                </div>
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
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

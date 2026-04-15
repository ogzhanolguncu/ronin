import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/mini";
import {
  Dialog,
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
import { requester } from "@/lib/requester";
import { invalidateCollections } from "@/lib/queries/collections";

const collectionSchema = z.object({
  name: z
    .string()
    .check(z.refine((v) => v.length >= 1, "Name is required"))
    .check(
      z.refine((v) => v.length <= 50, "Name must be 50 characters or less"),
    ),
  colorId: z.number().check(z.refine((v) => v >= 1, "Please pick a color")),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

export function AddCollectionDialog({
  hasCollections,
}: {
  hasCollections: boolean;
}) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      colorId: COLLECTION_COLORS[0].id as number,
    },
  });

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
    }
    setOpen(nextOpen);
  }

  async function onSubmit(value: CollectionFormValues) {
    const slug = slugify(value.name);
    await requester("/api/v1/collections", {
      method: "POST",
      body: { name: value.name, slug, color_id: value.colorId },
    });
    await invalidateCollections();
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-muted2/80 hover:text-muted2 flex items-center gap-2.5 px-4 text-xs transition-colors",
            hasCollections && "py-2",
          )}
        >
          <PlusIcon className="h-3 w-3" />
          New collection
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="bg-surface border-border-soft max-w-[calc(100vw-32px)] min-w-[400px] gap-0 overflow-hidden p-0 shadow-none sm:max-w-md"
      >
        <div className="px-6 pt-8 pb-6">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              New collection
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Group related bookmarks together.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6 px-6 py-4">
            <FormInput
              label="Name"
              required
              id="name"
              placeholder="Design inspiration"
              error={errors.name?.message}
              autoFocus
              {...register("name")}
            />

            <Controller
              control={control}
              name="colorId"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <label className="text-foreground/80 text-sm font-medium">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    {COLLECTION_COLORS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        className={cn(
                          "dot-glow size-5 cursor-pointer rounded-full transition-all duration-200",
                          field.value === color.id
                            ? "ring-offset-surface scale-110 ring-2 ring-offset-2"
                            : "opacity-65 hover:opacity-80",
                        )}
                        style={{
                          backgroundColor: color.value,
                          color: color.value,
                          ...(field.value === color.id
                            ? ({
                              "--tw-ring-color": color.value,
                            } as React.CSSProperties)
                            : {}),
                        }}
                        onClick={() => field.onChange(color.id)}
                        aria-label={color.key}
                      />
                    ))}
                  </div>
                </div>
              )}
            />
          </div>

          <div className="p-6 pb-7">
            <Button type="submit" className="h-9 w-full">
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

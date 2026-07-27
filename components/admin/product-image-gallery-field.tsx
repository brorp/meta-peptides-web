"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Star, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import {
  MAX_PRODUCT_IMAGES,
  normalizeProductImages,
} from "@/lib/product-images";

type ProductImageGalleryFieldProps = {
  images: string[];
  onChange: (images: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export function ProductImageGalleryField({
  images,
  onChange,
  onUploadingChange,
}: ProductImageGalleryFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const normalizedImages = normalizeProductImages(images);

  const setUploadState = (value: boolean) => {
    setUploading(value);
    onUploadingChange?.(value);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    const availableSlots = MAX_PRODUCT_IMAGES - normalizedImages.length;
    if (availableSlots <= 0) {
      toast.error(`Maximum ${MAX_PRODUCT_IMAGES} images per product`);
      event.target.value = "";
      return;
    }

    const files = selectedFiles.slice(0, availableSlots);
    if (selectedFiles.length > files.length) {
      toast.info(
        `Only ${files.length} image(s) selected to stay within the ${MAX_PRODUCT_IMAGES}-image limit`,
      );
    }

    setUploadState(true);
    try {
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          const { data } = await axios.post("/admin/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (!data.success || !data.data?.url) {
            throw new Error(data.message || "Failed to upload image");
          }

          return data.data.url as string;
        }),
      );

      const uploadedUrls = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failedCount = results.length - uploadedUrls.length;

      if (uploadedUrls.length) {
        onChange(
          normalizeProductImages([...normalizedImages, ...uploadedUrls]),
        );
        toast.success(
          `${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} uploaded`,
        );
      }

      if (failedCount) {
        toast.error(
          `${failedCount} image${failedCount === 1 ? "" : "s"} failed to upload`,
        );
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to upload images",
      );
    } finally {
      setUploadState(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    onChange(normalizedImages.filter((_, imageIndex) => imageIndex !== index));
  };

  const setAsCover = (index: number) => {
    if (index === 0) return;

    const nextImages = [...normalizedImages];
    const [coverImage] = nextImages.splice(index, 1);
    onChange([coverImage, ...nextImages]);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Product Gallery
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            The first image is used as the cover across the website.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {normalizedImages.length}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {normalizedImages.map((image, index) => (
          <div
            key={image}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/30"
          >
            <img
              src={image}
              alt={`Product image ${index + 1}`}
              className="h-full w-full object-cover"
            />
            {index === 0 && (
              <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
                Cover
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => setAsCover(index)}
                  disabled={uploading}
                  aria-label={`Set image ${index + 1} as cover`}
                  title="Set as cover"
                  className="rounded-full bg-white/95 p-1.5 text-slate-700 transition-colors hover:text-amber-500 disabled:opacity-50"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={uploading}
                aria-label={`Remove image ${index + 1}`}
                title="Remove image"
                className="rounded-full bg-white/95 p-1.5 text-slate-700 transition-colors hover:text-destructive disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {normalizedImages.length < MAX_PRODUCT_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:border-accent hover:bg-accent/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : normalizedImages.length ? (
              <Upload className="h-6 w-6" />
            ) : (
              <ImageIcon className="h-7 w-7" />
            )}
            <span className="text-xs font-medium">
              {uploading ? "Uploading..." : "Add images"}
            </span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />
      <p className="text-xs text-muted-foreground">
        Select multiple JPEG, PNG, WebP, or GIF files. Maximum 5MB each.
      </p>
    </div>
  );
}

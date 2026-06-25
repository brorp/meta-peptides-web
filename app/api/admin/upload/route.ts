import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";

const BUCKET_NAME = "products";

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const previousUrl = formData.get("previousUrl") as string | null;

        if (!file) {
            return errorResponse("No file provided", 400);
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return errorResponse("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.", 400);
        }

        // Validate file size (max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return errorResponse("File too large. Maximum size is 5MB.", 400);
        }

        // Generate unique filename
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = `product-images/${fileName}`;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Delete previous image if provided
        if (previousUrl) {
            try {
                const url = new URL(previousUrl);
                // Extract file path from Supabase storage URL
                const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
                if (pathMatch) {
                    await supabaseAdmin.storage.from(BUCKET_NAME).remove([pathMatch[1]]);
                }
            } catch {
                // Ignore errors when deleting old file
            }
        }

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            return errorResponse("Upload failed", 500);
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return successResponse(
            { url: urlData.publicUrl },
            "Image uploaded successfully",
        );
    } catch (err: any) {
        return errorResponse("Upload failed", 500);
    }
}

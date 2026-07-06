"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";
import { useApiQuery } from "@/hooks/api/useApiQuery";

const MAX_IMAGES = 2;

export default function EditCoaPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const fileInputRef1 = useRef<HTMLInputElement>(null);
    const fileInputRef2 = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<boolean[]>([false, false]);
    const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null]);
    const { data: productsResponse } = useApiQuery<any>(
        ["admin-product-options", "coa"],
        "/admin/products",
        { params: { limit: 100 } },
        { staleTime: 5 * 60 * 1000 },
    );
    const { data: coaResponse, isLoading: loading } = useApiQuery<any>(
        ["admin-lab-test", id],
        `/admin/lab-tests/${id}`,
        undefined,
        { enabled: Boolean(id) },
    );
    const products: any[] = productsResponse?.data || [];

    const [form, setForm] = useState<Record<string, any>>({
        product_id: "",
        purity_level: "",
        test_date: "",
        report_url: "",
        report_images: [],
    });

    useEffect(() => {
        const coa = coaResponse?.data;
        if (!coa) return;

        const imgs: string[] = coa.report_images || [];
        setForm({
            product_id: coa.product_id || "",
            purity_level: coa.purity_level || "",
            test_date: coa.test_date
                ? new Date(coa.test_date).toISOString().split("T")[0]
                : "",
            report_url: coa.report_url || "",
            report_images: imgs,
        });
        setImagePreviews([imgs[0] ?? null, imgs[1] ?? null]);
    }, [coaResponse]);

    const updateField = (key: string, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleImageUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        slot: 0 | 1
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setImagePreviews((prev) => { const n = [...prev]; n[slot] = previewUrl; return n; });
        setUploading((prev) => { const n = [...prev]; n[slot] = true; return n; });

        try {
            const formData = new FormData();
            formData.append("file", file);
            const { data } = await axios.post("/admin/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (data.success) {
                setImagePreviews((prev) => { const n = [...prev]; n[slot] = data.data.url; return n; });
                setForm((prev) => {
                    const imgs = [...(prev.report_images || [])];
                    imgs[slot] = data.data.url;
                    return { ...prev, report_images: imgs.filter(Boolean) };
                });
                toast.success(`Image ${slot + 1} uploaded`);
            } else {
                toast.error(data.message);
                setImagePreviews((prev) => { const n = [...prev]; n[slot] = null; return n; });
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to upload image");
            setImagePreviews((prev) => { const n = [...prev]; n[slot] = null; return n; });
        } finally {
            setUploading((prev) => { const n = [...prev]; n[slot] = false; return n; });
            const ref = slot === 0 ? fileInputRef1 : fileInputRef2;
            if (ref.current) ref.current.value = "";
        }
    };

    const removeImage = (slot: 0 | 1) => {
        setImagePreviews((prev) => { const n = [...prev]; n[slot] = null; return n; });
        setForm((prev) => {
            const imgs = [...(prev.report_images || [])];
            imgs[slot] = undefined;
            return { ...prev, report_images: imgs.filter(Boolean) };
        });
        const ref = slot === 0 ? fileInputRef1 : fileInputRef2;
        if (ref.current) ref.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.product_id) {
            toast.error("Please select a product");
            return;
        }

        setSaving(true);
        try {
            const { data } = await axios.put(`/admin/lab-tests/${id}`, form);
            if (data.success) {
                toast.success("COA updated successfully!");
                router.push("/panel-xyz123/coas");
            } else {
                toast.error(data.message);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to update COA");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="text-2xl font-bold text-foreground">Edit COA Report</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image Upload Section */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">
                            COA Images
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            Up to {MAX_IMAGES} images
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {([0, 1] as const).map((slot) => (
                            <div key={slot} className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">
                                    Image {slot + 1}{slot === 0 ? " (required)" : " (optional)"}
                                </p>

                                {/* Preview box */}
                                <div className="relative w-full aspect-[3/4] rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                                    {uploading[slot] && (
                                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-10 rounded-xl">
                                            <Loader2 className="w-6 h-6 animate-spin text-accent" />
                                        </div>
                                    )}
                                    {imagePreviews[slot] ? (
                                        <>
                                            <img
                                                src={imagePreviews[slot]!}
                                                alt={`COA Preview ${slot + 1}`}
                                                className="w-full h-full object-cover rounded-xl"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(slot)}
                                                className="absolute top-1.5 right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => (slot === 0 ? fileInputRef1 : fileInputRef2).current?.click()}
                                            disabled={uploading[slot]}
                                            className="flex flex-col items-center gap-2 p-4 text-center disabled:opacity-50"
                                        >
                                            <FileText className="w-8 h-8 text-muted-foreground/40" />
                                            <span className="text-xs text-muted-foreground font-medium">Click to upload</span>
                                        </button>
                                    )}
                                </div>

                                {/* Replace button */}
                                {imagePreviews[slot] && (
                                    <button
                                        type="button"
                                        onClick={() => (slot === 0 ? fileInputRef1 : fileInputRef2).current?.click()}
                                        disabled={uploading[slot]}
                                        className="w-full inline-flex items-center justify-center gap-1.5 border border-border rounded-xl py-1.5 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent transition-all disabled:opacity-50"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        Replace
                                    </button>
                                )}

                                <input
                                    ref={slot === 0 ? fileInputRef1 : fileInputRef2}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={(e) => handleImageUpload(e, slot)}
                                    className="hidden"
                                />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        JPEG, PNG, WebP. High resolution portrait recommended. (Max 5MB each)
                    </p>
                </div>

                {/* COA Details */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-foreground">COA Details</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Assign to Product <span className="text-destructive ml-0.5">*</span>
                            </label>
                            <select
                                value={form.product_id}
                                onChange={(e) => updateField("product_id", e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                required
                            >
                                <option value="">Select a product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Purity Level <span className="text-destructive ml-0.5">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.purity_level}
                                onChange={(e) => updateField("purity_level", e.target.value)}
                                placeholder="ex: 99.8%"
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                Test Date <span className="text-destructive ml-0.5">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.test_date}
                                onChange={(e) => updateField("test_date", e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                External Report URL (Optional)
                            </label>
                            <input
                                type="url"
                                value={form.report_url}
                                onChange={(e) => updateField("report_url", e.target.value)}
                                placeholder="https://"
                                className="w-full bg-background border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving || uploading.some(Boolean)}
                    className="inline-flex items-center justify-center w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-4 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    Save Changes
                </button>
            </form>
        </div>
    );
}

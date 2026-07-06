"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { Loader2, TicketPercent } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductInterface } from "@/interface/products";
import { useApiQuery } from "@/hooks/api/useApiQuery";
import type { ApiResponse } from "@/interface/global";

const formSchema = z.object({
  name: z.string().min(2, "Nama terlalu pendek"),
  domisili: z.string().min(1, "Domisili wajib dipilih"),
  shopee_username: z.string().min(2, "Username Shopee wajib diisi"),
  whatsapp_number: z.string().min(8, "Nomor WhatsApp tidak valid"),
  product_id: z.string().min(1, "Silakan pilih produk"),
});

const DOMISILI_OPTIONS = [
  "Jabodetabek",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Sumatera",
  "Kalimantan",
  "Sulawesi",
  "Bali & Nusa Tenggara",
  "Maluku & Papua",
];

export default function PreorderPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: productsResponse, isLoading: loadingProducts } =
    useApiQuery<ApiResponse<ProductInterface[]>>(
      ["preorder-products"],
      "/products",
      { params: { limit: 100 } },
      { staleTime: 5 * 60 * 1000 },
    );
  const products = productsResponse?.data || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      domisili: "",
      shopee_username: "",
      whatsapp_number: "",
      product_id: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data } = await axios.post("/preorders", values);
      if (data.success) {
        toast.success("Preorder berhasil dikirim! Tim kami akan segera menghubungi Anda.");
        form.reset();
        // Optional: redirect to a thank you page
        // router.push("/preorder/success");
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim formulir preorder");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-accent/10 rounded-full mb-2">
            <TicketPercent className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Shopee Preorder Form
          </h1>
          <p className="text-muted-foreground text-lg">
            Dapatkan <span className="text-accent font-semibold">Diskon 20%</span> khusus untuk pelanggan Shopee yang melakukan preorder sekarang!
          </p>
        </div>

        <div className="bg-card border border-border shadow-sm rounded-2xl p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama lengkap Anda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="domisili"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domisili</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Domisili" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DOMISILI_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shopee_username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username Shopee</FormLabel>
                      <FormControl>
                        <Input placeholder="Username Shopee (ex: john_doe123)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="whatsapp_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="No WA aktif yang bisa dihubungi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Produk</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={loadingProducts}>
                          <SelectValue 
                            placeholder={loadingProducts ? "Memuat produk..." : "Pilih produk yang ingin di-preorder"} 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} {product.label ? `(${product.label})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-6 text-lg rounded-xl mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  "Kirim Preorder & Dapatkan Diskon 20%"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

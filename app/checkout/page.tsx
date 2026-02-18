"use client";

import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCartStore } from "@/store/useCartStore";
import { useUserStore } from "@/store/useUserStore";
import { persentegeTax } from "@/contants/tax";
import { cn } from "@/lib/utils";
import { InputGroup } from "@/components/ui/input-group";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useCheckout } from "@/hooks/api/useCheckout";
import { toast } from "sonner";

// --- VALIDATION SCHEMA WITH ZOD ---
const checkoutSchema = z.object({
  // Step: Shipping
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(20, "Full address is required (Street, Unit, etc.)"),
  regional: z.string().min(2, "City or Town is required"),
  zip: z.string().min(5, "ZIP/Postal code must be at least 5 digits"),

  // Step: Payment
  receiptFile: z.any().optional(),
  receiptPreview: z.string().nullable().optional(),

  // Optional Note & Voucher
  note: z.string().max(200, "Note cannot exceed 200 characters").optional(),
  voucherCode: z.string().toUpperCase().optional().or(z.literal("")),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const tabs = ["Shipping", "Payment", "Confirmation"];

  type Step = (typeof tabs)[number];

  const [step, setStep] = useState<Step>("Shipping");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    items: cartItems,
    getTotalPrice,
    setShipping,
    shipping: storedShipping,
    clearCart,
  } = useCartStore();
  const user = useUserStore((state) => state.user);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: storedShipping?.email || user?.email || "",
      firstName:
        storedShipping?.firstName || user?.user_metadata?.first_name || "",
      lastName:
        storedShipping?.lastName || user?.user_metadata?.last_name || "",
      phone: storedShipping?.phone || "",
      address: storedShipping?.address || "",
      regional: storedShipping?.regional || "",
      zip: storedShipping?.zip || "",
      note: storedShipping?.note || "",
      voucherCode: storedShipping?.voucherCode || "",
      receiptPreview: null,
    },
  });

  const {
    data: responseSubmit,
    mutate: submitOrder,
    isPending: isLoadingSubmit,
  } = useCheckout({
    onSuccess: (data) => {
      clearCart();
      setStep("Confirmation");
    },
  });

  const isLoading = isSubmitting || isLoadingSubmit;

  React.useEffect(() => {
    if (storedShipping) {
      reset({
        ...storedShipping,
        receiptPreview: null,
      });
    }
  }, [storedShipping, reset]);

  const watchAllFields = watch();

  const receiptPreview = watch("receiptPreview");

  // --- PRICING CALCULATION ---
  const subtotal = getTotalPrice();
  const serviceFeeOrigin = subtotal * persentegeTax;
  const total = subtotal;

  // --- HANDLERS ---
  const handleNext = async () => {
    if (step === "Shipping") {
      const isValid = await trigger([
        "email",
        "firstName",
        "lastName",
        "phone",
        "address",
        "regional",
        "zip",
      ]);
      if (isValid) {
        setStep("Payment");
        setShipping({
          ...watchAllFields,
          lastName: watchAllFields.lastName ?? "",
        });
      }
    } else if (step === "Payment") {
      // Form submit handle di button final
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024)
        return alert("File terlalu besar (Max 5MB)");

      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("receiptFile", file);
        setValue("receiptPreview", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CheckoutValues) => {
    // Pastikan file sudah dipilih jika di step Payment
    if (!data.receiptFile && step === "Payment") {
      return toast("Please upload your payment receipt first.");
    }

    const formData = new FormData();

    formData.append("file", data.receiptFile);

    const orderPayload = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      shipping_address: data.address,
      shipping_regional: data.regional,
      shipping_name: `${data.firstName} ${data.lastName || ""}`.trim(),
      shipping_phone: data.phone,
      zip: data.zip,
      note: data.note,
      voucher_code: data.voucherCode,
      total_price: total,
      subtotal: subtotal,
      items: cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        price_at_purchase: item.price,
      })),
    };

    formData.append("orderData", JSON.stringify(orderPayload));

    submitOrder(formData);
  };

  const inputStyles = cn(
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm transition-all duration-200",
    "placeholder:text-slate-300 text-slate-700",
    "hover:border-slate-300",
    "focus:border-accent focus:ring-[3px] focus:ring-accent/10 focus:outline-none",
    "disabled:bg-slate-50 disabled:text-slate-400",
  );

  return (
    <div className="min-h-screen bg-[#fafafa] text-foreground pb-20">
      {/* Header */}
      <section className="bg-black text-white py-12 pt-32">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl font-bold uppercase italic tracking-tighter">
            Secure <span className="text-accent">Checkout.</span>
          </h1>
          <p className="text-xs font-bold opacity-60 uppercase tracking-[0.3em] mt-2">
            Professional Research Sequence Only
          </p>
        </div>
      </section>

      {/* Progress Bar */}
      <div className="bg-white border-b border-muted sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center md:justify-around overflow-x-auto gap-4">
            {tabs.map((label, i) => {
              const isActive = tabs.indexOf(step) >= i;
              return (
                <div key={label} className="flex items-center flex-shrink-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors",
                      isActive
                        ? "bg-accent text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={cn(
                      "ml-3 text-xs font-bold uppercase",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                  {i < 3 && (
                    <ChevronRight className="w-4 h-4 mx-4 text-muted/50" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* LEFT COLUMN: FORMS */}
          <div
            className={cn(
              "lg:col-span-7",
              step === "Confirmation" && "lg:col-span-12",
            )}
          >
            {/* 1. Shipping Form */}
            {step === "Shipping" && (
              <Card className="p-6 md:p-8 rounded-[2rem] border-none shadow-xl shadow-slate-200/50 space-y-8 bg-white">
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter border-b border-muted pb-4">
                    Shipping <span className="text-accent">Details.</span>
                  </h3>
                  <p className="text-sm text-slate-500">
                    Provide your laboratory delivery information.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
                  <InputGroup
                    label="First Name"
                    error={errors.firstName?.message}
                  >
                    <input
                      {...register("firstName")}
                      className={inputStyles}
                      placeholder="John"
                    />
                  </InputGroup>

                  <InputGroup
                    label="Last Name"
                    error={errors.lastName?.message}
                  >
                    <input
                      {...register("lastName")}
                      className={inputStyles}
                      placeholder="Doe"
                    />
                  </InputGroup>

                  <InputGroup
                    label="Email Address"
                    error={errors.email?.message}
                  >
                    <input
                      {...register("email")}
                      className={inputStyles}
                      placeholder="researcher@lab.com"
                    />
                  </InputGroup>

                  <InputGroup
                    label="Phone Number"
                    error={errors.phone?.message}
                  >
                    <input
                      {...register("phone")}
                      className={inputStyles}
                      placeholder="08123456789"
                    />
                  </InputGroup>

                  <div className="md:col-span-2">
                    <InputGroup
                      label="Street Address"
                      error={errors.address?.message}
                    >
                      <textarea
                        {...register("address")}
                        className={cn(inputStyles, "min-h-[100px] resize-none")}
                        placeholder="Street Name, Building, Suite..."
                      />
                    </InputGroup>
                  </div>

                  <InputGroup
                    label="City or Town"
                    error={errors.regional?.message}
                  >
                    <AddressAutocomplete
                      defaultValue={watch("regional")}
                      onSelect={(data) => {
                        setValue("regional", data.label, {
                          shouldValidate: true,
                        });

                        setValue("zip", data.postcode, {
                          shouldValidate: true,
                        });
                      }}
                      placeholder="Contoh: Balaraja atau Tangerang..."
                      error={errors.regional?.message}
                    />
                  </InputGroup>

                  <InputGroup label="Postal Code" error={errors.zip?.message}>
                    <input
                      {...register("zip")}
                      className={inputStyles}
                      placeholder="12190"
                    />
                  </InputGroup>
                </div>
                {/* Note & Voucher Section */}
                <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
                  <InputGroup label="Order Note (Optional)">
                    <input
                      {...register("note")}
                      className={inputStyles}
                      placeholder="e.g. Leave at front desk"
                    />
                  </InputGroup>

                  <InputGroup label="Voucher Code">
                    <input
                      {...register("voucherCode")}
                      className={cn(
                        inputStyles,
                        "font-mono tracking-wider uppercase",
                      )}
                      placeholder="LAB2026"
                    />
                  </InputGroup>
                </div>
              </Card>
            )}

            {/* 2. Payment Form */}
            {step === "Payment" && (
              <Card className="p-8 rounded-[2.5rem] border-muted bg-white shadow-xl space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold uppercase italic tracking-tighter border-b border-muted pb-4">
                    Manual <span className="text-accent">Transfer.</span>
                  </h3>
                  <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />{" "}
                    Direct Verification
                  </div>
                </div>

                {/* Bank Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-[2rem] bg-gradient-to-br from-white to-muted/20 border border-muted group hover:border-accent transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        BCA
                      </p>
                      <CreditCard className="w-5 h-5 text-accent" />
                    </div>
                    <p className="text-2xl font-bold text-foreground tracking-tighter mb-1">
                      1234 567 890
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">
                      PT. METAPEPTIDES INDONESIA
                    </p>
                  </div>
                  <div className="p-6 rounded-[2rem] bg-gradient-to-br from-white to-muted/20 border border-muted group hover:border-accent transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        MANDIRI
                      </p>
                      <CreditCard className="w-5 h-5 text-accent" />
                    </div>
                    <p className="text-2xl font-bold text-foreground tracking-tighter mb-1">
                      0987 654 321
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">
                      PT. METAPEPTIDES INDONESIA
                    </p>
                  </div>
                </div>

                {/* Upload Area */}
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Proof of Laboratory Transaction
                  </p>

                  {!receiptPreview ? (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center gap-3 p-8 rounded-[2rem] border-2 border-dashed border-muted hover:border-accent bg-muted/5 transition-all"
                      >
                        <Camera className="w-6 h-6 text-accent" />
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Take Photo
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-3 p-8 rounded-[2rem] border-2 border-dashed border-muted hover:border-accent bg-muted/5 transition-all"
                      >
                        <ImageIcon className="w-6 h-6 text-accent" />
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Gallery
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative rounded-[2rem] overflow-hidden border-2 border-accent aspect-video bg-black">
                      <img
                        src={receiptPreview}
                        className="w-full h-full object-contain"
                        alt="Preview"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setValue("receiptPreview", null);
                          setValue("receiptFile", null);
                        }}
                        className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full text-[9px] font-bold uppercase"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </Card>
            )}

            {/* 3. Confirmation */}
            {step === "Confirmation" && (
              <Card className="p-12 rounded-[3rem] border-accent/20 bg-white shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-10 h-10 text-accent" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-4xl font-bold uppercase italic tracking-tighter">
                    Transaction <span className="text-accent">Successful.</span>
                  </h2>
                  <p className="text-slate-500 text-sm font-medium max-w-sm mx-auto">
                    Your payment has been received. Your research sequence is
                    being prepared and will be{" "}
                    <span className="text-slate-900 font-bold">
                      dispatched shortly.
                    </span>
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">
                    Order Reference
                  </p>
                  <div className="font-mono text-sm uppercase tracking-wider font-bold text-slate-700">
                    #{responseSubmit?.data?.transaction_code || "MP-PROCESSING"}
                  </div>
                </div>

                <div className="pt-4">
                  <Link href="/shop" className="block">
                    <Button className="w-full py-8 rounded-[2rem] bg-black text-white font-bold uppercase tracking-widest hover:bg-accent hover:shadow-lg hover:shadow-accent/20 transition-all duration-300">
                      Return to Shopping
                    </Button>
                  </Link>
                  <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    A copy of your receipt has been sent to your email.
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: SUMMARY */}
          {step !== "Confirmation" && (
            <div className="lg:col-span-5">
              <Card className="p-6 md:p-8 rounded-[2rem] border-none shadow-xl shadow-slate-200/50 sticky top-32 space-y-6 bg-white">
                {/* Title */}
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold tracking-tight text-slate-800">
                    Order <span className="text-accent italic">Summary</span>
                  </h3>
                </div>

                {/* Cart Items List */}
                <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start group"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-700 leading-tight">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <p className="font-semibold text-sm text-slate-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-800">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Shipping</span>
                    <span className="text-[10px] font-bold text-accent bg-accent/5 px-2 py-1 rounded-lg italic">
                      Free Dispatch
                    </span>
                  </div>

                  {/* Grand Total */}
                  <div className="flex justify-between items-end pt-5 border-t-2 border-dashed border-slate-100 mt-4">
                    <span className="text-sm font-bold text-slate-800">
                      Total Due
                    </span>
                    <div className="text-right">
                      <span className="block text-2xl font-bold text-accent tracking-tighter">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-4">
                  {step !== "Confirmation" && (
                    <>
                      <Button
                        onClick={
                          step === "Payment"
                            ? handleSubmit(onSubmit)
                            : handleNext
                        }
                        disabled={isLoading}
                        className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-lg shadow-slate-200 group flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {step === "Payment"
                              ? "Processing Transaction..."
                              : "Verifying Details..."}
                          </span>
                        ) : (
                          <>
                            {step === "Payment"
                              ? "Submit Transaction"
                              : "Continue to Delivery"}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>

                      {/* Tombol Back dimatikan juga saat loading agar user tidak interupsi proses */}
                      {step !== "Shipping" && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => {
                            if (step === "Payment") setStep("Shipping");
                          }}
                          className={cn(
                            "w-full text-xs font-semibold transition-colors py-2",
                            isLoading
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-slate-400 hover:text-slate-600",
                          )}
                        >
                          Back to Previous Step
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Trust Badge */}
                <div className="flex items-center justify-center gap-2.5 pt-6 border-t border-slate-50 mt-4 opacity-60">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                    Secure SSL Encryption
                  </span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

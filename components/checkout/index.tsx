"use client";

import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCartStore } from "@/store/useCartStore";
import { useUserStore } from "@/store/useUserStore";
import { cn } from "@/lib/utils";
import { useCheckout } from "@/hooks/api/useCheckout";
import { useValidateVoucher } from "@/hooks/api/useValidateVoucher";
import { toast } from "sonner";
import { CheckoutSteps } from "./checkout-steps";
import { ShippingForm } from "./shipping-form";
import { OrderSummary } from "./order-summary";
import { PaymentForm } from "./payment-form";
import { ConfirmationCard } from "./confirmation-card";
import { discount as memberDiscountRate } from "@/contants/discount";

const checkoutSchema = z.object({
  // Step: Shipping
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(20, "Full address is required (Street, Unit, etc.)"),
  regional: z.string().min(2, "City or Town is required"),
  zip: z.string().min(5, "ZIP/Postal code must be at least 5 digits"),

  agreeShippingPolicy: z.boolean().refine((val) => val === true, {
    message: "You must agree to the shipping policy to proceed",
  }),

  // Step: Payment
  receiptFile: z.any().optional(),
  receiptPreview: z.string().nullable().optional(),

  // Optional Note & Voucher
  note: z.string().max(200, "Note cannot exceed 200 characters").optional(),
  voucherCode: z.string().toUpperCase().optional().or(z.literal("")),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPageComponent() {
  const tabs = ["Shipping", "Payment", "Confirmation"];
  type Step = (typeof tabs)[number];
  const [step, setStep] = useState<Step>("Shipping");

  const {
    items: cartItems,
    getTotalPrice,
    setShipping,
    shipping: storedShipping,
    clearCart,
    clearShipping,
  } = useCartStore();
  const user = useUserStore((state) => state.user);
  const isMember = !!user && Object.keys(user).length > 0 && !user.is_anonymous;

  // Voucher state
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherError, setVoucherError] = useState<string | null>(null);

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
      agreeShippingPolicy: true,
    },
  });

  const {
    data: responseSubmit,
    mutate: submitOrder,
    isPending: isLoadingSubmit,
  } = useCheckout({
    onSuccess: () => {
      clearCart();
      clearShipping();
      setStep("Confirmation");
      toast.success("Order Received", {
        description:
          "We've received your order. Please allow 1-3 hours for payment verification.",
      });
    },
  });

  const {
    mutate: validateVoucher,
    isPending: isVoucherLoading,
  } = useValidateVoucher();

  const isLoading = isSubmitting || isLoadingSubmit;

  // Sync data dari store jika ada
  React.useEffect(() => {
    if (storedShipping) {
      reset({
        ...storedShipping,
        receiptPreview: null,
        agreeShippingPolicy: true,
      });
    }
  }, [storedShipping, reset]);

  const watchAllFields = watch();
  const subtotal = getTotalPrice();

  // Calculate final total with member + voucher discount
  const memberDiscountAmount = isMember ? Math.round(subtotal * memberDiscountRate) : 0;
  const afterMemberDiscount = subtotal - memberDiscountAmount;
  const effectiveVoucherDiscount = Math.min(voucherDiscount, afterMemberDiscount);
  const total = Math.max(0, afterMemberDiscount - effectiveVoucherDiscount);

  const handleApplyVoucher = (code: string) => {
    setVoucherError(null);

    validateVoucher(
      { code, subtotal: afterMemberDiscount },
      {
        onSuccess: (data) => {
          if (data.success && data.data) {
            setAppliedVoucherCode(data.data.code);
            setVoucherDiscount(data.data.discount_amount);
            setVoucherError(null);
            setValue("voucherCode", data.data.code);
            toast.success("Voucher Applied", {
              description: `You saved ${new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(data.data.discount_amount)}!`,
            });
          } else {
            setVoucherError(data.message || "Invalid voucher");
          }
        },
        onError: (error: any) => {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to validate voucher";
          setVoucherError(message);
        },
      },
    );
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucherCode(null);
    setVoucherDiscount(0);
    setVoucherError(null);
    setValue("voucherCode", "");
    toast.info("Voucher removed");
  };

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
        "agreeShippingPolicy",
      ]);

      if (isValid) {
        setStep("Payment");
        setShipping({
          email: watchAllFields.email,
          firstName: watchAllFields.firstName,
          lastName: watchAllFields.lastName ?? "",
          phone: watchAllFields.phone,
          address: watchAllFields.address,
          regional: watchAllFields.regional,
          zip: watchAllFields.zip,
          note: watchAllFields.note,
          voucherCode: appliedVoucherCode || watchAllFields.voucherCode || "",
        });
      } else {
        // Jika checkbox belum dicentang, berikan feedback visual
        if (errors.agreeShippingPolicy) {
          toast.error("Action Required", {
            description:
              "Please read and accept the Shipping Policy to continue.",
          });
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return alert("File too large (Max 5MB)");
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("receiptFile", file);
        setValue("receiptPreview", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CheckoutValues) => {
    if (!data.receiptFile && step === "Payment") {
      return toast.error("Please upload your payment receipt first.");
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
      shipping_zip: data.zip,
      shipping_email: data.email,
      note: data.note,
      voucher_code: appliedVoucherCode || "",
      voucher_discount_amount: effectiveVoucherDiscount,
      total_price: total,
      subtotal: subtotal,
      member_discount_amount: memberDiscountAmount,
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
    <div className="min-h-screen bg-[#fafafa] pb-20 selection:bg-accent/30">
      <section className="bg-black text-white py-12 pt-40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            Secure <span className="text-accent">Checkout.</span>
          </h1>
          <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.4em] mt-2">
            Momenku Brand - Meta Peptides 2026
          </p>
        </div>
      </section>

      <CheckoutSteps steps={tabs} currentStep={step} />

      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-green-700">
          Every order includes free 1x bacteriostatic water while supplies last
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-12 gap-12">
          <div
            className={cn(
              "lg:col-span-7",
              step === "Confirmation" && "lg:col-span-12",
            )}
          >
            {step === "Shipping" && (
              <ShippingForm
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                inputStyles={inputStyles}
              />
            )}
            {step === "Payment" && (
              <PaymentForm
                receiptPreview={watch("receiptPreview")}
                setValue={setValue}
                onFileChange={handleFileChange}
                isLoading={isLoading}
              />
            )}
            {step === "Confirmation" && (
              <ConfirmationCard data={responseSubmit} />
            )}
          </div>

          {step !== "Confirmation" && (
            <div className="lg:col-span-5">
              <OrderSummary
                items={cartItems}
                subtotal={subtotal}
                step={step}
                isLoading={isLoading}
                onNext={
                  step === "Payment" ? handleSubmit(onSubmit) : handleNext
                }
                onBack={() => setStep("Shipping")}
                voucherCode={appliedVoucherCode}
                voucherDiscount={effectiveVoucherDiscount}
                voucherLoading={isVoucherLoading}
                voucherError={voucherError}
                onApplyVoucher={handleApplyVoucher}
                onRemoveVoucher={handleRemoveVoucher}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

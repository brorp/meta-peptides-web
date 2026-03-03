import { InputGroup } from "@/components/ui/input-group";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react"; // Tambahkan icon ini
import Link from "next/link";

export function ShippingForm({
  register,
  errors,
  setValue,
  watch,
  inputStyles,
}: any) {
  return (
    <Card className="p-6 md:p-8 rounded-[2rem] border-none shadow-xl shadow-slate-200/50 space-y-8 bg-white">
      <div className="space-y-1">
        <h3 className="text-xl font-black uppercase italic tracking-tighter border-b border-muted pb-4">
          Shipping <span className="text-accent">Details.</span>
        </h3>
        <p className="text-sm text-primary">
          Provide your laboratory delivery information.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
        <InputGroup label="First Name" error={errors.firstName?.message}>
          <input
            {...register("firstName")}
            className={inputStyles}
            placeholder="John"
          />
        </InputGroup>

        <InputGroup label="Last Name" error={errors.lastName?.message}>
          <input
            {...register("lastName")}
            className={inputStyles}
            placeholder="Doe"
          />
        </InputGroup>

        <InputGroup label="Email Address" error={errors.email?.message}>
          <input
            {...register("email")}
            className={inputStyles}
            placeholder="researcher@lab.com"
          />
        </InputGroup>

        <InputGroup label="Phone Number" error={errors.phone?.message}>
          <input
            {...register("phone")}
            className={inputStyles}
            placeholder="08123456789"
          />
        </InputGroup>

        <div className="md:col-span-2">
          <InputGroup label="Street Address" error={errors.address?.message}>
            <textarea
              {...register("address")}
              className={cn(inputStyles, "min-h-[100px] resize-none")}
              placeholder="Street Name, Building, Suite..."
            />
          </InputGroup>
        </div>

        <InputGroup label="City or Town" error={errors.regional?.message}>
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

      {/* Note Section */}
      <InputGroup label="Order Note (Optional)">
        <input
          {...register("note")}
          className={inputStyles}
          placeholder="e.g. Leave at front desk"
        />
      </InputGroup>

      {/* --- SHIPPING POLICY AGREEMENT --- */}
      <div className="pt-6 border-t border-slate-100">
        <label className="flex items-start gap-4 p-5 rounded-3xl bg-slate-50 border border-slate-200 cursor-pointer group hover:bg-slate-100 transition-colors">
          <div className="relative mt-1">
            <input
              type="checkbox"
              {...register("agreeShippingPolicy")}
              className="peer sr-only"
            />
            <div className="w-6 h-6 border-2 border-slate-300 rounded-lg bg-white peer-checked:bg-[#414042] peer-checked:border-[#414042] transition-all flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600 leading-relaxed tracking-tight group-hover:text-slate-900 transition-colors">
              I have read, understood, and agree to the{" "}
              <Link
                href="/shipping"
                target="_blank"
                className="text-accent underline decoration-accent/30 underline-offset-4 font-black"
              >
                Shipping Policy
              </Link>
              , including the strict no-refund policy, Indonesia-only shipping,
              dispatch hours (09.00–18.00), and transfer of shipping risk to the
              customer.
            </p>
            {errors.agreeShippingPolicy && (
              <p className="text-[10px] font-semibold text-red-500 mt-1">
                You must agree to the shipping policy to proceed.
              </p>
            )}
          </div>
        </label>
      </div>
    </Card>
  );
}

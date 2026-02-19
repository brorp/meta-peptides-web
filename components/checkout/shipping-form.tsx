import { InputGroup } from "@/components/ui/input-group";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
      {/* Note & Voucher Section */}
      <InputGroup label="Order Note (Optional)">
        <input
          {...register("note")}
          className={inputStyles}
          placeholder="e.g. Leave at front desk"
        />
      </InputGroup>
    </Card>
  );
}

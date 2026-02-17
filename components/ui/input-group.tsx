import { cn } from "@/lib/utils";

interface InputGroupProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export const InputGroup = ({
  label,
  children,
  error,
  className,
}: InputGroupProps) => {
  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      {/* Label: Dibuat tipis, kecil, tapi tegas */}
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] px-1">
        {label}
      </label>

      {/* Wrapper untuk Input */}
      <div className="relative group">{children}</div>

      {/* Error Message */}
      {error && (
        <p className="text-[10px] text-red-500 font-medium ml-1 mt-0.5">
          {error}
        </p>
      )}
    </div>
  );
};

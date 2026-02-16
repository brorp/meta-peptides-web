export const formatCurrency = (
  price: number | string,
  options: {
    currency?: string;
    locale?: string;
    decimal?: number;
  } = {},
) => {
  const { currency = "IDR", locale = "id-ID", decimal = 0 } = options;

  const numericPrice = typeof price === "string" ? parseFloat(price) : price;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
  }).format(numericPrice || 0);
};

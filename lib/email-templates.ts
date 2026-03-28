const BRAND_COLOR = "#10b981";
const DARK_BG = "#414042";
const LIGHT_BG = "#f9fafb";

type OrderItem = {
  name: string;
  quantity: number;
  price_at_purchase: number;
};

type OrderEmailData = {
  customerName: string;
  customerEmail: string;
  orderId: string;
  transactionCode: string;
  items: OrderItem[];
  subtotal: number;
  memberDiscount?: number;
  voucherCode?: string | null;
  voucherDiscount?: number;
  totalPrice: number;
  receiptUrl?: string | null;
  status: string;
  shippingAddress?: string;
  shippingRegional?: string;
  shippingZip?: string;
  shippingPhone?: string;
  createdAt?: string;
};

function formatCurrencyEmail(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${LIGHT_BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);margin-top:20px;margin-bottom:20px;">
    <!-- Header -->
    <div style="background-color:${DARK_BG};padding:28px 32px;text-align:center;">
      <h1 style="color:${BRAND_COLOR};margin:0;font-size:24px;letter-spacing:6px;font-weight:900;text-transform:uppercase;">METAPEPTIDES</h1>
      <p style="color:#9ca3af;margin:6px 0 0;font-size:10px;letter-spacing:3px;text-transform:uppercase;">Research-Grade Peptide Solutions</p>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background:#f1f5f9;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:10px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">
        © ${new Date().getFullYear()} Meta Peptides · meta-peptides.com
      </p>
      <p style="margin:6px 0 0;font-size:9px;color:#cbd5e1;">
        This is an automated message. Do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function itemsTable(items: OrderItem[]): string {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">${item.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#6b7280;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;text-align:right;font-weight:600;">
        ${Number(item.price_at_purchase) === 0 ? "FREE" : formatCurrencyEmail(item.price_at_purchase * item.quantity)}
      </td>
    </tr>`,
    )
    .join("");

  return `
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead>
      <tr style="border-bottom:2px solid ${BRAND_COLOR};">
        <th style="text-align:left;padding:8px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Product</th>
        <th style="text-align:center;padding:8px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Qty</th>
        <th style="text-align:right;padding:8px 0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function totalsBlock(data: OrderEmailData): string {
  let html = `
  <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-top:16px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:13px;color:#6b7280;">Subtotal</span>
      <span style="font-size:13px;color:#374151;font-weight:600;">${formatCurrencyEmail(data.subtotal)}</span>
    </div>`;

  if (data.memberDiscount && data.memberDiscount > 0) {
    html += `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:13px;color:${BRAND_COLOR};">Member Discount (10%)</span>
      <span style="font-size:13px;color:${BRAND_COLOR};font-weight:600;">-${formatCurrencyEmail(data.memberDiscount)}</span>
    </div>`;
  }

  if (data.voucherCode && data.voucherDiscount && data.voucherDiscount > 0) {
    html += `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:13px;color:${BRAND_COLOR};">Voucher (${data.voucherCode})</span>
      <span style="font-size:13px;color:${BRAND_COLOR};font-weight:600;">-${formatCurrencyEmail(data.voucherDiscount)}</span>
    </div>`;
  }

  html += `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:13px;color:#6b7280;">Shipping</span>
      <span style="font-size:13px;color:${BRAND_COLOR};font-weight:600;">Free</span>
    </div>
    <div style="border-top:2px dashed #e2e8f0;padding-top:12px;margin-top:8px;display:flex;justify-content:space-between;">
      <span style="font-size:15px;color:#111827;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Total</span>
      <span style="font-size:18px;color:${BRAND_COLOR};font-weight:900;">${formatCurrencyEmail(data.totalPrice)}</span>
    </div>
  </div>`;

  return html;
}

// ─── EMAIL 1: Customer — Order Created ───────────────────────

export function orderCreatedCustomerTemplate(data: OrderEmailData): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="color:#111827;font-size:20px;margin:0 0 6px;font-weight:800;">Thank you for your order!</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px;line-height:1.6;">
      Hi <strong>${data.customerName}</strong>, your research order has been successfully placed
      and is now awaiting payment verification.
    </p>

    <!-- Order Info -->
    <div style="background:${DARK_BG};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Order ID</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;color:white;font-family:monospace;">${data.orderId.slice(0, 8)}...</span></td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Transaction Code</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;color:${BRAND_COLOR};font-family:monospace;font-weight:700;">${data.transactionCode}</span></td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Status</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:12px;color:#fbbf24;font-weight:700;text-transform:uppercase;">Pending Review</span></td>
        </tr>
      </table>
    </div>

    <!-- Items -->
    <h3 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;font-weight:700;">Order Summary</h3>
    ${itemsTable(data.items)}
    ${totalsBlock(data)}

    <!-- Status Message -->
    <div style="margin-top:24px;padding:16px 20px;background:#fef3c7;border-radius:12px;border-left:4px solid #f59e0b;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        <strong>What's next?</strong> Our team will review and verify your payment.
        You'll receive another email once your order has been confirmed and is being prepared for shipment.
      </p>
    </div>

    <p style="margin:28px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      If you have any questions, contact us at <a href="mailto:metapeptides@gmail.com" style="color:${BRAND_COLOR};">metapeptides@gmail.com</a>
    </p>`;

  return {
    subject: "Your Meta Peptides Order Has Been Received",
    html: baseLayout(content),
  };
}

// ─── EMAIL 2: Admin — Order Notification ─────────────────────

export function orderCreatedAdminTemplate(data: OrderEmailData): {
  subject: string;
  html: string;
} {
  const addressBlock = [
    data.shippingAddress,
    data.shippingRegional,
    data.shippingZip,
  ]
    .filter(Boolean)
    .join(", ");

  const dateStr = data.createdAt
    ? new Date(data.createdAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  let paymentProofBlock = "";
  if (data.receiptUrl) {
    paymentProofBlock = `
    <div style="margin-top:20px;">
      <h3 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;font-weight:700;">Payment Proof</h3>
      <div style="border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <img src="${data.receiptUrl}" alt="Payment Receipt" style="width:100%;max-height:400px;object-fit:contain;display:block;" />
      </div>
      <a href="${data.receiptUrl}" target="_blank" style="display:inline-block;margin-top:8px;font-size:12px;color:${BRAND_COLOR};text-decoration:underline;">
        View Full Image →
      </a>
    </div>`;
  }

  const content = `
    <h2 style="color:#111827;font-size:20px;margin:0 0 6px;font-weight:800;">🔔 New Order Received</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px;line-height:1.6;">
      A new order has been placed and requires review.
    </p>

    <!-- Customer Info -->
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <h3 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;font-weight:700;">Customer Details</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#6b7280;width:120px;">Name</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${data.customerName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#6b7280;">Email</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;">${data.customerEmail}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#6b7280;">Phone</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;">${data.shippingPhone || "-"}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#6b7280;">Address</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;">${addressBlock || "-"}</td>
        </tr>
      </table>
    </div>

    <!-- Order Info -->
    <div style="background:${DARK_BG};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Order ID</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;color:white;font-family:monospace;">${data.orderId}</span></td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Transaction Code</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;color:${BRAND_COLOR};font-family:monospace;font-weight:700;">${data.transactionCode}</span></td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Date</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;color:white;">${dateStr}</span></td>
        </tr>
      </table>
    </div>

    <!-- Items -->
    <h3 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;font-weight:700;">Order Items</h3>
    ${itemsTable(data.items)}
    ${totalsBlock(data)}

    ${paymentProofBlock}`;

  return {
    subject: `New Order: ${data.transactionCode} — ${data.customerName}`,
    html: baseLayout(content),
  };
}

// ─── EMAIL 3: Customer — Order Verified ──────────────────────

export function orderVerifiedCustomerTemplate(data: OrderEmailData): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="color:#111827;font-size:20px;margin:0 0 6px;font-weight:800;">Your order has been verified! ✅</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px;line-height:1.6;">
      Hi <strong>${data.customerName}</strong>, great news — your payment has been successfully verified
      and your order is now being prepared for shipment.
    </p>

    <!-- Order Info -->
    <div style="background:${DARK_BG};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Order ID</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;color:white;font-family:monospace;">${data.orderId.slice(0, 8)}...</span></td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Transaction Code</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;color:${BRAND_COLOR};font-family:monospace;font-weight:700;">${data.transactionCode}</span></td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Status</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:12px;color:${BRAND_COLOR};font-weight:700;text-transform:uppercase;">Processing</span></td>
        </tr>
      </table>
    </div>

    <!-- Brief Summary -->
    ${itemsTable(data.items)}
    ${totalsBlock(data)}

    <!-- Verified Message -->
    <div style="margin-top:24px;padding:16px 20px;background:#d1fae5;border-radius:12px;border-left:4px solid ${BRAND_COLOR};">
      <p style="margin:0;font-size:13px;color:#065f46;line-height:1.6;">
        <strong>Your order is confirmed!</strong> Your research materials will be carefully packaged
        and shipped shortly. You will receive tracking information once your order is dispatched.
      </p>
    </div>

    <p style="margin:28px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      If you have any questions, contact us at <a href="mailto:metapeptides@gmail.com" style="color:${BRAND_COLOR};">metapeptides@gmail.com</a>
    </p>`;

  return {
    subject: "Your Meta Peptides Order Has Been Verified",
    html: baseLayout(content),
  };
}

export type { OrderEmailData, OrderItem };

import {
  META_PEPTIDES_LOGO_ALT,
  META_PEPTIDES_LOGO_URL,
} from "./brand";

const BRAND_COLOR = "#10b981";
const DARK_BG = "#414042";
const LIGHT_BG = "#f9fafb";
const HELP_WHATSAPP_URL = "https://wa.me/15812895785";

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

type PasswordResetEmailData = {
  customerEmail: string;
  resetUrl: string;
};

type VisitorMetadata = {
  ipAddress?: string | null;
  country?: string | null;
  userAgent?: string | null;
  referer?: string | null;
  origin?: string | null;
  language?: string | null;
  timezone?: string | null;
  platform?: string | null;
  screenSize?: string | null;
  viewport?: string | null;
  entryPath?: string | null;
};

type RegisteredUserEmailData = {
  customerName: string;
  customerEmail: string;
  userId: string;
  providerLabel: string;
  createdAt?: string | null;
  shopUrl: string;
  metadata?: VisitorMetadata;
};

type GuestSessionEmailData = {
  guestId: string;
  createdAt?: string | null;
  metadata?: VisitorMetadata;
};

function formatCurrencyEmail(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDateTimeEmail(value?: string | null): string {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${LIGHT_BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);margin-top:20px;margin-bottom:20px;">
    <!-- Header -->
    <div style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #e2e8f0;">
      <table
        align="center"
        width="100%"
        border="0"
        cellpadding="0"
        cellspacing="0"
        role="presentation"
      >
        <tbody style="width:100%">
          <tr style="width:100%">
            <td align="center" data-id="__react-email-column">
              <img
                alt="${META_PEPTIDES_LOGO_ALT}"
                height="74"
                src="${META_PEPTIDES_LOGO_URL}"
                style="display:block;outline:none;border:none;text-decoration:none"
                width="136"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      ${content}
    </div>
    <!-- Help CTA -->
    <div style="padding:0 32px 24px;text-align:center;">
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:16px;padding:18px 20px;">
        <p style="margin:0 0 12px;font-size:12px;color:#065f46;line-height:1.6;">
          Need a hand with your order, account, or payment confirmation?
        </p>
        <a
          href="${HELP_WHATSAPP_URL}"
          style="display:inline-block;background:${BRAND_COLOR};color:white;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:14px 24px;border-radius:999px;"
        >
          Ask For Help
        </a>
      </div>
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

function primaryButton(label: string, href: string): string {
  return `
  <div style="margin:24px 0;text-align:center;">
    <a
      href="${href}"
      style="display:inline-block;background:${BRAND_COLOR};color:white;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:14px 24px;border-radius:999px;"
    >
      ${label}
    </a>
  </div>`;
}

function detailsTable(
  rows: Array<{
    label: string;
    value?: string | null;
    accent?: boolean;
  }>,
): string {
  const tableRows = rows
    .filter((row) => row.value && String(row.value).trim().length > 0)
    .map(
      (row) => `
      <tr>
        <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">${row.label}</span></td>
        <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;${row.accent ? `color:${BRAND_COLOR};font-weight:700;` : "color:white;"}">${row.value}</span></td>
      </tr>`,
    )
    .join("");

  return `
  <div style="background:${DARK_BG};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
    <table style="width:100%;border-collapse:collapse;">
      ${tableRows}
    </table>
  </div>`;
}

function metadataBlock(
  title: string,
  metadata?: VisitorMetadata,
  extraRows: Array<{ label: string; value?: string | null }> = [],
): string {
  const rows = [
    ...extraRows,
    { label: "IP Address", value: metadata?.ipAddress || null },
    { label: "Country", value: metadata?.country || null },
    { label: "Language", value: metadata?.language || null },
    { label: "Timezone", value: metadata?.timezone || null },
    { label: "Platform", value: metadata?.platform || null },
    { label: "Screen", value: metadata?.screenSize || null },
    { label: "Viewport", value: metadata?.viewport || null },
    { label: "Entry Path", value: metadata?.entryPath || null },
    { label: "Origin", value: metadata?.origin || null },
    { label: "Referer", value: metadata?.referer || null },
    { label: "User Agent", value: metadata?.userAgent || null },
  ].filter((row) => row.value && String(row.value).trim().length > 0);

  if (!rows.length) return "";

  const renderedRows = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:8px 0;vertical-align:top;font-size:12px;color:#6b7280;width:120px;">${row.label}</td>
        <td style="padding:8px 0;vertical-align:top;font-size:12px;color:#111827;word-break:break-word;">${row.value}</td>
      </tr>`,
    )
    .join("");

  return `
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-top:20px;">
      <h3 style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;font-weight:700;">${title}</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${renderedRows}
      </table>
    </div>`;
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

export function passwordResetTemplate(data: PasswordResetEmailData): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="color:#111827;font-size:20px;margin:0 0 6px;font-weight:800;">Reset your password</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 20px;line-height:1.6;">
      We received a request to reset the password for your Meta Peptides account.
      Use the secure button below to choose a new password.
    </p>

    <div style="background:${DARK_BG};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Account Email</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;color:white;font-weight:600;">${data.customerEmail}</span></td>
        </tr>
        <tr>
          <td style="padding:4px 0;"><span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Action</span></td>
          <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;color:${BRAND_COLOR};font-weight:700;">Password Reset</span></td>
        </tr>
      </table>
    </div>

    <div style="margin:0 0 20px;padding:16px 20px;background:#f8fafc;border-radius:12px;border-left:4px solid ${BRAND_COLOR};">
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
        <strong>What to do next:</strong> click <strong>Reset Password</strong>, wait for the secure page to open,
        then enter your new password there. If you did not request this change, you can safely ignore this email.
      </p>
    </div>

    ${primaryButton("Reset Password", data.resetUrl)}

    <div style="margin-top:20px;padding:16px 20px;background:#fffbeb;border-radius:12px;border-left:4px solid #f59e0b;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.7;">
        For your security, always use the most recent reset email. If the button does not open,
        copy and paste the secure link below into your browser.
      </p>
    </div>

    <div style="margin-top:20px;padding:16px 20px;background:#f8fafc;border-radius:12px;">
      <p style="margin:0 0 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Secure Link</p>
      <p style="margin:0;font-size:12px;line-height:1.7;word-break:break-all;">
        <a href="${data.resetUrl}" style="color:${BRAND_COLOR};text-decoration:underline;">${data.resetUrl}</a>
      </p>
    </div>

    <p style="margin:28px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      Need help? Contact us at <a href="mailto:metapeptides@gmail.com" style="color:${BRAND_COLOR};">metapeptides@gmail.com</a>
    </p>`;

  return {
    subject: "Reset your Meta Peptides password",
    html: baseLayout(content),
  };
}

export function registeredUserWelcomeTemplate(
  data: RegisteredUserEmailData,
): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="color:#111827;font-size:20px;margin:0 0 6px;font-weight:800;">Welcome to Meta Peptides</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px;line-height:1.6;">
      Hi <strong>${data.customerName}</strong>, your account is now active and ready for secure research ordering.
      You signed up using <strong>${data.providerLabel}</strong>.
    </p>

    ${detailsTable([
      { label: "Account Email", value: data.customerEmail },
      { label: "Access Method", value: data.providerLabel, accent: true },
      { label: "Member ID", value: `${data.userId.slice(0, 8)}...` },
      { label: "Created", value: formatDateTimeEmail(data.createdAt) },
    ])}

    <div style="margin:0 0 20px;padding:16px 20px;background:#ecfdf5;border-radius:12px;border-left:4px solid ${BRAND_COLOR};">
      <p style="margin:0;font-size:13px;color:#065f46;line-height:1.7;">
        <strong>You’re in.</strong> You can now browse the catalog, use your member pricing,
        and complete checkout with your registered account.
      </p>
    </div>

    ${primaryButton("Start Shopping", data.shopUrl)}

    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      Need help? Contact us at <a href="mailto:metapeptides@gmail.com" style="color:${BRAND_COLOR};">metapeptides@gmail.com</a>
    </p>`;

  return {
    subject: "Welcome to Meta Peptides",
    html: baseLayout(content),
  };
}

export function registeredUserAdminTemplate(
  data: RegisteredUserEmailData,
): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="color:#111827;font-size:20px;margin:0 0 6px;font-weight:800;">New Registered User</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px;line-height:1.6;">
      A new customer account has been created on Meta Peptides.
    </p>

    ${detailsTable([
      { label: "Email", value: data.customerEmail },
      { label: "Name", value: data.customerName },
      { label: "Access Method", value: data.providerLabel, accent: true },
      { label: "User ID", value: data.userId },
      { label: "Created", value: formatDateTimeEmail(data.createdAt) },
    ])}

    ${metadataBlock("Registration Metadata", data.metadata)}`;

  return {
    subject: `New User Registration: ${data.customerEmail}`,
    html: baseLayout(content),
  };
}

export function guestSessionAdminTemplate(data: GuestSessionEmailData): {
  subject: string;
  html: string;
} {
  const content = `
    <h2 style="color:#111827;font-size:20px;margin:0 0 6px;font-weight:800;">Guest Session Started</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px;line-height:1.6;">
      A visitor chose <strong>Continue as Guest</strong>. No customer email was collected,
      but the metadata below may help identify the session.
    </p>

    ${detailsTable([
      { label: "Session Type", value: "Guest / Anonymous", accent: true },
      { label: "Guest ID", value: data.guestId },
      { label: "Created", value: formatDateTimeEmail(data.createdAt) },
    ])}

    ${metadataBlock("Guest Metadata", data.metadata)}`;

  return {
    subject: `Guest Session Started: ${data.guestId.slice(0, 8)}...`,
    html: baseLayout(content),
  };
}

export type {
  OrderEmailData,
  OrderItem,
  PasswordResetEmailData,
  RegisteredUserEmailData,
  GuestSessionEmailData,
  VisitorMetadata,
};

import { resend, RESEND_FROM_EMAIL, ADMIN_EMAIL } from "./resend";
import {
  orderCreatedCustomerTemplate,
  orderCreatedAdminTemplate,
  orderVerifiedCustomerTemplate,
  type OrderEmailData,
  passwordResetTemplate,
  type PasswordResetEmailData,
  registeredUserWelcomeTemplate,
  registeredUserAdminTemplate,
  guestSessionAdminTemplate,
  type RegisteredUserEmailData,
  type GuestSessionEmailData,
} from "./email-templates";

const normalizeRecipientEmail = (email?: string | null) =>
  String(email || "")
    .trim()
    .toLowerCase();

type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

/**
 * Sends both customer confirmation and admin notification emails
 * when a new order is created. Non-blocking — errors are logged
 * but do not throw to avoid disrupting the checkout flow.
 */
export async function sendOrderCreatedEmails(
  data: OrderEmailData,
): Promise<{ customerSent: boolean; adminSent: boolean }> {
  const result = { customerSent: false, adminSent: false };
  const customerEmail = normalizeRecipientEmail(data.customerEmail);

  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured. Skipping emails.");
    return result;
  }

  if (!customerEmail) {
    console.warn("[Email] Customer email missing. Skipping customer order email.");
  }

  // Email 1 — Customer
  if (customerEmail) {
    try {
      const template = orderCreatedCustomerTemplate(data);
      const { error } = await resend.emails.send({
        from: `Meta Peptides <${RESEND_FROM_EMAIL}>`,
        to: customerEmail,
        subject: template.subject,
        html: template.html,
      });

      if (error) {
        console.error("[Email] Customer order-created email failed:", error);
      } else {
        result.customerSent = true;
        console.log(
          `[Email] Customer order-created email sent to ${customerEmail}`,
        );
      }
    } catch (err) {
      console.error("[Email] Customer order-created email exception:", err);
    }
  }

  // Email 2 — Admin
  try {
    const adminEmail = orderCreatedAdminTemplate(data);
    const { error } = await resend.emails.send({
      from: `Meta Peptides Orders <${RESEND_FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: adminEmail.subject,
      html: adminEmail.html,
    });

    if (error) {
      console.error("[Email] Admin notification email failed:", error);
    } else {
      result.adminSent = true;
      console.log(`[Email] Admin notification email sent to ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error("[Email] Admin notification email exception:", err);
  }

  return result;
}

/**
 * Sends verification/processing confirmation email to the customer
 * when admin changes order status to "processing".
 */
export async function sendOrderVerifiedEmail(
  data: OrderEmailData,
  options?: {
    invoiceAttachment?: EmailAttachment | null;
  },
): Promise<boolean> {
  const customerEmail = normalizeRecipientEmail(data.customerEmail);

  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured. Skipping email.");
    return false;
  }

  if (!customerEmail) {
    console.warn("[Email] Customer email missing. Skipping verification email.");
    return false;
  }

  try {
    const template = orderVerifiedCustomerTemplate(data);
    const attachments = options?.invoiceAttachment
      ? [
          {
            filename: options.invoiceAttachment.filename,
            content: options.invoiceAttachment.content,
            content_type:
              options.invoiceAttachment.contentType || "application/pdf",
          },
        ]
      : undefined;

    const { error } = await resend.emails.send({
      from: `Meta Peptides <${RESEND_FROM_EMAIL}>`,
      to: customerEmail,
      subject: template.subject,
      html: template.html,
      attachments,
    });

    if (error) {
      console.error("[Email] Order-verified email failed:", error);
      return false;
    }

    console.log(
      `[Email] Order-verified email sent to ${customerEmail}`,
    );
    return true;
  } catch (err) {
    console.error("[Email] Order-verified email exception:", err);
    return false;
  }
}

export async function sendPasswordResetEmail(
  data: PasswordResetEmailData,
): Promise<boolean> {
  const customerEmail = normalizeRecipientEmail(data.customerEmail);

  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured. Skipping email.");
    return false;
  }

  if (!customerEmail) {
    console.warn("[Email] Customer email missing. Skipping password reset email.");
    return false;
  }

  try {
    const template = passwordResetTemplate(data);
    const { error } = await resend.emails.send({
      from: `Meta Peptides Security <${RESEND_FROM_EMAIL}>`,
      to: customerEmail,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error("[Email] Password reset email failed:", error);
      return false;
    }

    console.log(`[Email] Password reset email sent to ${customerEmail}`);
    return true;
  } catch (err) {
    console.error("[Email] Password reset email exception:", err);
    return false;
  }
}

export async function sendRegisteredUserEmails(
  data: RegisteredUserEmailData,
): Promise<{ customerSent: boolean; adminSent: boolean }> {
  const result = { customerSent: false, adminSent: false };
  const customerEmail = normalizeRecipientEmail(data.customerEmail);

  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured. Skipping emails.");
    return result;
  }

  if (customerEmail) {
    try {
      const template = registeredUserWelcomeTemplate(data);
      const { error } = await resend.emails.send({
        from: `Meta Peptides <${RESEND_FROM_EMAIL}>`,
        to: customerEmail,
        subject: template.subject,
        html: template.html,
      });

      if (error) {
        console.error("[Email] Registered user welcome email failed:", error);
      } else {
        result.customerSent = true;
        console.log(`[Email] Welcome email sent to ${customerEmail}`);
      }
    } catch (err) {
      console.error("[Email] Registered user welcome email exception:", err);
    }
  } else {
    console.warn("[Email] Customer email missing. Skipping welcome email.");
  }

  try {
    const template = registeredUserAdminTemplate(data);
    const { error } = await resend.emails.send({
      from: `Meta Peptides Accounts <${RESEND_FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error("[Email] Registered user admin email failed:", error);
    } else {
      result.adminSent = true;
      console.log(`[Email] Registered user admin email sent to ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error("[Email] Registered user admin email exception:", err);
  }

  return result;
}

export async function sendGuestSessionAlertEmail(
  data: GuestSessionEmailData,
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured. Skipping email.");
    return false;
  }

  try {
    const template = guestSessionAdminTemplate(data);
    const { error } = await resend.emails.send({
      from: `Meta Peptides Guests <${RESEND_FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error("[Email] Guest session alert email failed:", error);
      return false;
    }

    console.log(`[Email] Guest session alert sent to ${ADMIN_EMAIL}`);
    return true;
  } catch (err) {
    console.error("[Email] Guest session alert exception:", err);
    return false;
  }
}

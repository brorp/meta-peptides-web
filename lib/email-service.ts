import { resend, RESEND_FROM_EMAIL, ADMIN_EMAIL } from "./resend";
import {
  orderCreatedCustomerTemplate,
  orderCreatedAdminTemplate,
  orderVerifiedCustomerTemplate,
  type OrderEmailData,
} from "./email-templates";

/**
 * Sends both customer confirmation and admin notification emails
 * when a new order is created. Non-blocking — errors are logged
 * but do not throw to avoid disrupting the checkout flow.
 */
export async function sendOrderCreatedEmails(
  data: OrderEmailData,
): Promise<{ customerSent: boolean; adminSent: boolean }> {
  const result = { customerSent: false, adminSent: false };

  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured. Skipping emails.");
    return result;
  }

  // Email 1 — Customer
  try {
    const customerEmail = orderCreatedCustomerTemplate(data);
    const { error } = await resend.emails.send({
      from: `Meta Peptides <${RESEND_FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: customerEmail.subject,
      html: customerEmail.html,
    });

    if (error) {
      console.error("[Email] Customer order-created email failed:", error);
    } else {
      result.customerSent = true;
      console.log(
        `[Email] Customer order-created email sent to ${data.customerEmail}`,
      );
    }
  } catch (err) {
    console.error("[Email] Customer order-created email exception:", err);
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
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured. Skipping email.");
    return false;
  }

  try {
    const template = orderVerifiedCustomerTemplate(data);
    const { error } = await resend.emails.send({
      from: `Meta Peptides <${RESEND_FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error("[Email] Order-verified email failed:", error);
      return false;
    }

    console.log(
      `[Email] Order-verified email sent to ${data.customerEmail}`,
    );
    return true;
  } catch (err) {
    console.error("[Email] Order-verified email exception:", err);
    return false;
  }
}

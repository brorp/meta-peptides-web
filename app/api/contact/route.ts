import { successResponse, errorResponse } from "@/lib/api-response";
import { resend, RESEND_FROM_EMAIL, ADMIN_EMAIL } from "@/lib/resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return errorResponse("Missing required laboratory credentials", 400);
    }

    if (!process.env.RESEND_API_KEY) {
      return errorResponse(
        "Contact email service is not configured right now.",
        500,
      );
    }

    const { error } = await resend.emails.send({
      from: `Meta Peptides Contact <${RESEND_FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `🧪 [INQUIRY] - ${name}`,
      html: `
        <div style="background-color: #f9fafb; padding: 40px; font-family: sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; border: 1px solid #10b981; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #414042; padding: 25px; text-align: center;">
              <h1 style="color: #10b981; margin: 0; font-size: 22px; letter-spacing: 4px; font-weight: 900;">METAPEPTIDES</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #111827; font-size: 18px; border-bottom: 2px solid #10b981; padding-bottom: 10px; display: inline-block; text-transform: uppercase; font-weight: 800;">Lab Transmission Received</h2>
              <div style="margin-top: 20px; color: #374151; line-height: 1.6;">
                <p><strong>Name :</strong> ${name}</p>
                <p><strong>Email :</strong> ${email}</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 20px; font-style: italic; border-left: 4px solid #10b981; color: #414042;">
                  "${message}"
                </div>
              </div>
            </div>
            <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 10px; color: #64748b; letter-spacing: 1px;">
              SECURE NODE: METAPEPTIDES-01 | ENCRYPTED TRANSMISSION | ${new Date().getFullYear()}
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Email] Contact inquiry email failed:", error);
      return errorResponse(
        "Transmission Interrupted. Please check your lab connection.",
        500,
        error.message,
      );
    }

    return successResponse(
      null,
      "Transmission sent successfully to the Green-Vault.",
    );
  } catch (error: any) {
    console.error("[Email] Contact inquiry email exception:", error);

    return errorResponse(
      "Transmission Interrupted. Please check your lab connection.",
      500,
      error.message,
    );
  }
}

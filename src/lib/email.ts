import nodemailer from "nodemailer";

interface SubmissionEmailParams {
  fullName: string;
  email: string;
  collegeName: string;
  domain: string;
  submittedAt: Date;
  status: string;
  score: number;
  totalQuestions: number;
  violationCount: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatIst(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function createTransporter() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendSubmissionEmails(
  params: SubmissionEmailParams
): Promise<{ studentSent: boolean; adminSent: boolean; error?: string }> {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn(
      "[KORLANCE Email] SMTP_USER or SMTP_PASS is not configured. Skipping email delivery."
    );
    return {
      studentSent: false,
      adminSent: false,
      error: "SMTP credentials not configured",
    };
  }

  const fromAddress = `"KORLANCE Assessment" <${process.env.SMTP_USER}>`;
  const formattedTime = formatIst(params.submittedAt);
  const safeName = escapeHtml(params.fullName);
  const safeCollege = escapeHtml(params.collegeName);
  const safeEmail = escapeHtml(params.email);
  const safeDomain = escapeHtml(params.domain);
  const isAuto = params.status === "AUTO_SUBMITTED";
  const statusLabel = isAuto ? "Auto-Submitted" : "Submitted Successfully";

  let studentSent = false;
  let adminSent = false;
  const errors: string[] = [];

  const studentHtml = `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background-color:#0B0614;font-family:'Plus Jakarta Sans',Inter,Arial,sans-serif;color:#F8FAFC;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0B0614,#1A0B3B);padding:32px 16px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#130A2A;border:1px solid rgba(196,181,253,0.2);border-radius:20px;overflow:hidden;">
              <tr>
                <td style="padding:28px 32px;background:linear-gradient(90deg,#7C3AED,#3B82F6);text-align:left;">
                  <div style="font-size:22px;font-weight:800;letter-spacing:0.22em;color:#FFFFFF;">KORLANCE</div>
                  <div style="font-size:12px;color:#E0E7FF;margin-top:4px;letter-spacing:0.06em;">HYDERABAD &amp; BENGALURU &bull; TECH TRAINING &amp; PLACEMENT</div>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <h1 style="margin:0 0 12px;font-size:22px;color:#FFFFFF;">Your KORLANCE assessment has been submitted successfully</h1>
                  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#C4B5FD;">
                    Hello <strong>${safeName}</strong>, thank you for completing the KORLANCE Technical Placement Assessment. Your responses have been securely recorded.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(196,181,253,0.16);border-radius:14px;padding:16px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:8px 12px;color:#A78BFA;font-size:13px;width:40%;">Candidate Name</td>
                      <td style="padding:8px 12px;color:#FFFFFF;font-size:14px;font-weight:600;">${safeName}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 12px;color:#A78BFA;font-size:13px;">College</td>
                      <td style="padding:8px 12px;color:#FFFFFF;font-size:14px;font-weight:600;">${safeCollege}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 12px;color:#A78BFA;font-size:13px;">Domain / Program</td>
                      <td style="padding:8px 12px;color:#C4B5FD;font-size:14px;font-weight:600;">${safeDomain}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 12px;color:#A78BFA;font-size:13px;">Submission Time</td>
                      <td style="padding:8px 12px;color:#FFFFFF;font-size:14px;">${formattedTime} IST</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 12px;color:#A78BFA;font-size:13px;">Status</td>
                      <td style="padding:8px 12px;color:#34D399;font-size:14px;font-weight:600;">${statusLabel}</td>
                    </tr>
                  </table>
                  <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#E2E8F0;">
                    Our placement &amp; evaluation team will review your assessment and share the results with you shortly via email or through your college placement cell.
                  </p>
                  <div style="border-top:1px solid rgba(196,181,253,0.15);padding-top:18px;margin-top:18px;font-size:13px;color:#C4B5FD;">
                    Warm regards,<br />
                    <strong style="color:#FFFFFF;">Hari Kumar</strong> &mdash; CEO, Korlance<br />
                    <span style="color:#94A3B8;">Hyderabad &amp; Bengaluru, India</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: params.email,
      subject: "Your KORLANCE assessment has been submitted successfully",
      html: studentHtml,
    });
    studentSent = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[KORLANCE Email] Student email failed:", msg);
    errors.push(`student: ${msg}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (adminEmail) {
    const adminHtml = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:24px;background-color:#0B0614;font-family:Inter,Arial,sans-serif;color:#F8FAFC;">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#130A2A;border:1px solid rgba(124,58,237,0.4);border-radius:16px;padding:24px;">
          <tr>
            <td>
              <h2 style="margin:0 0 12px;color:#C4B5FD;">New KORLANCE Assessment Submission</h2>
              <p style="margin:0 0 16px;color:#CBD5E1;font-size:14px;">A candidate has completed the online assessment:</p>
              <table width="100%" cellpadding="6" cellspacing="0" style="background:rgba(255,255,255,0.03);border-radius:12px;font-size:14px;">
                <tr><td style="color:#94A3B8;">Name:</td><td style="color:#FFFFFF;font-weight:600;">${safeName}</td></tr>
                <tr><td style="color:#94A3B8;">Email:</td><td style="color:#FFFFFF;">${safeEmail}</td></tr>
                <tr><td style="color:#94A3B8;">College:</td><td style="color:#FFFFFF;">${safeCollege}</td></tr>
                <tr><td style="color:#94A3B8;">Domain:</td><td style="color:#C4B5FD;font-weight:600;">${safeDomain}</td></tr>
                <tr><td style="color:#94A3B8;">Submitted At:</td><td style="color:#FFFFFF;">${formattedTime} IST</td></tr>
                <tr><td style="color:#94A3B8;">Status:</td><td style="color:${isAuto ? "#FBBF24" : "#34D399"};font-weight:700;">${escapeHtml(params.status)}</td></tr>
                <tr><td style="color:#94A3B8;">Score:</td><td style="color:#FFFFFF;font-weight:700;">${params.score} / ${params.totalQuestions}</td></tr>
                <tr><td style="color:#94A3B8;">Violations:</td><td style="color:#FFFFFF;">${params.violationCount}</td></tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

    try {
      await transporter.sendMail({
        from: fromAddress,
        to: adminEmail,
        subject: `[KORLANCE] ${params.status}: ${params.fullName} (${params.score}/${params.totalQuestions})`,
        html: adminHtml,
      });
      adminSent = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[KORLANCE Email] Admin email failed:", msg);
      errors.push(`admin: ${msg}`);
    }
  }

  return {
    studentSent,
    adminSent,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

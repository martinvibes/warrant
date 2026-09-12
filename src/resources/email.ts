import { Resend } from "resend";
import { config } from "../config.js";

let client: Resend | undefined;

function resend(): Resend {
  if (!client) {
    if (!config.resendKey) throw new Error("RESEND_API_KEY is not set, so email cannot be sold.");
    client = new Resend(config.resendKey);
  }
  return client;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  providerId: string;
  to: string;
}

export async function sendEmail(req: SendEmailRequest): Promise<SendEmailResult> {
  if (!config.emailFrom) throw new Error("EMAIL_FROM is not set, so there is no address to send from.");
  const { data, error } = await resend().emails.send({
    from: config.emailFrom,
    to: req.to,
    subject: req.subject,
    text: req.body,
  });
  if (error) throw new Error(`the email provider refused the message: ${error.message}`);
  return { providerId: data?.id ?? "", to: req.to };
}

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { DEFAULT_CERTIFICATE_HTML, DEFAULT_CERTIFICATE_SUBJECT } from "../utils/defaultTemplates.js";
import { renderTemplate, DEFAULT_EMAIL_HEADER } from "./emailTemplateService.js";

dotenv.config();

/**
 * Brevo REST API dispatcher with automatic multi-account failover
 */
const getBrevoAccounts = () => {
    const accounts = [];

    // Primary Brevo Account (SRKR ACM)
    const key = (process.env.BREVO_API_KEY || "").trim();
    if (key) {
        accounts.push({
            apiKey: key,
            senderEmail: (process.env.BREVO_SENDER_EMAIL || "srkracmofficial@gmail.com").trim(),
            senderName: (process.env.BREVO_SENDER_NAME || "SRKR ACM Student Chapter").trim(),
        });
    }

    // Secondary Brevo Account (SRKR ACE - Failover)
    const key1 = (process.env.BREVO_API_KEY_1 || "").trim();
    if (key1) {
        accounts.push({
            apiKey: key1,
            senderEmail: (process.env.BREVO_SENDER_EMAIL_1 || "srkraceofficial@gmail.com").trim(),
            senderName: (process.env.BREVO_SENDER_NAME_1 || "SRKR ACM Student Chapter").trim(),
        });
    }

    return accounts;
};

export const sendTemplatedEmail = async ({
    to,
    subject,
    html,
    attachments = []
}) => {
    const accounts = getBrevoAccounts();
    if (accounts.length === 0) {
        throw new Error("No Brevo API keys configured.");
    }

    // Prepare attachments
    const brevoAttachments = [];
    for (const att of attachments) {
        if (att.content && typeof att.content === "string") {
            brevoAttachments.push({
                name: att.filename || "attachment",
                content: att.content
            });
        } else if (att.path) {
            try {
                const buf = await fs.promises.readFile(att.path);
                brevoAttachments.push({
                    name: att.filename || path.basename(att.path),
                    content: buf.toString("base64")
                });
            } catch (err) {
                console.warn(`Could not read attachment from ${att.path}:`, err.message);
            }
        }
    }

    let lastError = null;
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const payload = {
            sender: {
                name: account.senderName,
                email: account.senderEmail
            },
            to: [
                {
                    email: to
                }
            ],
            subject,
            htmlContent: html
        };

        if (brevoAttachments.length > 0) {
            payload.attachment = brevoAttachments;
        }

        try {
            const res = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "api-key": account.apiKey,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                console.log(`✅ Email sent to ${to} via Brevo (Account ${i + 1}: ${account.senderEmail})`);
                return { success: true };
            }

            const errText = await res.text();
            console.warn(`⚠️ Brevo Account ${i + 1} (${account.senderEmail}) returned status ${res.status}: ${errText}`);
            lastError = new Error(`Brevo API Error (${res.status}): ${errText}`);
        } catch (err) {
            console.warn(`⚠️ Brevo Account ${i + 1} (${account.senderEmail}) network failure:`, err.message);
            lastError = err;
        }
    }

    throw lastError || new Error("Failed to send email through all configured Brevo accounts.");
};

export const sendCertificate = async (
    participantName,
    eventName,
    participantEmail,
    pdfPath,
    html,
    subject
) => {
    const fallbackHtml = renderTemplate(DEFAULT_CERTIFICATE_HTML, {
        participantName,
        eventName,
        emailHeader: process.env.EMAIL_HEADER_URL || DEFAULT_EMAIL_HEADER,
    });

    const fallbackSubject = renderTemplate(DEFAULT_CERTIFICATE_SUBJECT, {
        eventName,
    });

    return sendTemplatedEmail({
        to: participantEmail,
        subject: subject || fallbackSubject || `Your Certificate for ${eventName}`,
        html: html || fallbackHtml,
        attachments: [
            {
                filename: `${eventName}-${participantName}.pdf`,
                path: pdfPath
            }
        ]
    });
};

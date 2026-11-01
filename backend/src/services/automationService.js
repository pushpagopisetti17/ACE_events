import fs from "fs/promises";

import Event from "../models/Event.js";

import { updateParticipantStatus } from "./googleSheetService.js";
import { getRecipients, resolveGoogleSheet } from "./recipientService.js";

import { downloadTemplate } from "../utils/downloadTemplate.js";
import { generateCertificate } from "./certificateService.js";
import { sendCertificate } from "./emailService.js";
import { buildEventVariables, renderTemplate } from "./emailTemplateService.js";
import { normalizeEvent } from "../utils/eventHelpers.js";
import {
    DEFAULT_CERTIFICATE_HTML,
    DEFAULT_CERTIFICATE_SUBJECT,
} from "../utils/defaultTemplates.js";

const wasAlreadySent = (participant, sentEmails = [], resendAll = false) => {
    const emailSent = sentEmails.includes(String(participant.email).toLowerCase());
    if (emailSent) return true;
    if (resendAll) return false;
    const sheetSent = participant.certificateSent?.toUpperCase() === "TRUE";
    return sheetSent;
};

// event.postEvent.* (status/totalRecipients/sent/failed/sentEmails) was
// declared on the schema but never kept in sync with the live run — only
// event.automation.* was updated, so anything reading event.postEvent.*
// (e.g. the initial page-load seed in EventDetails) saw stale defaults
// even after a completed run. Mirroring here keeps both in sync without
// changing automation.* itself, which stays the source of truth for the
// live-polling UI.
const syncPostEventFromAutomation = (event) => {
    if (!event.postEvent) return;
    event.postEvent.status = event.automation.status;
    event.postEvent.totalRecipients = event.automation.totalParticipants;
    event.postEvent.sent = event.automation.success;
    event.postEvent.failed = event.automation.failed;
    event.postEvent.sentEmails = event.automation.sentEmails;
};

export const runAutomationService = async (eventId, file, options = {}) => {
    const resendAll = Boolean(options.resendAll === true || options.resendAll === "true");

   const event = await Event.findOneAndUpdate(
    {
        _id: eventId,
        "automation.status": { $ne: "Running" }
    },
    {
        $set: {
            "automation.status": "Running",
            status: "Processing",
            "automation.startedAt": new Date(),
            "automation.completedAt": null
        }
    },
    {
        new: true
    }
);

if (!event) {
    const exists = await Event.exists({ _id: eventId });

    if (exists) {
        throw new Error("Automation is already running.");
    }

    throw new Error("Event not found");
}

    // Normalize event to handle old documents
    const normalized = normalizeEvent(event);
    Object.assign(event, normalized);

    const participantSource = event.postEvent?.participantSource || "googleSheet";

    const participants = await getRecipients({
        source: participantSource,
        event,
        sourceConfig: event.postEvent?.sourceConfig || {
            googleSheetUrl: event.googleSheet?.url,
            sheetId: event.googleSheet?.sheetId,
            sheetName: event.googleSheet?.sheetName,
        },
        file,
    });

    const sentEmails = event.automation.sentEmails || [];

    const pendingParticipants = participants.filter(
        (participant) => !wasAlreadySent(participant, sentEmails, resendAll)
    );

    // If every participant has already received a certificate
    if (pendingParticipants.length === 0) {

        
        event.automation.totalParticipants = participants.length;
        event.automation.processed = participants.length;
        event.automation.success = participants.length;
        event.automation.failed = 0;
        event.automation.currentParticipantIndex = participants.length;
        event.automation.status = "Completed";
        event.status = "Completed";
        event.automation.completedAt = new Date();
        syncPostEventFromAutomation(event);
                await event.save();

        return {
            success: true,
            alreadyCompleted: true,
            message: "All participants have already received certificates.",
            total: participants.length,
            processed: participants.length,
            sent: participants.length,
            failed: 0
        };
    }

    // Count already completed participants
    const alreadyCompleted =
        participants.length - pendingParticipants.length;

    
    event.automation.totalParticipants = participants.length;
    event.automation.processed = alreadyCompleted;
    event.automation.success = alreadyCompleted;
    event.automation.failed = 0;
    event.automation.currentParticipantIndex = alreadyCompleted;

    syncPostEventFromAutomation(event);
                await event.save();

    let templatePath = "";
    let sheetMeta = null;

    if (participantSource === "googleSheet") {
        try {
            sheetMeta = await resolveGoogleSheet(event, {
                googleSheetUrl: event.googleSheet?.url,
                sheetId: event.googleSheet?.sheetId,
                sheetName: event.googleSheet?.sheetName,
            });
        } catch (error) {
            sheetMeta = null;
        }
    }

    const emailHtmlTemplate =
        event.postEvent?.certificateEmailTemplate?.html ||
        event.certificateEmail?.html || 
        DEFAULT_CERTIFICATE_HTML;
        
    const emailSubjectTemplate =
        event.postEvent?.certificateEmailTemplate?.subject ||
        event.certificateEmail?.subject || 
        DEFAULT_CERTIFICATE_SUBJECT;

    try {

        if (!event.template?.url) {
            throw new Error("Certificate template is missing for this event.");
        }

        templatePath = await downloadTemplate(event.template.url);

        for (const participant of pendingParticipants) {
            // Check if automation was stopped or reset by user
            const freshState = await Event.findById(eventId).select("automation.status");
            if (freshState?.automation?.status !== "Running") {
                console.log("Automation halted by user reset/stop.");
                break;
            }

            let pdfPath = "";

            try {

                const rawFontFamily = event.template?.font?.family;
                const safeFontFamily = (!rawFontFamily || /times/i.test(rawFontFamily))
                    ? "Italianno"
                    : rawFontFamily;

                const certConfig = {
                    ...(event.template?.toObject?.() || event.template || {}),
                    font: {
                        family: safeFontFamily,
                        weight: safeFontFamily === "Italianno" ? "Regular" : (event.template?.font?.weight || "Regular"),
                        size: Number(event.template?.font?.size) || 250,
                        color: (!event.template?.font?.color || event.template?.font?.color === "#1c398e") ? "#000000" : event.template.font.color,
                    },
                    namePosition: {
                        x: event.template?.namePosition?.x ?? 2930,
                        y: event.template?.namePosition?.y ?? 1935,
                        align: event.template?.namePosition?.align ?? "center",
                    },
                    padding: Number(event.template?.padding) >= 0 ? Number(event.template.padding) : 20,
                    maxWidth: Number(event.template?.maxWidth) || 4200,
                };

                pdfPath = await generateCertificate(
                    templatePath,
                    participant.name,
                    participant.phone,
                    certConfig
                );

                const variables = buildEventVariables(event, {
                    participantName: participant.name,
                    certificateName: event.eventName,
                });

                await sendCertificate(
                    participant.name,
                    event.eventName,
                    participant.email,
                    pdfPath,
                    renderTemplate(emailHtmlTemplate, variables),
                    renderTemplate(emailSubjectTemplate, variables)
                );

                if (sheetMeta && participant.rowNumber && event.postEvent.participantSource === "googleSheet") {
                    try {
                        await updateParticipantStatus(
                            sheetMeta.sheetId,
                            participant.rowNumber,
                            {
                                certificateSent: "TRUE",
                                status: "Sent",
                                sentAt: new Date().toLocaleString()
                            },
                            sheetMeta.sheetName
                        );
                    } catch (sheetError) {
                        console.error(
                            "Failed to update Google Sheet status:",
                            sheetError.message
                        );
                    }
                }

                const emailKey = String(participant.email).toLowerCase();
                if (!event.automation.sentEmails.includes(emailKey)) {
                    event.automation.sentEmails.push(emailKey);
                }

                event.automation.success++;

                console.log(`${participant.name} completed`);

            } catch (error) {

                console.error(
                    `Failed for ${participant.name}:`,
                    error.message
                );

                event.automation.failed++;

            } finally {

                event.automation.processed++;
                event.automation.currentParticipantIndex =
                    event.automation.processed;

                if (pdfPath) {
                    try {
                        await fs.unlink(pdfPath);
                    } catch (err) {
                        console.error(
                            "Failed to delete PDF:",
                            err.message
                        );
                    }
                }

                syncPostEventFromAutomation(event);
                await event.save();
            }
        }

    } catch (error) {

    event.automation.status = "Failed";
event.status =
    event.automation.success > 0
        ? "Partially Completed"
        : "Failed";

event.automation.completedAt = new Date();

    try {
        syncPostEventFromAutomation(event);
                await event.save();
    } catch (err) {
        console.error("Failed to save automation failure status:", err.message);
    }

    throw error;
} 
    finally {

        if (templatePath) {
            try {
                await fs.unlink(templatePath);
            } catch (err) {
                console.error(
                    "Failed to delete template:",
                    err.message
                );
            }
        }
    }

    const finalCheck = await Event.findById(eventId).select("automation.status");
    if (finalCheck?.automation?.status !== "Running") {
        return {
            success: true,
            stopped: true,
            message: "Automation was stopped and reset by user.",
            total: event.automation.totalParticipants,
            processed: event.automation.processed,
            sent: event.automation.success,
            failed: event.automation.failed
        };
    }

    event.automation.status =
        event.automation.failed > 0
            ? "Failed"
            : "Completed";

    event.status =
        event.automation.failed > 0
            ? "Partially Completed"
            : "Completed";

    event.automation.completedAt = new Date();

  

syncPostEventFromAutomation(event);
                await event.save();

return {
    success: true,
    message: "Automation completed successfully.",
    total: event.automation.totalParticipants,
    processed: event.automation.processed,
    sent: event.automation.success,
    failed: event.automation.failed
};
};

export const resetAutomationService = async (eventId, options = {}) => {
    const event = await Event.findById(eventId);
    if (!event) {
        throw new Error("Event not found");
    }

    if (!event.automation) {
        event.automation = {};
    }

    event.automation.status = "Idle";
    event.automation.totalParticipants = 0;
    event.automation.processed = 0;
    event.automation.success = 0;
    event.automation.failed = 0;
    event.automation.currentParticipantIndex = 0;
    event.automation.startedAt = null;
    event.automation.completedAt = null;
    event.automation.sentEmails = [];

    if (event.postEvent) {
        event.postEvent.status = "Idle";
        event.postEvent.totalRecipients = 0;
        event.postEvent.sent = 0;
        event.postEvent.failed = 0;
        event.postEvent.startedAt = null;
        event.postEvent.completedAt = null;
        event.postEvent.sentEmails = [];
    }

    event.status = "Ready";

    await event.save();
    return event;
};


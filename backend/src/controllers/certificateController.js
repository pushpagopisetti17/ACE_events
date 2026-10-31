import fs from "fs/promises";

import Event from "../models/Event.js";
import { downloadTemplate } from "../utils/downloadTemplate.js";
import { generateCertificate } from "../services/certificateService.js";

export const previewCertificate = async (req, res) => {
    let templatePath = "";
    let pdfPath = "";

    try {
        const { eventId, participantName, templateConfig } = req.body;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found."
            });
        }

        const rawTemplate = templateConfig || event.template?.toObject?.() || event.template || {};
        const rawFamily = rawTemplate.font?.family;
        const safeFamily = (!rawFamily || /times/i.test(rawFamily)) ? "Italianno" : rawFamily;

        const effectiveTemplate = {
            ...rawTemplate,
            font: {
                ...rawTemplate.font,
                family: safeFamily,
                weight: safeFamily === "Italianno" ? "Regular" : (rawTemplate.font?.weight || "Regular"),
                size: Number(rawTemplate.font?.size) || 250,
                color: rawTemplate.font?.color || "#1c398e",
            },
            padding: Number(rawTemplate.padding) >= 0 ? Number(rawTemplate.padding) : 20,
        };

        if (!effectiveTemplate?.url) {
            return res.status(400).json({
                success: false,
                message: "No certificate template configured for this event."
            });
        }

        templatePath = await downloadTemplate(effectiveTemplate.url);

        const nameToUse = participantName || req.user?.name || "Gopisetti Pushpa Latha Naga Lakshmi Devi";

        pdfPath = await generateCertificate(
            templatePath,
            nameToUse,
            "9999999999",
            effectiveTemplate
        );

        // Delete downloaded template
        await fs.unlink(templatePath);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'inline; filename="certificate-preview.pdf"');

        // Send the PDF and delete it AFTER sending
        return res.sendFile(pdfPath, async (err) => {

            if (err) {
                console.error(err);
            }

            try {
                await fs.unlink(pdfPath);
            } catch (error) {
                console.error(
                    "Failed to delete preview PDF:",
                    error.message
                );
            }

        });

    } catch (err) {

        if (templatePath) {
            try {
                await fs.unlink(templatePath);
            } catch {}
        }

        if (pdfPath) {
            try {
                await fs.unlink(pdfPath);
            } catch {}
        }

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
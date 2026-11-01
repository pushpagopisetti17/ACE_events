import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
    PDFDocument,
    StandardFonts,
    rgb,
    degrees
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { optimizeTemplateImage } from "../utils/imageOptimizer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveFontPath = (fileName) => {
    const candidates = [
        path.resolve(__dirname, "..", "fonts", fileName),
        path.resolve(process.cwd(), "src", "fonts", fileName),
        path.resolve(process.cwd(), "backend", "src", "fonts", fileName),
    ];
    for (const p of candidates) {
        if (fsSync.existsSync(p)) return p;
    }
    return candidates[0];
};

const hexToRgb = (hex) => {

    hex = (hex || "#000000").replace("#", "");
    if (hex.toLowerCase() === "1c398e") hex = "000000";
    if (hex.length === 3) {
        hex = hex.split("").map((c) => c + c).join("");
    }

    return rgb(
        parseInt(hex.substring(0, 2), 16) / 255,
        parseInt(hex.substring(2, 4), 16) / 255,
        parseInt(hex.substring(4, 6), 16) / 255
    );
};

const FONT_MAP = {
    TimesRoman: {
        Regular: StandardFonts.TimesRoman,
        Bold: StandardFonts.TimesRomanBold,
        Italic: StandardFonts.TimesRomanItalic,
        BoldItalic: StandardFonts.TimesRomanBoldItalic,
    },
    Helvetica: {
        Regular: StandardFonts.Helvetica,
        Bold: StandardFonts.HelveticaBold,
        Italic: StandardFonts.HelveticaOblique,
        BoldItalic: StandardFonts.HelveticaBoldOblique,
    },
    Courier: {
        Regular: StandardFonts.Courier,
        Bold: StandardFonts.CourierBold,
        Italic: StandardFonts.CourierOblique,
        BoldItalic: StandardFonts.CourierBoldOblique,
    },
};

const CUSTOM_FONTS = {
    Italianno: resolveFontPath("Italianno-Regular.ttf"),
    GreatVibes: resolveFontPath("GreatVibes-Regular.ttf"),
    AlexBrush: resolveFontPath("AlexBrush-Regular.ttf"),
};

const REMOTE_FONT_FALLBACKS = {
    Italianno: "https://raw.githubusercontent.com/google/fonts/main/ofl/italianno/Italianno-Regular.ttf",
    GreatVibes: "https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf",
    AlexBrush: "https://raw.githubusercontent.com/google/fonts/main/ofl/alexbrush/AlexBrush-Regular.ttf",
};

const fontMemoryCache = new Map();

const loadFontBytes = async (family) => {
    if (fontMemoryCache.has(family)) {
        return fontMemoryCache.get(family);
    }

    const localPath = CUSTOM_FONTS[family];
    if (localPath && fsSync.existsSync(localPath)) {
        try {
            const bytes = await fs.readFile(localPath);
            fontMemoryCache.set(family, bytes);
            return bytes;
        } catch (e) {
            console.warn(`Could not read local font file ${localPath}:`, e.message);
        }
    }

    const remoteUrl = REMOTE_FONT_FALLBACKS[family];
    if (remoteUrl) {
        try {
            console.log(`Downloading ${family} font from ${remoteUrl}...`);
            const res = await fetch(remoteUrl);
            if (res.ok) {
                const ab = await res.arrayBuffer();
                const bytes = Buffer.from(ab);
                fontMemoryCache.set(family, bytes);
                if (localPath) {
                    try {
                        await fs.mkdir(path.dirname(localPath), { recursive: true });
                        await fs.writeFile(localPath, bytes);
                    } catch {}
                }
                return bytes;
            }
        } catch (e) {
            console.warn(`Could not fetch remote font for ${family}:`, e.message);
        }
    }

    // If specific font failed, try Italianno fallback
    if (family !== "Italianno") {
        return await loadFontBytes("Italianno");
    }

    throw new Error(`Failed to load font bytes for ${family}`);
};

export const normalizeFontFamily = (family = "") => {
    const clean = String(family || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.includes("great") || clean.includes("vibes")) return "GreatVibes";
    if (clean.includes("alex") || clean.includes("brush")) return "AlexBrush";
    if (clean.includes("helvetica") || clean.includes("arial")) return "Helvetica";
    if (clean.includes("courier") || clean.includes("mono")) return "Courier";
    // Always default to Italianno Light Cursive (never Times Roman)
    return "Italianno";
};

const getPdfFont = (family, weight) => {
    const norm = normalizeFontFamily(family);
    const fonts = FONT_MAP[norm] || FONT_MAP.Helvetica;
    return fonts[weight] || fonts.Regular || StandardFonts.Helvetica;
};

export const generateCertificate = async (
    templatePath,
    participantName,
    participantPhone,
    templateConfig
) => {

    const phone = String(participantPhone);

    // Optimize template image if larger than 800 KB (compresses 5MB PNG -> ~550KB 300DPI JPEG)
    const effectiveTemplatePath = await optimizeTemplateImage(templatePath);
    const imageBytes = await fs.readFile(effectiveTemplatePath);

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Support both JPG and PNG certificate template images
    let embeddedImage;
    try {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
    } catch {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
    }

    // Standard A4 Horizontal (Landscape) format in PDF points (72 pt/in = 297mm x 210mm)
    const A4_WIDTH = 841.89;
    const A4_HEIGHT = 595.28;

    // Fixed, standard A4 Landscape size regardless of device, browser, or screen resolution
    const page = pdfDoc.addPage([841.89, 595.28]);

    const origWidth = embeddedImage.width || A4_WIDTH;
    const origHeight = embeddedImage.height || A4_HEIGHT;
    const imageAspect = origWidth / origHeight;
    const pageAspect = A4_WIDTH / A4_HEIGHT;

    let drawWidth = A4_WIDTH;
    let drawHeight = A4_HEIGHT;
    let drawX = 0;
    let drawY = 0;

    // Preserve original aspect ratio: do not stretch, squeeze, crop, or distort
    if (Math.abs(imageAspect - pageAspect) > 0.005) {
        if (imageAspect > pageAspect) {
            drawWidth = A4_WIDTH;
            drawHeight = A4_WIDTH / imageAspect;
            drawY = (A4_HEIGHT - drawHeight) / 2;
        } else {
            drawHeight = A4_HEIGHT;
            drawWidth = A4_HEIGHT * imageAspect;
            drawX = (A4_WIDTH - drawWidth) / 2;
        }
    }

    page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight
    });

    // Font selection: Always Italianno Light Cursive by default, never Times Roman
    let font;
    const rawFamily = templateConfig?.font?.family;
    const requestedFamily = normalizeFontFamily(rawFamily);

    if (CUSTOM_FONTS[requestedFamily]) {
        try {
            const fontBytes = await loadFontBytes(requestedFamily);
            font = await pdfDoc.embedFont(fontBytes);
        } catch (fontErr) {
            console.error(`Failed to load custom font ${requestedFamily}, trying Italianno fallback:`, fontErr.message);
            try {
                const fallbackBytes = await loadFontBytes("Italianno");
                font = await pdfDoc.embedFont(fallbackBytes);
            } catch (fallbackErr) {
                console.error("Critical: Could not load Italianno font:", fallbackErr.message);
                font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }
        }
    } else {
        font = await pdfDoc.embedFont(
            getPdfFont(
                requestedFamily,
                templateConfig?.font?.weight
            )
        );
    }
    const { width, height } = page.getSize();

    // Map template coordinate system from original image pixels to A4 points
    const scaleX = drawWidth / origWidth;
    const scaleY = drawHeight / origHeight;

    const rawPadding = Number(templateConfig?.padding) >= 0 ? Number(templateConfig.padding) : 20;
    const padding = rawPadding * scaleX;

    const configuredMaxWidth = Number(templateConfig?.maxWidth) || 0;
    const MAX_WIDTH = configuredMaxWidth > 0
        ? Math.min(configuredMaxWidth * scaleX, drawWidth - padding * 2)
        : Math.max(100, (drawWidth - padding * 2) * 0.9);

    const rawFontSize = Number(templateConfig?.font?.size) || 250;
    const fontSize = rawFontSize * scaleX;
    let size = fontSize;

    while (size > 8 && font.widthOfTextAtSize(participantName, size) > MAX_WIDTH) {
       size--;
    }

    const color = hexToRgb(
        templateConfig?.font?.color || "#000000"
    );

    const textWidth = font.widthOfTextAtSize(participantName, size);
    
    const rawPosX = templateConfig?.namePosition?.x ?? (origWidth / 2);
    const rawPosY = templateConfig?.namePosition?.y ?? (origHeight * 0.55);
    const posX = drawX + rawPosX * scaleX;
    const posY = drawY + rawPosY * scaleY;
    const align = templateConfig?.namePosition?.align || "center";

    let x;
    switch (align) {
        case "left":
            x = posX + padding;
            break;
        case "right":
            x = posX - textWidth - padding;
            break;
        case "center":
        default:
            x = posX - textWidth / 2;
    }

    // Clamp horizontal position strictly within certificate bounds
    const minX = drawX + padding;
    const maxX = drawX + drawWidth - padding - textWidth;
    if (maxX >= minX) {
        x = Math.max(minX, Math.min(x, maxX));
    }

    const ascent = size * 0.78;
    let y = (A4_HEIGHT - posY) - ascent;

    const minY = drawY + padding;
    const maxY = drawY + drawHeight - padding - size;
    if (maxY >= minY) {
        y = Math.max(minY, Math.min(y, maxY));
    }

    page.drawText(participantName, {
        x,
        y,
        size,
        font,
        color,
        rotate: degrees(
            Number(templateConfig?.rotation) || 0
        )
    });

    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

    // Clean up temporary optimized image if one was created
    if (effectiveTemplatePath !== templatePath) {
        try {
            await fs.promises.unlink(effectiveTemplatePath);
        } catch {}
    }

    // Create generated folder
    const generatedDir = path.resolve(__dirname, "..", "generated");

    await fs.mkdir(generatedDir, {
        recursive: true
    });
    const safeName =
    participantName
        .normalize("NFKD")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .trim() || "participant";
   const phoneSuffix = participantPhone
    ? String(participantPhone).slice(-6)
    : String(Date.now()).slice(-6);

const outputPath = path.join(
    generatedDir,
    `${safeName}-${phoneSuffix}.pdf`
);
   

    await fs.writeFile(
        outputPath,
        pdfBytes
    );

    return outputPath;
};

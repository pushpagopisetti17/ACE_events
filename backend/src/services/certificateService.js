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

    hex = (hex || "#1c398e").replace("#", "");
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

    // Read Template
    const imageBytes = await fs.readFile(templatePath);

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const pngImage = await pdfDoc.embedPng(imageBytes);

    const page = pdfDoc.addPage([
        pngImage.width,
        pngImage.height
    ]);

    page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height
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

    const padding = Number(templateConfig?.padding) >= 0 ? Number(templateConfig.padding) : 20;
    const configuredMaxWidth = Number(templateConfig?.maxWidth) || 0;
    const MAX_WIDTH = configuredMaxWidth > 0
        ? Math.min(configuredMaxWidth, width - padding * 2)
        : Math.max(100, (width - padding * 2) * 0.9);

    const fontSize = Number(templateConfig?.font?.size) || 250;
    let size = fontSize;

    while (size > 10 && font.widthOfTextAtSize(participantName, size) > MAX_WIDTH) {
       size--;
    }

    const color = hexToRgb(
        templateConfig?.font?.color || "#1c398e"
    );

    // Text Width
    const textWidth =
        font.widthOfTextAtSize(
            participantName,
            size
        );
    
    const posX = templateConfig?.namePosition?.x ?? 2930;
    const posY = templateConfig?.namePosition?.y ?? 1935;
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

    // Clamp horizontal position strictly within padding margins
    const minX = padding;
    const maxX = width - padding - textWidth;
    if (maxX >= minX) {
        x = Math.max(minX, Math.min(x, maxX));
    }

    const ascent = size * 0.8;
    let y = height - posY - ascent;

    // Clamp vertical position strictly within padding margins
    const minY = padding;
    const maxY = height - padding - size;
    if (maxY >= minY) {
        y = Math.max(minY, Math.min(y, maxY));
    }
    page.drawText(participantName, {

        x,
        y,

        size: size,

        font,

        color,

        rotate: degrees(
            Number(templateConfig.rotation) || 0
        )
    });

    const pdfBytes = await pdfDoc.save();

    // Create generated folder
    const generatedDir = path.join(
        process.cwd(),
        "src",
        "generated"
    );

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

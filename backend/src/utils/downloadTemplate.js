import fs from "fs/promises";
import path from "path";
import { optimizeTemplateImage } from "./imageOptimizer.js";

export const getOptimizedTemplateUrl = (url) => {
    if (!url || typeof url !== "string") return url;
    // Check if Cloudinary URL and not already transformed
    if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
        if (!url.includes("/w_") && !url.includes("/q_")) {
            // Apply quality 82 and jpeg conversion without altering width to preserve coordinate mapping
            return url.replace("/image/upload/", "/image/upload/q_82,f_jpg/");
        }
    }
    return url;
};

export const downloadTemplate = async (templateUrl) => {
    try {
        const optimizedUrl = getOptimizedTemplateUrl(templateUrl);
        let response;
        try {
            response = await fetch(optimizedUrl);
            if (!response.ok && optimizedUrl !== templateUrl) {
                response = await fetch(templateUrl);
            }
        } catch {
            response = await fetch(templateUrl);
        }

        if (!response.ok) {
            throw new Error("Failed to download template.");
        }

        // Convert to Buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create temp directory if it doesn't exist
        const tempDir = path.join(
            process.cwd(),
            "src",
            "temp"
        );

        await fs.mkdir(tempDir, {
            recursive: true
        });

        const isJpg = (buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8) || optimizedUrl.includes("f_jpg");
        const ext = isJpg ? "jpg" : "png";
        const fileName = `template-${Date.now()}.${ext}`;

        const filePath = path.join(
            tempDir,
            fileName
        );

        // Save locally
        await fs.writeFile(filePath, buffer);

        // If local file is still large (> 1.2 MB), optimize locally
        const finalPath = await optimizeTemplateImage(filePath);

        return finalPath;

    } catch (error) {
        throw new Error(
            `Failed to download template: ${error.message}`
        );
    }
};
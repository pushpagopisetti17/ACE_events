import { spawnSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";

/**
 * Optimizes a template image to high-quality JPEG (quality=82) without altering native pixel dimensions,
 * preserving original coordinate mapping while reducing file size by ~80% (from ~5MB down to ~1MB).
 */
export const optimizeTemplateImage = async (imagePath) => {
    try {
        if (!imagePath || !fsSync.existsSync(imagePath)) {
            return imagePath;
        }

        const stats = await fs.stat(imagePath);
        // If image is already lightweight (under 1.2 MB), no optimization needed
        if (stats.size <= 1200 * 1024) {
            return imagePath;
        }

        const optPath = imagePath.replace(/\.[^.]+$/, `_opt_${Date.now()}.jpg`);

        const pyScript = [
            "import sys",
            "from PIL import Image",
            "try:",
            "    img = Image.open(sys.argv[1])",
            "    if img.mode in ('RGBA', 'P'):",
            "        img = img.convert('RGB')",
            "    # Preserve native dimensions so coordinate mapping is 100% exact",
            "    img.save(sys.argv[2], 'JPEG', quality=82, optimize=True)",
            "    sys.exit(0)",
            "except Exception as e:",
            "    sys.exit(1)",
        ].join("\n");

        const result = spawnSync("python", ["-c", pyScript, imagePath, optPath], {
            timeout: 15000,
            windowsHide: true,
        });

        if (result.status === 0 && fsSync.existsSync(optPath)) {
            const optStats = await fs.stat(optPath);
            if (optStats.size > 0 && optStats.size < stats.size) {
                console.log(
                    `[TemplateOptimizer] Compressed template: ${(stats.size / 1024 / 1024).toFixed(2)} MB -> ${(optStats.size / 1024).toFixed(2)} KB`
                );
                return optPath;
            }
        }
    } catch (err) {
        console.warn("[TemplateOptimizer] Fallback to original image:", err.message);
    }

    return imagePath;
};

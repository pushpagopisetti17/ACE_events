import express from "express";
import { previewParticipants, runAutomation, resetAutomation } from "../controllers/automationController.js";
import { protect } from "../middleware/authMiddleware.js";
import dataUpload from "../middleware/dataUploadMiddleware.js";
import { validateGoogleSheetColumns } from "../controllers/automationController.js";
import {
    adminOnly
} from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.post(
    "/validate-columns/:eventId",
    protect,
    validateGoogleSheetColumns
);
router.post(
    "/preview/:eventId",
    protect,
    dataUpload.single("file"),
    previewParticipants
);

router.post(
    "/run/:eventId",
    protect,
    dataUpload.single("file"),
    runAutomation
);

router.post(
    "/reset/:eventId",
    protect,
    resetAutomation
);

export default router;
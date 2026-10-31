import Event from "../models/Event.js";
export const uploadTemplate = async (req, res, next) => {

    try {

        if (!req.file) {
            const err = new Error("No template uploaded.");
            err.statusCode = 400;
            throw err;
        }

        res.status(201).json({
            success: true,
            message: "Template uploaded successfully.",
            template: req.file
        });

    } catch (err) {
        next(err);
    }

};

export const updateTemplateSettings = async (req, res, next) => {

    try {

        const event = await Event.findById(req.params.id);

        if (!event) {

            return res.status(404).json({

                success:false,

                message:"Event not found"

            });

        }

        if (!event.template) {
            event.template = {};
        }

        if (req.body.namePosition) {
            if (!event.template.namePosition) event.template.namePosition = {};
            if (req.body.namePosition.x !== undefined) event.template.namePosition.x = Number(req.body.namePosition.x);
            if (req.body.namePosition.y !== undefined) event.template.namePosition.y = Number(req.body.namePosition.y);
            if (req.body.namePosition.align) event.template.namePosition.align = req.body.namePosition.align;
        }

        if (req.body.font) {
            if (!event.template.font) event.template.font = {};
            const requestedFamily = req.body.font.family;
            const safeFamily = (!requestedFamily || /times/i.test(requestedFamily))
                ? "Italianno"
                : requestedFamily;
            event.template.font.family = safeFamily;
            event.template.font.weight = safeFamily === "Italianno" ? "Regular" : (req.body.font.weight || "Regular");
            if (req.body.font.size !== undefined) event.template.font.size = Number(req.body.font.size);
            if (req.body.font.color) event.template.font.color = req.body.font.color;
        }

        if (req.body.rotation !== undefined) {
            event.template.rotation = Number(req.body.rotation) || 0;
        }

        if (req.body.maxWidth !== undefined) {
            event.template.maxWidth = Number(req.body.maxWidth) || 0;
        }

        if (req.body.padding !== undefined) {
            event.template.padding = Number(req.body.padding) || 0;
        }

        event.markModified("template");
        await event.save();

        res.json({

            success:true,

            template:event.template

        });

    }

    catch(err){

        next(err);

    }

};
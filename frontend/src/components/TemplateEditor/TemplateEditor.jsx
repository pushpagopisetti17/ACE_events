import "./TemplateEditor.css";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

import { updateTemplate } from "../../services/templateApi";
import Input from "../ui/Input/Input";
import { FONT_FAMILIES } from "../../constants/fonts";

const FONT_SIZE_PRESETS = [
    { label: "Normal (250px)", size: 250 },
    { label: "Medium (300px)", size: 300 },
    { label: "Large (350px)", size: 350 },
    { label: "X-Large (400px)", size: 400 },
    { label: "Jumbo (450px)", size: 450 },
];

function TemplateEditor({ event, onClose, onSave }) {
    const certificateRef = useRef(null);
    const nameRef = useRef(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [templateSettings, setTemplateSettings] = useState({
        namePosition: {
            x: event.template?.namePosition?.x ?? 2930,
            y: event.template?.namePosition?.y ?? 1935,
            align: event.template?.namePosition?.align ?? "center"
        },
        font: {
            family: event.template?.font?.family || "Italianno",
            weight: event.template?.font?.weight || "Regular",
            size: Number(event.template?.font?.size) || 300,
            color: (!event.template?.font?.color || event.template?.font?.color === "#1c398e") ? "#000000" : event.template.font.color,
        },
        rotation: event.template?.rotation || 0,
        maxWidth: event.template?.maxWidth || 4200,
        padding: event.template?.padding || 20,
    });

    const [dragging, setDragging] = useState(false);
    const [saving, setSaving] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const getScale = () => {
        const img = certificateRef.current?.querySelector("img");
        if (!img?.naturalWidth) return { x: 1, y: 1 };
        return {
            x: img.clientWidth / img.naturalWidth,
            y: img.clientHeight / img.naturalHeight,
        };
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        const rect = certificateRef.current.getBoundingClientRect();
        const scale = getScale();

        setDragging(true);
        setOffset({
            x: e.clientX - rect.left - templateSettings.namePosition.x * scale.x,
            y: e.clientY - rect.top - templateSettings.namePosition.y * scale.y
        });
    };

    const handleMouseMove = (e) => {
        if (!dragging) return;
        const rect = certificateRef.current.getBoundingClientRect();
        const scale = getScale();
        const img = certificateRef.current.querySelector("img");

        let displayX = e.clientX - rect.left - offset.x;
        let displayY = e.clientY - rect.top - offset.y;

        displayX = Math.max(0, Math.min(displayX, img.clientWidth));
        displayY = Math.max(0, Math.min(displayY, img.clientHeight));

        setTemplateSettings((prev) => ({
            ...prev,
            namePosition: {
                ...prev.namePosition,
                x: displayX / scale.x,
                y: displayY / scale.y
            }
        }));
    };

    const handleMouseUp = () => {
        setDragging(false);
    };

    useEffect(() => {
        if (!dragging) return;
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [dragging, offset, templateSettings.namePosition.x, templateSettings.namePosition.y]);

    const handleSave = async () => {
        if (saving) return;
        try {
            setSaving(true);
            await updateTemplate(event._id, templateSettings);
            toast.success("Certificate template & font settings updated successfully.");
            if (onSave) {
                await onSave(templateSettings);
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message ||
                "Failed to save template."
            );
        } finally {
            setSaving(false);
        }
    };

    const updatePosition = (key, value) => {
        setTemplateSettings((prev) => ({
            ...prev,
            namePosition: {
                ...prev.namePosition,
                [key]: key === "align" ? value : Number(value) || 0,
            },
        }));
    };

    const updateFont = (key, value) => {
        setTemplateSettings((prev) => ({
            ...prev,
            font: {
                ...prev.font,
                [key]: key === "size" ? Math.max(10, Number(value) || 0) : value,
            },
        }));
    };

    const scale = imageLoaded ? getScale() : { x: 1, y: 1 };
    const displayX = templateSettings.namePosition.x * scale.x;
    const displayY = templateSettings.namePosition.y * scale.y;
    const maxWidth = (templateSettings.maxWidth || 0) * scale.x;
    const align = templateSettings.namePosition?.align || "center";
    const translateX = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";

    const currentFontSize = templateSettings.font.size || 300;

    return (
        <div className="editor-overlay">
            <div className="editor-modal">
                <div className="editor-header">
                    <div>
                        <h2>Edit Certificate Font & Name Placement</h2>
                        <p className="editor-subtitle">Customize font family, font size, color, and drag participant name directly on the A4 certificate</p>
                    </div>
                </div>

                <div className="editor-layout">
                    {/* Left: Certificate Preview */}
                    <div className="editor-preview-column">
                        <div
                            ref={certificateRef}
                            className="certificate-container"
                        >
                            <img
                                src={event.template.url}
                                alt="Certificate"
                                className="editor-image"
                                onLoad={() => setImageLoaded(true)}
                            />

                            <div
                                ref={nameRef}
                                className="name-placeholder"
                                onMouseDown={handleMouseDown}
                                style={{
                                    left: `${displayX}px`,
                                    top: `${displayY}px`,
                                    fontSize: `${currentFontSize * scale.x}px`,
                                    color: templateSettings.font.color,
                                    fontWeight:
                                        templateSettings.font.family === "Italianno"
                                            ? "normal"
                                            : templateSettings.font.weight === "Bold" ||
                                              templateSettings.font.weight === "BoldItalic"
                                            ? "bold"
                                            : "normal",
                                    fontStyle:
                                        templateSettings.font.weight === "Italic" ||
                                        templateSettings.font.weight === "BoldItalic"
                                            ? "italic"
                                            : "normal",
                                    fontFamily: FONT_FAMILIES[templateSettings.font.family] || FONT_FAMILIES.Italianno,
                                    maxWidth: maxWidth ? `${maxWidth}px` : "90%",
                                    padding: templateSettings.padding ? `${templateSettings.padding * scale.x}px` : "0px",
                                    textAlign: align,
                                    transform: `translateX(${translateX}) rotate(${templateSettings.rotation || 0}deg)`,
                                    whiteSpace: "nowrap",
                                    lineHeight: 1,
                                    letterSpacing: "normal",
                                    textRendering: "geometricPrecision",
                                    cursor: dragging ? "grabbing" : "grab"
                                }}
                            >
                                Gopisetti Pushpa Latha Naga Lakshmi Devi
                            </div>
                        </div>

                        <div className="drag-hint">
                            <span>💡</span>
                            <span><strong>Tip:</strong> Click and drag the participant name on the certificate above to position it freely.</span>
                        </div>
                    </div>

                    {/* Right: Controls Panel */}
                    <div className="editor-controls">
                        {/* Section 1: Font & Typography */}
                        <div className="control-section">
                            <h3 className="section-title">🔤 Font & Typography</h3>

                            <div className="input-group">
                                <label>Font Family</label>
                                <select
                                    value={templateSettings.font.family}
                                    onChange={(e) => {
                                        const newFam = e.target.value;
                                        updateFont("family", newFam);
                                        if (newFam === "Italianno") {
                                            updateFont("weight", "Regular");
                                        }
                                    }}
                                >
                                    <option value="Italianno">Italianno (Light Cursive)</option>
                                    <option value="GreatVibes">Great Vibes (Script)</option>
                                    <option value="AlexBrush">Alex Brush (Calligraphic)</option>
                                    <option value="TimesRoman">Times Roman</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Courier">Courier</option>
                                </select>
                            </div>

                            {/* Font Size with Steppers, Slider & Input */}
                            <div className="input-group">
                                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Font Size</span>
                                    <span style={{ color: "#2563eb", fontWeight: "700" }}>{currentFontSize} px</span>
                                </label>

                                <div className="font-size-row">
                                    <button
                                        type="button"
                                        className="btn-stepper"
                                        onClick={() => updateFont("size", Math.max(50, currentFontSize - 15))}
                                        title="Decrease Font Size"
                                    >
                                        A-
                                    </button>

                                    <input
                                        type="range"
                                        min="100"
                                        max="600"
                                        step="10"
                                        value={currentFontSize}
                                        onChange={(e) => updateFont("size", Number(e.target.value))}
                                        className="font-size-slider"
                                    />

                                    <button
                                        type="button"
                                        className="btn-stepper"
                                        onClick={() => updateFont("size", currentFontSize + 15)}
                                        title="Increase Font Size"
                                    >
                                        A+
                                    </button>

                                    <input
                                        type="number"
                                        className="font-size-input"
                                        value={currentFontSize}
                                        onChange={(e) => updateFont("size", Number(e.target.value))}
                                    />
                                </div>

                                {/* Quick size presets */}
                                <div className="font-size-presets">
                                    {FONT_SIZE_PRESETS.map((preset) => (
                                        <button
                                            key={preset.size}
                                            type="button"
                                            className={`btn-preset ${currentFontSize === preset.size ? "active" : ""}`}
                                            onClick={() => updateFont("size", preset.size)}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="controls-row-2">
                                <div className="input-group">
                                    <label>Font Weight</label>
                                    <select
                                        value={templateSettings.font.weight}
                                        onChange={(e) => updateFont("weight", e.target.value)}
                                    >
                                        <option value="Regular">Regular</option>
                                        <option value="Bold">Bold</option>
                                        <option value="Italic">Italic</option>
                                        <option value="BoldItalic">Bold Italic</option>
                                    </select>
                                </div>

                                <Input
                                    label="Font Color"
                                    type="color"
                                    value={templateSettings.font.color}
                                    onChange={(e) => updateFont("color", e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Section 2: Position & Alignment */}
                        <div className="control-section">
                            <h3 className="section-title">📍 Position & Alignment</h3>

                            <div className="input-group">
                                <label>Alignment</label>
                                <select
                                    value={templateSettings.namePosition.align}
                                    onChange={(e) => updatePosition("align", e.target.value)}
                                >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                </select>
                            </div>

                            <div className="controls-row-2">
                                <Input
                                    label="Position X"
                                    type="number"
                                    value={Math.round(templateSettings.namePosition.x)}
                                    onChange={(e) => updatePosition("x", e.target.value)}
                                />
                                <Input
                                    label="Position Y"
                                    type="number"
                                    value={Math.round(templateSettings.namePosition.y)}
                                    onChange={(e) => updatePosition("y", e.target.value)}
                                />
                            </div>

                            <div className="controls-row-2">
                                <Input
                                    label="Rotation (°)"
                                    type="number"
                                    value={templateSettings.rotation}
                                    onChange={(e) =>
                                        setTemplateSettings((prev) => ({
                                            ...prev,
                                            rotation: Number(e.target.value) || 0,
                                        }))
                                    }
                                />
                                <Input
                                    label="Max Width"
                                    type="number"
                                    value={templateSettings.maxWidth || 0}
                                    onChange={(e) =>
                                        setTemplateSettings((prev) => ({
                                            ...prev,
                                            maxWidth: Number(e.target.value) || 0,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="editor-buttons">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save Font & Placement"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TemplateEditor;

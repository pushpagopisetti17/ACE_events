import React, { useState, useRef, useEffect } from "react";
import { Extension } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { renderTemplate, wrapEmailHtml, extractEmailBody, DEFAULT_EMAIL_HEADER } from "../../utils/templates";
import "./EmailTemplateEditor.css";

const FontSize = Extension.create({
    name: "fontSize",
    addGlobalAttributes() {
        return [
            {
                types: ["textStyle"],
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize || null,
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                },
            },
        ];
    },
});

const editorExtensions = [
    StarterKit,
    Underline,
    TextStyle,
    Color,
    FontSize,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({ openOnClick: false }),
];

function EmailTemplateEditor({
    value = "",
    onChange,
    variables = [],
    previewVariables = {},
    defaultTemplate = "",
    subject = "",
}) {
    // Mode: "visual" (Normal Texting) or "html" (HTML Code Format)
    const [editorMode, setEditorMode] = useState("visual");
    // View mode: "split" (Side-by-side) | "editor" (Full Editor) | "preview" (Full Preview)
    const [viewLayout, setViewLayout] = useState("split");
    // Device preview: "desktop" | "phone"
    const [previewDevice, setPreviewDevice] = useState("desktop");
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef(null);

    // TipTap editor for Normal Texting mode
    const editor = useEditor({
        extensions: editorExtensions,
        content: extractEmailBody(value) || "<p></p>",
        onUpdate: ({ editor: current }) => {
            if (editorMode === "visual") {
                const innerHtml = current.getHTML();
                const wrapped = wrapEmailHtml(innerHtml);
                onChange?.(wrapped);
            }
        },
    });

    // Initialize with default template if empty
    useEffect(() => {
        if (!value && defaultTemplate) {
            onChange?.(defaultTemplate);
            if (editor) {
                editor.commands.setContent(extractEmailBody(defaultTemplate), false);
            }
        }
    }, [defaultTemplate]);

    // Handle switching between Normal Texting and HTML Code format
    const handleModeSwitch = (newMode) => {
        if (newMode === "visual") {
            // When switching to Normal Texting, extract message body cleanly so TipTap doesn't strip or corrupt outer wrapper
            if (editor) {
                const bodyText = extractEmailBody(value);
                editor.commands.setContent(bodyText || "<p></p>", false);
            }
        }
        setEditorMode(newMode);
    };

    // Insert text at cursor in the HTML code textarea
    const insertAtHtmlCursor = (textToInsert) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            onChange?.((value || "") + textToInsert);
            return;
        }

        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const currentVal = value || "";
        const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);

        onChange?.(newVal);

        setTimeout(() => {
            textarea.focus();
            const nextPos = start + textToInsert.length;
            textarea.setSelectionRange(nextPos, nextPos);
        }, 10);
    };

    const handleKeyDownInTextarea = (e) => {
        if (e.key === "Tab") {
            e.preventDefault();
            insertAtHtmlCursor("  ");
        }
    };

    // Variable insertion that works in BOTH Normal Texting and HTML Code
    const handleInsertVariable = (key) => {
        if (!key) return;
        const tag = `{{${key}}}`;
        if (editorMode === "visual" && editor) {
            editor.chain().focus().insertContent(tag).run();
        } else {
            insertAtHtmlCursor(tag);
        }
    };

    const setLink = () => {
        if (!editor) return;
        const url = window.prompt("Enter destination URL (e.g. https://...):");
        if (!url) return;
        editor.chain().focus().setLink({ href: url }).run();
    };

    const insertResponsiveHeader = () => {
        const headerSnippet = `\n<div style="width: 100%; text-align: center; background-color: #f8fafc; line-height: 0;">\n  <img src="{{emailHeader}}" alt="Event Header" style="width: 100%; max-width: 100%; height: auto; display: block; margin: 0 auto; border: 0;" />\n</div>\n`;
        if (editorMode === "visual" && editor) {
            editor.chain().focus().insertContent(headerSnippet).run();
        } else {
            insertAtHtmlCursor(headerSnippet);
        }
    };

    const insertButtonSnippet = () => {
        const buttonSnippet = `\n<div style="text-align: center; margin: 24px 0;">\n  <a href="{{registrationLink}}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Register Here</a>\n</div>\n`;
        if (editorMode === "visual" && editor) {
            editor.chain().focus().insertContent(buttonSnippet).run();
        } else {
            insertAtHtmlCursor(buttonSnippet);
        }
    };

    const insertInfoBoxSnippet = () => {
        const boxSnippet = `\n<div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">\n  <p style="margin: 4px 0;"><strong>📅 Date:</strong> {{eventDate}}</p>\n  <p style="margin: 4px 0;"><strong>⏰ Time:</strong> {{eventTime}}</p>\n  <p style="margin: 4px 0;"><strong>📍 Venue:</strong> {{venue}}</p>\n</div>\n`;
        if (editorMode === "visual" && editor) {
            editor.chain().focus().insertContent(boxSnippet).run();
        } else {
            insertAtHtmlCursor(boxSnippet);
        }
    };

    const insertSocialFooterSnippet = () => {
        const socialSnippet = `\n<div style="background-color: #f9fafb; padding: 20px 28px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center;">\n  <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #374151; letter-spacing: 0.5px; text-transform: uppercase;">Connect with Us</p>\n  <div style="text-align: center; margin-bottom: 12px;">\n    <a href="https://whatsapp.com/channel/0029VaA6ohD2kNFpm5oRiu1B" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 0 10px; text-decoration: none;" title="Join ACE WhatsApp Channel">\n      <img src="https://res.cloudinary.com/swpljbm1/image/upload/v1788868873/whatsapp3-removebg-preview.png" alt="WhatsApp" width="32" height="32" style="width: 32px; height: 32px; vertical-align: middle; border: 0;" />\n    </a>\n    <a href="https://www.youtube.com/@srkreclive8303" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 0 10px; text-decoration: none;" title="Subscribe to YouTube Channel">\n      <img src="https://res.cloudinary.com/swpljbm1/image/upload/v1788865307/youtube-removebg-preview.png" alt="YouTube" width="32" height="32" style="width: 32px; height: 32px; vertical-align: middle; border: 0;" />\n    </a>\n    <a href="https://www.instagram.com/srkr_ace?srtk=MTh5bmg2dWR4eG1qNQ==" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin: 0 10px; text-decoration: none;" title="Follow ACE on Instagram">\n      <img src="https://res.cloudinary.com/swpljbm1/image/upload/v1788863475/instagram.png" alt="Instagram" width="32" height="32" style="width: 32px; height: 32px; vertical-align: middle; border: 0;" />\n    </a>\n  </div>\n  <p style="margin: 0; font-size: 12px; color: #6b7280;">\n    <strong>Association of Computer Engineers (ACE)</strong> &amp; <strong>SRKR ACM Student Chapter</strong>\n  </p>\n</div>\n`;
        if (editorMode === "visual" && editor) {
            editor.chain().focus().insertContent(socialSnippet).run();
        } else {
            insertAtHtmlCursor(socialSnippet);
        }
    };

    const handleCopyHtml = () => {
        navigator.clipboard?.writeText(value || "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLoadDefault = () => {
        if (!defaultTemplate) return;
        if (value && value.trim() && !window.confirm("Replace current email with the default responsive template?")) {
            return;
        }
        onChange?.(defaultTemplate);
        if (editor) {
            editor.commands.setContent(extractEmailBody(defaultTemplate), false);
        }
    };

    const renderedPreviewHtml = renderTemplate(value || "", previewVariables);
    const headerImageUrl = previewVariables.emailHeader || DEFAULT_EMAIL_HEADER;

    return (
        <div className="email-template-editor-root">
            {/* 1. TOP HEADER: FORMAT CHOOSER & VIEW LAYOUT CONTROLS */}
            <div className="editor-mode-banner">
                {/* Format Chooser: Normal Texting vs HTML Code */}
                <div className="mode-toggle-group">
                    <span className="mode-label">Mail Format:</span>
                    <button
                        type="button"
                        className={`mode-btn ${editorMode === "visual" ? "active" : ""}`}
                        onClick={() => handleModeSwitch("visual")}
                        title="Normal typing with Bold, Italic, Underline, and rich formatting"
                    >
                        ✍️ Normal Texting
                    </button>
                    <button
                        type="button"
                        className={`mode-btn ${editorMode === "html" ? "active" : ""}`}
                        onClick={() => handleModeSwitch("html")}
                        title="Direct HTML code place for email design"
                    >
                        &lt;/&gt; HTML Code
                    </button>
                </div>

                {/* View Layout Switcher: Split View / Full Editor / Full Preview */}
                <div className="layout-toggle-group">
                    <button
                        type="button"
                        className={`layout-btn ${viewLayout === "split" ? "active" : ""}`}
                        onClick={() => setViewLayout("split")}
                        title="Side-by-side: Editor on left, Preview on right"
                    >
                        ◫ Split View
                    </button>
                    <button
                        type="button"
                        className={`layout-btn ${viewLayout === "editor" ? "active" : ""}`}
                        onClick={() => setViewLayout("editor")}
                        title="Full Width: Maximum space for typing and HTML code"
                    >
                        ⛶ Full Editor
                    </button>
                    <button
                        type="button"
                        className={`layout-btn ${viewLayout === "preview" ? "active" : ""}`}
                        onClick={() => setViewLayout("preview")}
                        title="Full Width: Maximum space for email preview"
                    >
                        👁️ Full Preview
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="mode-banner-actions">
                    {defaultTemplate && (
                        <button
                            type="button"
                            className="mode-action-btn load-default-btn"
                            onClick={handleLoadDefault}
                            title="Reset / Load default responsive email template"
                        >
                            🔄 Reset / Load Default
                        </button>
                    )}
                    <button
                        type="button"
                        className="mode-action-btn"
                        onClick={handleCopyHtml}
                        title="Copy full HTML to clipboard"
                    >
                        {copied ? "✓ Copied" : "📋 Copy HTML"}
                    </button>
                </div>
            </div>

            {/* 2. TOOLBAR */}
            <div className="editor-unified-toolbar">
                {editorMode === "visual" ? (
                    /* Visual Mode Toolbar */
                    <div className="visual-toolbar-group">
                        <button
                            type="button"
                            className={`tool-btn ${editor?.isActive("bold") ? "active" : ""}`}
                            onClick={() => editor?.chain().focus().toggleBold().run()}
                            title="Bold (Ctrl+B)"
                        >
                            <b>B</b>
                        </button>
                        <button
                            type="button"
                            className={`tool-btn ${editor?.isActive("italic") ? "active" : ""}`}
                            onClick={() => editor?.chain().focus().toggleItalic().run()}
                            title="Italic (Ctrl+I)"
                        >
                            <i>I</i>
                        </button>
                        <button
                            type="button"
                            className={`tool-btn ${editor?.isActive("underline") ? "active" : ""}`}
                            onClick={() => editor?.chain().focus().toggleUnderline().run()}
                            title="Underline (Ctrl+U)"
                        >
                            <u>U</u>
                        </button>
                        <button
                            type="button"
                            className={`tool-btn ${editor?.isActive("heading", { level: 2 }) ? "active" : ""}`}
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                            title="Heading"
                        >
                            <b>H</b>
                        </button>
                        <button
                            type="button"
                            className={`tool-btn ${editor?.isActive("bulletList") ? "active" : ""}`}
                            onClick={() => editor?.chain().focus().toggleBulletList().run()}
                            title="Bullet List"
                        >
                            • List
                        </button>
                        <button
                            type="button"
                            className={`tool-btn ${editor?.isActive({ textAlign: "left" }) ? "active" : ""}`}
                            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
                            title="Align Left"
                        >
                            Left
                        </button>
                        <button
                            type="button"
                            className={`tool-btn ${editor?.isActive({ textAlign: "center" }) ? "active" : ""}`}
                            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
                            title="Align Center"
                        >
                            Center
                        </button>
                        <button
                            type="button"
                            className={`tool-btn ${editor?.isActive({ textAlign: "right" }) ? "active" : ""}`}
                            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
                            title="Align Right"
                        >
                            Right
                        </button>
                        <button
                            type="button"
                            className="tool-btn"
                            onClick={setLink}
                            title="Insert Link"
                        >
                            🔗 Link
                        </button>

                        <select
                            className="tool-select"
                            onChange={(e) =>
                                editor?.chain().focus().setMark("textStyle", { fontSize: e.target.value }).run()
                            }
                            defaultValue=""
                            title="Font Size"
                        >
                            <option value="" disabled>
                                Font size
                            </option>
                            <option value="14px">14px</option>
                            <option value="16px">16px</option>
                            <option value="18px">18px</option>
                            <option value="24px">24px</option>
                            <option value="32px">32px</option>
                        </select>

                        <input
                            type="color"
                            className="tool-color-picker"
                            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
                            title="Text color"
                        />

                        {/* Variables dropdown */}
                        <select
                            className="tool-select var-select"
                            defaultValue=""
                            onChange={(e) => {
                                handleInsertVariable(e.target.value);
                                e.target.value = "";
                            }}
                            title="Insert variable at cursor"
                        >
                            <option value="" disabled>
                                ⚡ Insert Variable
                            </option>
                            {variables.map((variable) => (
                                <option key={variable.key} value={variable.key}>
                                    {`{{${variable.key}}}`} ({variable.label})
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    /* HTML Code Mode Toolbar */
                    <div className="html-toolbar-group">
                        <select
                            className="tool-select var-select"
                            defaultValue=""
                            onChange={(e) => {
                                handleInsertVariable(e.target.value);
                                e.target.value = "";
                            }}
                            title="Insert dynamic tag into HTML code"
                        >
                            <option value="" disabled>
                                ⚡ Insert Variable...
                            </option>
                            {variables.map((variable) => (
                                <option key={variable.key} value={variable.key}>
                                    {`{{${variable.key}}}`} ({variable.label})
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            className="tool-pill-btn"
                            onClick={insertResponsiveHeader}
                            title="Insert mobile-aligned Cloudinary banner header snippet"
                        >
                            🖼️ + Header Banner
                        </button>

                        <button
                            type="button"
                            className="tool-pill-btn"
                            onClick={insertButtonSnippet}
                            title="Insert CTA registration button"
                        >
                            🔘 + Button
                        </button>

                        <button
                            type="button"
                            className="tool-pill-btn"
                            onClick={insertInfoBoxSnippet}
                            title="Insert Event Details info card"
                        >
                            📦 + Info Card
                        </button>

                        <button
                            type="button"
                            className="tool-pill-btn"
                            onClick={insertSocialFooterSnippet}
                            title="Insert social channels footer with WhatsApp, YouTube, and Instagram links"
                        >
                            📱 + Social Links
                        </button>
                    </div>
                )}
            </div>

            {/* 3. WORKSPACE (SPLIT OR FULL WIDTH) */}
            <div className={`editor-split-workspace layout-${viewLayout}`}>
                {/* LEFT / MAIN: Editor (Normal Texting or HTML Code) */}
                {viewLayout !== "preview" && (
                    <div className="workspace-panel editor-panel">
                        <div className="panel-tab-bar">
                            <div className="panel-label">
                                {editorMode === "visual" ? (
                                    <>
                                        <span className="badge-visual">✍️ NORMAL TEXTING</span>
                                        <strong>Visual Email Composer</strong>
                                    </>
                                ) : (
                                    <>
                                        <span className="badge-code">&lt;/&gt; HTML CODE</span>
                                        <strong>HTML Code Place</strong>
                                    </>
                                )}
                            </div>
                            <span className="panel-subtext">
                                {editorMode === "visual" ? "Rich text with Bold, Italic & Underline" : `${(value || "").length} characters`}
                            </span>
                        </div>

                        {/* In Normal Texting mode: display the attached Cloudinary email header banner at top */}
                        {editorMode === "visual" && headerImageUrl && (
                            <div className="visual-header-banner-preview">
                                <div className="banner-preview-tag">
                                    <span>🖼️ Included Email Header Banner (Auto-aligned for phone &amp; desktop):</span>
                                </div>
                                <img
                                    src={headerImageUrl}
                                    alt="Email Header Banner"
                                    className="banner-preview-thumbnail"
                                />
                            </div>
                        )}

                        <div className="editor-content-area">
                            {editorMode === "visual" ? (
                                <EditorContent editor={editor} className="tiptap-editor-shell" />
                            ) : (
                                <textarea
                                    ref={textareaRef}
                                    className="html-code-editor-area"
                                    value={value || ""}
                                    onChange={(e) => onChange?.(e.target.value)}
                                    onKeyDown={handleKeyDownInTextarea}
                                    placeholder="Write or paste your complete HTML email code here..."
                                    spellCheck={false}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* RIGHT / MAIN: Live Email Preview (Desktop & Phone) */}
                {viewLayout !== "editor" && (
                    <div className="workspace-panel preview-panel">
                        <div className="panel-tab-bar preview-tab-bar">
                            <div className="panel-label">
                                <span className="badge-preview">👁️</span>
                                <strong>Live Email Preview</strong>
                            </div>

                            {/* Viewport device switcher */}
                            <div className="device-switcher">
                                <button
                                    type="button"
                                    className={`device-btn ${previewDevice === "desktop" ? "active" : ""}`}
                                    onClick={() => setPreviewDevice("desktop")}
                                    title="Desktop Preview (Full Width)"
                                >
                                    💻 Desktop
                                </button>
                                <button
                                    type="button"
                                    className={`device-btn ${previewDevice === "phone" ? "active" : ""}`}
                                    onClick={() => setPreviewDevice("phone")}
                                    title="Mobile Phone Preview (375px)"
                                >
                                    📱 Phone
                                </button>
                            </div>
                        </div>

                        <div className="preview-scroll-viewport">
                            {previewDevice === "phone" ? (
                                /* Simulated Smartphone Device Frame */
                                <div className="phone-mockup-frame">
                                    <div className="phone-notch">
                                        <div className="phone-speaker" />
                                    </div>
                                    <div className="phone-email-app-bar">
                                        <div className="phone-app-sender">
                                            <div className="avatar-circle">ACE</div>
                                            <div>
                                                <div className="phone-app-name">SRKR ACM &amp; ACE</div>
                                                <div className="phone-app-to">
                                                    To: {previewVariables.recipientName || previewVariables.participantName || "Participant"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="phone-screen-content">
                                        {subject && <div className="preview-subject-line">{subject}</div>}
                                        <div
                                            className="rendered-email-root phone-mode"
                                            dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                /* Desktop Simulated Client Frame */
                                <div className="desktop-preview-frame">
                                    <div className="desktop-email-app-bar">
                                        <div className="desktop-app-sender">
                                            <div className="avatar-circle">ACE</div>
                                            <div>
                                                <div className="sender-line">
                                                    <strong>SRKR ACM Student Chapter &amp; ACE</strong> &lt;srkracmofficial@gmail.com&gt;
                                                </div>
                                                <div className="to-line">
                                                    To: {previewVariables.recipientName || previewVariables.participantName || "Participant"} &lt;participant@example.com&gt;
                                                </div>
                                            </div>
                                        </div>
                                        {subject && <div className="preview-subject-line desktop">{subject}</div>}
                                    </div>
                                    <div className="desktop-screen-content">
                                        <div
                                            className="rendered-email-root desktop-mode"
                                            dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default EmailTemplateEditor;

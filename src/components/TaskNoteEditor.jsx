import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "lowlight";
import Heading from "@tiptap/extension-heading";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import "./TaskNoteEditor.css";

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const DEFAULT_TEMPLATES = {
  empty: {
    name: "Empty Note",
    content: "",
  },
  meeting: {
    name: "Meeting Notes",
    content: `# Meeting Notes

## Attendees
- 

## Agenda
1. 

## Discussion Points
- 

## Action Items
- [ ] 
`,
  },
  project: {
    name: "Project Task",
    content: `# Project Task

## Objective


## Requirements
- 

## Dependencies
- 

## Notes
- 
`,
  },
  bug: {
    name: "Bug Report",
    content: `# Bug Report

## Description


## Steps to Reproduce
1. 

## Expected Behavior


## Actual Behavior


## Additional Notes

`,
  },
};

function TaskNoteEditor({
  initialContent = "",
  onChange,
  onAttachmentAdd,
  onAttachmentRemove,
  readOnly = false,
}) {
  const [selectedTemplate, setSelectedTemplate] = useState("empty");
  const [attachments, setAttachments] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: "Add your notes here...",
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  const handleTemplateChange = (e) => {
    const template = e.target.value;
    setSelectedTemplate(template);
    if (editor) {
      editor.commands.setContent(DEFAULT_TEMPLATES[template].content);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert(`File type ${file.type} is not supported`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      return true;
    });

    const newAttachments = await Promise.all(
      validFiles.map(async (file) => {
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = (e) => {
            resolve({
              id: Date.now() + Math.random(),
              name: file.name,
              type: file.type,
              size: file.size,
              data: e.target.result,
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setAttachments((prev) => [...prev, ...newAttachments]);
    newAttachments.forEach((attachment) => {
      onAttachmentAdd?.(attachment);
    });
  };

  const removeAttachment = (attachmentId) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    onAttachmentRemove?.(attachmentId);
  };

  const insertCollapsibleSection = () => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertContent(
          `
        <details class="collapsible-section">
          <summary>Section Title</summary>
          <div class="collapsible-content">
            Add content here...
          </div>
        </details>
      `
        )
        .run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="task-note-editor">
      {!readOnly && (
        <div className="editor-toolbar">
          <select
            value={selectedTemplate}
            onChange={handleTemplateChange}
            className="template-selector"
          >
            {Object.entries(DEFAULT_TEMPLATES).map(([key, template]) => (
              <option key={key} value={key}>
                {template.name}
              </option>
            ))}
          </select>

          <div className="toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive("bold") ? "is-active" : ""}
              title="Bold"
            >
              <i className="fas fa-bold"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive("italic") ? "is-active" : ""}
              title="Italic"
            >
              <i className="fas fa-italic"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={editor.isActive("code") ? "is-active" : ""}
              title="Inline Code"
            >
              <i className="fas fa-code"></i>
            </button>
          </div>

          <div className="toolbar-group">
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={
                editor.isActive("heading", { level: 1 }) ? "is-active" : ""
              }
              title="Heading 1"
            >
              H1
            </button>
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={
                editor.isActive("heading", { level: 2 }) ? "is-active" : ""
              }
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={
                editor.isActive("heading", { level: 3 }) ? "is-active" : ""
              }
              title="Heading 3"
            >
              H3
            </button>
          </div>

          <div className="toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive("bulletList") ? "is-active" : ""}
              title="Bullet List"
            >
              <i className="fas fa-list-ul"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive("orderedList") ? "is-active" : ""}
              title="Numbered List"
            >
              <i className="fas fa-list-ol"></i>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={editor.isActive("taskList") ? "is-active" : ""}
              title="Task List"
            >
              <i className="fas fa-tasks"></i>
            </button>
          </div>

          <div className="toolbar-group">
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={editor.isActive("codeBlock") ? "is-active" : ""}
              title="Code Block"
            >
              <i className="fas fa-file-code"></i>
            </button>
            <button
              onClick={insertCollapsibleSection}
              title="Add Collapsible Section"
            >
              <i className="fas fa-chevron-down"></i>
            </button>
          </div>

          <div className="toolbar-group">
            <label className="file-upload-button" title="Add Attachment">
              <i className="fas fa-paperclip"></i>
              <input
                type="file"
                multiple
                accept={ALLOWED_FILE_TYPES.join(",")}
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>

            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={isPreviewMode ? "is-active" : ""}
              title={isPreviewMode ? "Edit" : "Preview"}
            >
              <i className={`fas fa-${isPreviewMode ? "edit" : "eye"}`}></i>
            </button>
          </div>
        </div>
      )}

      <div className={`editor-content ${isPreviewMode ? "preview-mode" : ""}`}>
        <EditorContent editor={editor} />
      </div>

      {attachments.length > 0 && (
        <div className="attachments-list">
          <h4>Attachments</h4>
          <div className="attachments-grid">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="attachment-item">
                {attachment.type.startsWith("image/") ? (
                  <img src={attachment.data} alt={attachment.name} />
                ) : (
                  <div className="file-icon">📎</div>
                )}
                <span className="attachment-name">{attachment.name}</span>
                {!readOnly && (
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    className="remove-attachment"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskNoteEditor;

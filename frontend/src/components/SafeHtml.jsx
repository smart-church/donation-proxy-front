import React, { useMemo } from "react";
import DOMPurify from "dompurify";

// Strict allow-list — matches what Quill can produce.
const CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "a",
    "ol", "ul", "li",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "code", "pre", "span",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
  ALLOW_DATA_ATTR: false,
};

// Force safe link attributes.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/**
 * Renders HTML from a trusted source (Quill editors) after sanitising it
 * with DOMPurify. Never render untrusted HTML.
 */
export default function SafeHtml({ html, className, testid }) {
  const clean = useMemo(() => DOMPurify.sanitize(html || "", CONFIG), [html]);
  return (
    <div
      className={className}
      data-testid={testid}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html || "", CONFIG);
}

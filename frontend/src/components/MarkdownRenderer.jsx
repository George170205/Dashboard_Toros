import React from 'react';

/**
 * Parses inline markdown: code, bold+italic, bold, italic.
 */
export function renderInline(text) {
  if (!text) return '';

  // Regex matches: `code`, ***bold-italic***, **bold**, *italic*, _italic_
  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={idx} className="ai-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <strong key={idx} className="ai-bold-text">
          <em>{part.slice(3, -3)}</em>
        </strong>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="ai-bold-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/**
 * Parses markdown into structural blocks: tables, headings, horizontal rules, lists, paragraphs.
 */
export function parseMarkdownBlocks(raw) {
  if (!raw) return [];
  const lines = raw.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal Rule: ---, ***, ___
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2]
      });
      i++;
      continue;
    }

    // Markdown Tables: current line has '|' and next line is a separator '| --- |'
    if (trimmed.includes('|') && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim();
      const isSeparator = /^\|?[\s\-:]+(\|[\s\-:]+)+\|?$/.test(nextTrimmed);
      if (isSeparator) {
        // Headers
        const cleanHeader = trimmed.replace(/^\|/, '').replace(/\|$/, '');
        const headers = cleanHeader.split('|').map((c) => c.trim());

        // Alignment specifiers
        const cleanSep = nextTrimmed.replace(/^\|/, '').replace(/\|$/, '');
        const sepCells = cleanSep.split('|').map((c) => c.trim());
        const alignments = sepCells.map((c) => {
          if (c.startsWith(':') && c.endsWith(':')) return 'center';
          if (c.endsWith(':')) return 'right';
          return 'left';
        });

        i += 2; // Advance past header and separator
        const rows = [];
        while (i < lines.length) {
          const rowLine = lines[i].trim();
          if (!rowLine.includes('|')) break;
          const cleanRow = rowLine.replace(/^\|/, '').replace(/\|$/, '');
          const cells = cleanRow.split('|').map((c) => c.trim());
          rows.push(cells);
          i++;
        }

        blocks.push({
          type: 'table',
          headers,
          alignments,
          rows
        });
        continue;
      }
    }

    // Unordered list: * or -
    if (/^[\*\-]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const itemLine = lines[i].trim();
        const match = itemLine.match(/^[\*\-]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list: 1. 2. etc.
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const itemLine = lines[i].trim();
        const match = itemLine.match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph
    const paragraphLines = [];
    while (i < lines.length) {
      const pLine = lines[i];
      const pTrimmed = pLine.trim();
      if (!pTrimmed) break;
      // Break on start of next structural block
      if (/^(\-{3,}|\*{3,}|_{3,})$/.test(pTrimmed)) break;
      if (/^#{1,6}\s+/.test(pTrimmed)) break;
      if (/^[\*\-]\s+/.test(pTrimmed)) break;
      if (/^\d+\.\s+/.test(pTrimmed)) break;
      if (
        pTrimmed.includes('|') &&
        i + 1 < lines.length &&
        /^\|?[\s\-:]+(\|[\s\-:]+)+\|?$/.test(lines[i + 1].trim())
      ) {
        break;
      }

      paragraphLines.push(pTrimmed);
      i++;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: paragraphLines.join(' ')
      });
    }
  }

  return blocks;
}

export default function MarkdownRenderer({ content, isUser = false }) {
  if (!content) return null;
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`ai-markdown-content ${isUser ? 'user-markdown' : 'bot-markdown'}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'hr':
            return <hr key={idx} className="ai-markdown-hr" />;

          case 'heading': {
            const Tag = `h${Math.min(block.level, 6)}`;
            return (
              <Tag key={idx} className={`ai-markdown-h${block.level}`}>
                {renderInline(block.text)}
              </Tag>
            );
          }

          case 'table':
            return (
              <div key={idx} className="ai-table-responsive-wrapper">
                <table className="ai-markdown-table">
                  <thead>
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          style={{ textAlign: block.alignments[hIdx] || 'left' }}
                        >
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{ textAlign: block.alignments[cIdx] || 'left' }}
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'ul':
            return (
              <ul key={idx} className="ai-markdown-ul">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item)}</li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={idx} className="ai-markdown-ol">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item)}</li>
                ))}
              </ol>
            );

          case 'paragraph':
          default:
            return (
              <p key={idx} className="ai-markdown-p">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
}

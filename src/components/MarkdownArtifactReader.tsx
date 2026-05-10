/**
 * Lightweight in-app artifact reader.
 * Renders headings, bullets, fenced code blocks, horizontal rules, paragraphs.
 * No dependencies. Does not render HTML. Monospace only for code/log blocks.
 */

interface Props {
  content:  string;
  isLog?:   boolean; // full monospace mode for terminal logs
}

export function MarkdownArtifactReader({ content, isLog = false }: Props) {
  if (isLog) {
    return (
      <pre style={{
        margin: 0, padding: "12px 14px",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
        fontSize: 11, lineHeight: 1.65,
        color: "#e5e5e5",
        fontFamily: '"Cascadia Code", "JetBrains Mono", "Consolas", monospace',
      }}>
        {content}
      </pre>
    );
  }

  const lines  = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced code block
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      const fence = trimmed.startsWith("```") ? "```" : "~~~";
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith(fence)) {
        code.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={k++} style={{
          background: "var(--terminal-bg)",
          color: "#e5e5e5",
          padding: "9px 12px",
          borderRadius: 6,
          margin: "10px 0",
          fontSize: 11, lineHeight: 1.6,
          fontFamily: '"Cascadia Code", "JetBrains Mono", "Consolas", monospace',
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          overflowX: "auto",
        }}>
          {code.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      nodes.push(
        <div key={k++} style={{ borderTop: "1px solid var(--border-subtle)", margin: "14px 0" }} />
      );
      i++;
      continue;
    }

    // H1
    if (line.startsWith("# ")) {
      nodes.push(
        <div key={k++} style={{
          fontSize: 16, fontWeight: 700, color: "var(--text-main)",
          margin: "18px 0 8px", lineHeight: 1.3,
          borderBottom: "1px solid var(--border-subtle)", paddingBottom: 6,
        }}>
          {line.slice(2)}
        </div>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      nodes.push(
        <div key={k++} style={{
          fontSize: 13, fontWeight: 700, color: "var(--text-main)",
          margin: "14px 0 6px", lineHeight: 1.3,
        }}>
          {line.slice(3)}
        </div>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      nodes.push(
        <div key={k++} style={{
          fontSize: 12, fontWeight: 650, color: "var(--text-muted)",
          margin: "12px 0 5px", lineHeight: 1.3, letterSpacing: 0.2,
        }}>
          {line.slice(4)}
        </div>
      );
      i++;
      continue;
    }

    // Bullet list — collect consecutive bullet lines
    if (/^[-*+] /.test(line)) {
      const bullets: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        bullets.push(lines[i].replace(/^[-*+] /, ""));
        i++;
      }
      nodes.push(
        <ul key={k++} style={{ margin: "6px 0 8px", paddingLeft: 20 }}>
          {bullets.map((b, bi) => (
            <li key={bi} style={{
              fontSize: 12, color: "var(--text-muted)",
              lineHeight: 1.7, marginBottom: 2,
            }}>
              {b}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Empty line — skip
    if (trimmed === "") {
      i++;
      continue;
    }

    // Plain paragraph
    nodes.push(
      <p key={k++} style={{
        fontSize: 12, color: "var(--text-muted)",
        lineHeight: 1.75, margin: "0 0 8px",
      }}>
        {line}
      </p>
    );
    i++;
  }

  return (
    <div style={{ padding: "12px 14px" }}>
      {nodes.length > 0 ? nodes : (
        <p style={{ fontSize: 12, color: "var(--text-faint)" }}>(empty)</p>
      )}
    </div>
  );
}

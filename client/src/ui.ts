/**
 * The look of the command line.
 *
 * A terminal is the only interface most agents' owners will ever see this
 * through, so it gets the same care as the page: one accent colour, aligned
 * columns, and money in a colour that means money. Colour is dropped when the
 * output is piped or when NO_COLOR is set, because a log file full of escape
 * codes helps nobody.
 */
const plain = !process.stdout.isTTY || process.env.NO_COLOR !== undefined || process.env.TERM === "dumb";

const wrap = (open: string) => (s: string) => (plain ? s : `${open}${s}\x1b[0m`);

export const brass = wrap("\x1b[38;2;201;138;46m");
export const light = wrap("\x1b[38;2;232;181;92m");
export const dim = wrap("\x1b[2m");
export const bold = wrap("\x1b[1m");
export const green = wrap("\x1b[38;2;111;227;165m");
export const red = wrap("\x1b[38;2;229;72;77m");
export const text = wrap("\x1b[38;2;247;246;243m");

/** Visible width, so colour codes do not throw the column alignment off. */
export function width(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

export function pad(s: string, n: number): string {
  return s + " ".repeat(Math.max(0, n - width(s)));
}

export function padStart(s: string, n: number): string {
  return " ".repeat(Math.max(0, n - width(s))) + s;
}

export function out(line = ""): void {
  process.stdout.write(`${line}\n`);
}

/** A title with a rule under it, the same shape every command opens with. */
export function heading(title: string, subtitle?: string): void {
  out();
  out(`  ${bold(text(title))}${subtitle ? dim(`  ${subtitle}`) : ""}`);
  out(`  ${dim("─".repeat(Math.min(62, width(title) + (subtitle ? width(subtitle) + 2 : 0) + 8)))}`);
}

/** A label and a value, with every label in a column. */
export function field(label: string, value: string, labelWidth = 14): void {
  out(`  ${dim(pad(label, labelWidth))} ${value}`);
}

export function ok(line: string): void {
  out(`  ${green("✓")} ${line}`);
}

export function bad(line: string): void {
  out(`  ${red("✗")} ${line}`);
}

export function note(line: string): void {
  out(`  ${dim(line)}`);
}

export function step(n: string, line: string): void {
  out(`  ${brass(n)}  ${line}`);
}

/** A link, underlined where the terminal can, so it reads as one thing. */
export function link(url: string): string {
  return plain ? url : `\x1b[4m${light(url)}\x1b[0m`;
}

/** Rows already coloured; widths are measured on the visible text. */
export function table(rows: string[][], align: ("left" | "right")[] = []): void {
  const widths = rows[0]?.map((_, i) => Math.max(...rows.map((r) => width(r[i] ?? "")))) ?? [];
  for (const row of rows) {
    out(
      `  ${row
        .map((cell, i) => (align[i] === "right" ? padStart(cell, widths[i]!) : pad(cell, widths[i]!)))
        .join("   ")}`.trimEnd(),
    );
  }
}

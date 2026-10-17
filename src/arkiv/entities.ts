export const PROJECT = "sakshi";
export const TYPE_VAULT = "vault";
export const TYPE_BEAT = "beat";
export const TYPE_RELEASE = "release";

export interface AttributeCell {
  type: string;
  value: unknown;
}

export type AttributeMap = Record<string, AttributeCell>;

export function readNumber(attrs: AttributeMap, name: string): number {
  const cell = attrs[name];
  if (!cell) throw new Error(`missing attribute: ${name}`);
  return Number(cell.value);
}

export function readString(attrs: AttributeMap, name: string): string {
  const cell = attrs[name];
  if (!cell) throw new Error(`missing attribute: ${name}`);
  return String(cell.value);
}

export const pmtilesPath: string;

export const layers: {
  toAddOsm: string;
  toDelOsm: string;
  toAddNe: string;
  toDelNe: string;
};

export function getPmtilesUrl(): string;
export function getDataVersion(): Promise<string>;

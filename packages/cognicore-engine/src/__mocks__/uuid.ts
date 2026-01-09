/**
 * Mock for uuid module (ESM compatibility for Jest)
 */

let counter = 0;

export const v4 = (): string => {
  counter++;
  return `mock-uuid-${counter}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export default { v4 };

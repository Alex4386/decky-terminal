export interface CustomKey {
  label: string;
  // Escaped form as entered by the user, decoded with decodeKeySequence()
  send: string;
}

export interface Modifiers {
  ctrl: boolean;
  alt: boolean;
}

const toControlChar = (char: string): string | null => {
  if (char === '?') return '\x7f';
  if (char === ' ') return '\x00';

  const code = char.toUpperCase().charCodeAt(0);
  if (code >= 0x40 && code <= 0x5f) {
    return String.fromCharCode(code - 0x40);
  }

  return null;
};

/**
 * Decode a user-entered key sequence into the bytes sent to the terminal.
 *
 * Supported notations:
 *   ^X            control character (^C, ^[, ^?)
 *   \e            escape (\x1b)
 *   \xHH, \uHHHH  hex escapes
 *   \n \r \t \\   common escapes
 *   \^            literal caret
 */
export const decodeKeySequence = (input: string): string => {
  let output = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '^' && next !== undefined) {
      const control = toControlChar(next);
      if (control !== null) {
        output += control;
        i++;
        continue;
      }
    }

    if (char === '\\' && next !== undefined) {
      switch (next) {
        case 'e': output += '\x1b'; i++; continue;
        case 'n': output += '\n'; i++; continue;
        case 'r': output += '\r'; i++; continue;
        case 't': output += '\t'; i++; continue;
        case '\\': output += '\\'; i++; continue;
        case '^': output += '^'; i++; continue;
        case 'x':
        case 'u': {
          const length = next === 'x' ? 2 : 4;
          const hex = input.slice(i + 2, i + 2 + length);
          if (hex.length === length && /^[0-9a-fA-F]+$/.test(hex)) {
            output += String.fromCharCode(parseInt(hex, 16));
            i += 1 + length;
            continue;
          }
          break;
        }
      }
    }

    output += char;
  }

  return output;
};

export const applyModifiers = (data: string, modifiers: Modifiers): string => {
  let result = data;

  if (modifiers.ctrl && result.length === 1) {
    result = toControlChar(result) ?? result;
  }

  if (modifiers.alt) {
    result = '\x1b' + result;
  }

  return result;
};

export const parseCustomKeys = (value: unknown): CustomKey[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((key): key is CustomKey =>
    typeof key?.label === 'string' && typeof key?.send === 'string'
  );
};

// Shared numeric date mask used by event settings and API token expiry.
export function formatDateDigits(value, maxDigits = 12) {
  const digits = value.replace(/\D/g, "").slice(0, maxDigits);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8), digits.slice(8, 10), digits.slice(10, 12)];
  return parts.reduce((result, part, index) => part ? result + ["", "/", "/", " ", ":"][index] + part : result, "");
}

export function formatDateInput(input, previous, inputType, maxDigits = 12) {
  let digits = input.value.replace(/\D/g, "");
  let digitsBeforeCursor = typeof input.selectionStart === "number"
    ? input.value.slice(0, input.selectionStart).replace(/\D/g, "").length : null;
  if (digitsBeforeCursor !== null && digits === previous.replace(/\D/g, "") &&
      (inputType === "deleteContentBackward" || inputType === "deleteContentForward")) {
    const index = inputType === "deleteContentBackward" ? digitsBeforeCursor - 1 : digitsBeforeCursor;
    if (index >= 0) {
      digits = digits.slice(0, index) + digits.slice(index + 1);
      if (inputType === "deleteContentBackward") digitsBeforeCursor = index;
    }
  }
  const value = formatDateDigits(digits, maxDigits);
  if (digitsBeforeCursor !== null) {
    let cursor = 0;
    let count = 0;
    while (cursor < value.length && count < digitsBeforeCursor) {
      if (/\d/.test(value[cursor])) count += 1;
      cursor += 1;
    }
    requestAnimationFrame(() => input.setSelectionRange(cursor, cursor));
  }
  return value;
}

export function toLocalDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function parseLocalDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

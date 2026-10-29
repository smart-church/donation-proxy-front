export function redirectToNspk(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "qr.nspk.ru" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Некорректная ссылка для пожертвования.");
  }
  window.location.assign(url.href);
}

export function newSubmissionKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  // The key deduplicates submissions; it is not an access credential.
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
    const random = window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint8Array(1))[0] : Math.floor(Math.random() * 256);
    return (Number(c) ^ (random & (15 >> (Number(c) / 4)))).toString(16);
  });
}

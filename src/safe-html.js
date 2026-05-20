class SafeHTML {
  constructor(value) {
    this.value = value;
  }
}

export const safeHTML = (value) => new SafeHTML(value);
export const isSafeHTML = (value) => value instanceof SafeHTML;

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const htmlEntities = /[&<>"']/g;
export const escape = (value) => {
  if (/[&<>"']/.test(value)) {
    return value.replace(htmlEntities, (char) => escapeMap[char]);
  }
  return value;
};

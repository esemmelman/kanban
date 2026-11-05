export function parseDictation(transcript) {
  const text = transcript.trim();
  const markers = [...text.matchAll(/\bcategory\b/gi)];
  const marker = markers.at(-1);
  if (!marker) return {text};
  const category = text.slice(marker.index + marker[0].length)
    .replace(/^[\s:,.!?;–—-]+|[\s.,!?;:]+$/g, '').trim();
  const content = text.slice(0, marker.index).trim();
  if (!category || !content) return {text};
  return {text: content, category};
}

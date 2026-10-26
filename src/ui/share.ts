/** Share a text with the system share sheet, or copy it when sharing is not available. */

export type ShareOutcome = 'shared' | 'copied' | 'failed';

export async function shareOrCopy(text: string): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      // The player closed the share sheet: nothing to do.
      if (e instanceof DOMException && e.name === 'AbortError') return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    // Older browsers: copy through a hidden text field.
    const field = document.createElement('textarea');
    field.value = text;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok ? 'copied' : 'failed';
  }
}

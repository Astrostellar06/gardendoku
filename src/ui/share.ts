/** Share a text with the system share sheet, or copy it when sharing is not available. */
import { isNativeApp, nativeShare } from '../native';

export type ShareOutcome = 'shared' | 'copied' | 'failed';

export async function shareOrCopy(text: string): Promise<ShareOutcome> {
  // The Android web view has no navigator.share: the app uses the native sheet.
  if (isNativeApp) return (await nativeShare(text)) ? 'shared' : 'failed';
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

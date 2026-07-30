export function releaseFinalRenderKey(
  currentKey: string | null,
  completedKey: string,
): string | null {
  return currentKey === completedKey ? null : currentKey
}

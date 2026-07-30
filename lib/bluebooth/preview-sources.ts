export type BoothParticipantRole = 'host' | 'partner'

export function resolvePreviewFeed(
  sourceRole: BoothParticipantRole,
  localRole: BoothParticipantRole,
): 'local' | 'remote' {
  return sourceRole === localRole ? 'local' : 'remote'
}

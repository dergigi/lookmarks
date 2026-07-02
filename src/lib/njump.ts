/** Builds a njump.to URL for any NIP-19 identifier (npub, nevent, note, naddr…). */
export function njumpUrl(id: string): string {
  return `https://njump.to/${id}`;
}

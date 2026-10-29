export async function fetchTrack(
  url: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<ArrayBuffer> {
  const response = await fetcher(url, { signal });
  if (!response.ok) {
    throw new Error(`Track download failed with HTTP ${response.status}.`);
  }

  return response.arrayBuffer();
}

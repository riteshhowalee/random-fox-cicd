export const FOX_API = 'https://randomfox.ca/floof/';

// Restrict third-party URLs before sending them to the browser.
export function validateFox(data) {
  if (!data || typeof data.image !== 'string' || typeof data.link !== 'string') {
    throw new Error('Invalid fox data');
  }
  const image = new URL(data.image);
  const link = new URL(data.link);
  for (const url of [image, link]) {
    if (url.origin !== 'https://randomfox.ca' || url.username || url.password) {
      throw new Error('Unexpected fox URL');
    }
  }
  if (!/^\/images\/\d+\.(jpg|jpeg|png)$/i.test(image.pathname)) {
    throw new Error('Invalid image path');
  }
  return { image: image.href, link: link.href };
}

export async function fetchFox(fetchImpl = fetch) {
  const response = await fetchImpl(FOX_API, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Fox API unavailable');
  return validateFox(await response.json());
}

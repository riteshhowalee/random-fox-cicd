const button = document.querySelector('#new-fox');
const status = document.querySelector('#status');
const image = document.querySelector('#fox-image');
const source = document.querySelector('#source');
const placeholder = document.querySelector('#placeholder');
const card = document.querySelector('.photo-card');
let count = 0;

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const preview = new Image();
    const timeout = setTimeout(() => {
      preview.src = '';
      reject(new Error('Image timed out'));
    }, 12000);
    preview.onload = () => { clearTimeout(timeout); resolve(); };
    preview.onerror = () => { clearTimeout(timeout); reject(new Error('Image unavailable')); };
    preview.src = url;
  });
}

button.addEventListener('click', async () => {
  button.disabled = true;
  card.setAttribute('aria-busy', 'true');
  status.textContent = 'Looking through the woodland…';
  try {
    const response = await fetch('/api/fox', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Fox unavailable');
    const fox = await response.json();
    await preloadImage(fox.image);
    image.src = fox.image;
    image.hidden = false;
    placeholder.hidden = true;
    source.href = fox.link;
    source.hidden = false;
    count += 1;
    document.querySelector('#count').textContent = `NO. ${String(count).padStart(3, '0')}`;
    status.textContent = 'A little wild, just for you. Find another?';
  } catch {
    status.textContent = 'Could not load a fox. Check your connection and try again.';
  } finally {
    button.disabled = false;
    card.setAttribute('aria-busy', 'false');
  }
});

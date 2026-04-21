import './styles.css';

const versionEl = document.getElementById('version')!;
const statusEl = document.getElementById('status')!;
const checkBtn = document.getElementById('check') as HTMLButtonElement;
const updateBtn = document.getElementById('update') as HTMLButtonElement;
const progressEl = document.getElementById('progress')!;

async function init(): Promise<void> {
  const ver = await window.risotron.invoke<string>('app.getVersion');
  versionEl.textContent = `v${ver}`;
}

void init();

checkBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Checking…';
  try {
    const { hasUpdate, latestVersion } = await window.risotron.updates.check();
    if (hasUpdate) {
      statusEl.textContent = `Update available: ${latestVersion ?? ''}`;
      updateBtn.disabled = false;
    } else {
      statusEl.textContent = 'Up to date';
      updateBtn.disabled = true;
    }
  } catch (e) {
    statusEl.textContent = `Check failed: ${String(e)}`;
  }
});

updateBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Downloading…';
  updateBtn.disabled = true;
  try {
    await window.risotron.updates.apply();
    // apply() triggers quitAndInstall — unreachable line
  } catch (e) {
    statusEl.textContent = `Update failed: ${String(e)}`;
  }
});

window.risotron.updates.onProgress(({ percent }) => {
  progressEl.textContent = `${percent.toFixed(0)}%`;
});

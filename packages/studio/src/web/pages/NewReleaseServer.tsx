import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

interface FormState {
  appXDir: string;
  appSlug: string;
  appSlugEdited: boolean;
  ghOwner: string;
  repoName: string;
  repoNameEdited: boolean;
}

interface SuccessState {
  url: string;
  configPath: string;
}

const INITIAL_STATE: FormState = {
  appXDir: '',
  appSlug: '',
  appSlugEdited: false,
  ghOwner: '',
  repoName: '',
  repoNameEdited: false,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferSlugFromPath(appXDir: string): string {
  const parts = appXDir.split('/').filter(Boolean);
  const leaf = parts.at(-1) ?? '';

  return slugify(leaf);
}

export default function NewReleaseServer() {
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const inferredSlug = useMemo(
    () => inferSlugFromPath(state.appXDir),
    [state.appXDir],
  );
  const effectiveSlug = state.appSlugEdited ? state.appSlug : inferredSlug;
  const defaultRepoName = effectiveSlug ? `${effectiveSlug}-releases` : '';
  const effectiveRepoName = state.repoNameEdited
    ? state.repoName
    : defaultRepoName;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onAppXDirChange(e: ChangeEvent<HTMLInputElement>) {
    updateField('appXDir', e.target.value);
  }

  function onAppSlugChange(e: ChangeEvent<HTMLInputElement>) {
    setState((prev) => ({
      ...prev,
      appSlug: e.target.value,
      appSlugEdited: true,
    }));
  }

  function onRepoNameChange(e: ChangeEvent<HTMLInputElement>) {
    setState((prev) => ({
      ...prev,
      repoName: e.target.value,
      repoNameEdited: true,
    }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/release-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appXDir: state.appXDir,
          appSlug: effectiveSlug,
          ghOwner: state.ghOwner,
          repoName: effectiveRepoName,
        }),
      });

      const data = (await response.json()) as
        | SuccessState
        | { error: string; message: string };

      if (!response.ok) {
        if ('error' in data && data.error === 'GH_UNAVAILABLE') {
          setError(`${data.message}. Run \`gh auth login\` then retry`);

          return;
        }

        setError('message' in data ? data.message : 'Create failed.');

        return;
      }

      if ('url' in data) {
        setSuccess(data);
      }
    } catch (err) {
      setError(`Request failed: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <p className="eyebrow">Release</p>
      <h1>New Release Server</h1>
      <form className="placeholder-form" onSubmit={onSubmit}>
        <label>
          App X directory (absolute path)
          <input
            required
            value={state.appXDir}
            onChange={onAppXDirChange}
            placeholder="/Users/you/code/my-app"
          />
        </label>
        <label>
          App slug
          <input
            required
            value={effectiveSlug}
            onChange={onAppSlugChange}
            placeholder="my-app"
          />
        </label>
        <label>
          GitHub owner
          <input
            required
            value={state.ghOwner}
            onChange={(e) => updateField('ghOwner', e.target.value)}
            placeholder="your-github-user"
          />
        </label>
        <label>
          Repository name
          <input
            required
            value={effectiveRepoName}
            onChange={onRepoNameChange}
            placeholder="my-app-releases"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </form>
      {success ? (
        <p className="response" role="status">
          Created <a href={success.url}>{success.url}</a>. Updated{' '}
          {success.configPath}.
        </p>
      ) : null}
      {error ? (
        <p className="response" role="alert">
          Error: {error}
        </p>
      ) : null}
    </section>
  );
}

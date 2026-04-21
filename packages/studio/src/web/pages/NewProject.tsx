import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

type ReleaseProvider = 'github' | 'generic-http';

interface FormState {
  appName: string;
  appSlug: string;
  appSlugEdited: boolean;
  author: string;
  targetDir: string;
  releaseProvider: ReleaseProvider;
  ghOwner: string;
}

interface SuccessState {
  targetDir: string;
  fileCount: number;
}

const INITIAL_STATE: FormState = {
  appName: '',
  appSlug: '',
  appSlugEdited: false,
  author: '',
  targetDir: '',
  releaseProvider: 'github',
  ghOwner: '',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NewProject() {
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const derivedSlug = useMemo(() => slugify(state.appName), [state.appName]);
  const effectiveSlug = state.appSlugEdited ? state.appSlug : derivedSlug;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onAppNameChange(e: ChangeEvent<HTMLInputElement>) {
    updateField('appName', e.target.value);
  }

  function onSlugChange(e: ChangeEvent<HTMLInputElement>) {
    setState((prev) => ({
      ...prev,
      appSlug: e.target.value,
      appSlugEdited: true,
    }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const payload = {
      targetDir: state.targetDir,
      appName: state.appName,
      appSlug: effectiveSlug,
      version: '0.1.0',
      author: state.author,
      releaseProvider: state.releaseProvider,
      ghOwner: state.releaseProvider === 'github' ? state.ghOwner : undefined,
    };

    try {
      const response = await fetch('/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as
        | { targetDir: string; filesCreated: string[] }
        | { error: string; message: string };

      if (!response.ok) {
        const msg = 'message' in data ? data.message : 'Scaffold failed.';
        setError(msg);

        return;
      }

      if ('targetDir' in data) {
        setSuccess({
          targetDir: data.targetDir,
          fileCount: data.filesCreated.length,
        });
      }
    } catch (err) {
      setError(`Request failed: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <p className="eyebrow">Scaffold</p>
      <h1>New Project</h1>
      <form className="placeholder-form" onSubmit={onSubmit}>
        <label>
          App name
          <input
            required
            value={state.appName}
            onChange={onAppNameChange}
            placeholder="My App"
          />
        </label>
        <label>
          App slug
          <input
            required
            value={effectiveSlug}
            onChange={onSlugChange}
            placeholder="my-app"
          />
        </label>
        <label>
          Author
          <input
            required
            value={state.author}
            onChange={(e) => updateField('author', e.target.value)}
            placeholder="Jane Doe"
          />
        </label>
        <label>
          Target directory (absolute path)
          <input
            required
            value={state.targetDir}
            onChange={(e) => updateField('targetDir', e.target.value)}
            placeholder="/Users/you/code/my-app"
          />
        </label>
        <label>
          Release provider
          <select
            value={state.releaseProvider}
            onChange={(e) =>
              updateField('releaseProvider', e.target.value as ReleaseProvider)
            }
          >
            <option value="github">github</option>
            <option value="generic-http">generic-http</option>
          </select>
        </label>
        {state.releaseProvider === 'github' ? (
          <label>
            GitHub owner
            <input
              required
              value={state.ghOwner}
              onChange={(e) => updateField('ghOwner', e.target.value)}
              placeholder="your-github-org"
            />
          </label>
        ) : null}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Scaffolding…' : 'Create'}
        </button>
      </form>
      {success ? (
        <p className="response" role="status">
          Scaffolded {success.fileCount} files at {success.targetDir}.
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

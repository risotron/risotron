import { useState } from 'react';

export default function NewProject() {
  const [responseBody, setResponseBody] = useState('');

  async function createProject() {
    const response = await fetch('/api/scaffold', { method: 'POST' });
    setResponseBody(JSON.stringify(await response.json(), null, 2));
  }

  return (
    <section className="page">
      <p className="eyebrow">Scaffold</p>
      <h1>New Project</h1>
      <form className="placeholder-form">
        <label>
          Project name
          <input disabled placeholder="Brief-5 wires this form" />
        </label>
        <button type="button" onClick={createProject}>
          Create
        </button>
      </form>
      {responseBody ? <pre className="response">{responseBody}</pre> : null}
    </section>
  );
}

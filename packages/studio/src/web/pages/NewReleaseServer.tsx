import { useState } from 'react';

export default function NewReleaseServer() {
  const [responseBody, setResponseBody] = useState('');

  async function createReleaseServer() {
    const response = await fetch('/api/release-server', { method: 'POST' });
    setResponseBody(JSON.stringify(await response.json(), null, 2));
  }

  return (
    <section className="page">
      <p className="eyebrow">Release</p>
      <h1>New Release Server</h1>
      <form className="placeholder-form">
        <label>
          Repository
          <input disabled placeholder="Brief-6 wires this form" />
        </label>
        <button type="button" onClick={createReleaseServer}>
          Create
        </button>
      </form>
      {responseBody ? <pre className="response">{responseBody}</pre> : null}
    </section>
  );
}

import React from 'react';

export default function AccountMemoryView() {
  return (
    <div className="content-card">
      <h2>Account memory and timeline</h2>
      <p>Chronological record of every customer touchpoint with AI summaries to keep teams aligned.</p>
      <ul style={{ paddingLeft: 20, marginTop: 12 }}>
        <li>Meeting notes distilled into action items</li>
        <li>Key decisions and owners captured automatically</li>
        <li>Searchable timeline across mail, calls, and tickets</li>
      </ul>
    </div>
  );
}

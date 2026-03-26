import React from 'react';

export default function EditDetailsView() {
  return (
    <div className="content-card">
      <h2>Edit Details</h2>
      <p>Update workspace details, owner information, and profile-facing settings.</p>
      <ul style={{ paddingLeft: 20, marginTop: 12 }}>
        <li>Update workspace identity</li>
        <li>Edit account owner details</li>
        <li>Review default dashboard preferences</li>
      </ul>
    </div>
  );
}

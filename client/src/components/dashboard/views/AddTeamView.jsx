import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';

export default function AddTeamView() {
  const { authAxios, user } = useAuth();
  const [form, setForm] = useState({
    role: '',
    passkey: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const displayName = user?.name || user?.username || 'Root User';
  const displayEmail = user?.email || '';
  const currentRole = user?.role || 'root';

  const createTeamMutation = useMutation({
    mutationFn: async ({ role, passkey }) => {
      if (!displayEmail) {
        throw new Error('Logged-in user email is missing');
      }

      await authAxios.post('/users/create-role', { email: displayEmail, role, passkey });
    },
    onSuccess: () => {
      setMessage('Team access created successfully for the current root account.');
      setError('');
      setForm({
        role: '',
        passkey: '',
      });
    },
    onError: (err) => {
      const apiMessage = err.response?.data?.message;
      setError(apiMessage || err.message || 'Something went wrong');
      setMessage('');
    },
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    createTeamMutation.mutate(form);
  };

  return (
    <div className="team-create-page">
      <div className="content-card team-create-card">
        <div className="team-create-header">
          <h2>Add Team</h2>
          <p>Create a role-based team access passkey for the currently signed-in root account.</p>
        </div>

        <form className="team-create-form" onSubmit={handleSubmit}>
          <section className="team-owner-panel">
            <div className="team-owner-panel__header">
              <div>
                <h3>Root Account</h3>
                <p>These account details are fixed from the current login session.</p>
              </div>
              <div className="team-owner-panel__badge">{currentRole}</div>
            </div>

            <div className="team-owner-grid">
              <div className="team-owner-card">
                <span>Name</span>
                <strong>{displayName}</strong>
              </div>
              <div className="team-owner-card">
                <span>Email</span>
                <strong>{displayEmail || 'No email available'}</strong>
              </div>
            </div>
          </section>

          <section className="team-access-panel">
            <div className="team-access-panel__header">
              <div>
                <h3>Team Access Setup</h3>
                <p>Add the role and passkey your team member will use for role login.</p>
              </div>
            </div>

            <div className="team-create-grid">
              <label className="team-create-field" htmlFor="team-role">
                <span>Role</span>
                <input
                  id="team-role"
                  name="role"
                  type="text"
                  placeholder="e.g. admin, owner"
                  value={form.role}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="team-create-field" htmlFor="team-passkey">
                <span>Passkey</span>
                <input
                  id="team-passkey"
                  name="passkey"
                  type="password"
                  placeholder="Role-specific passkey"
                  value={form.passkey}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <div className="team-create-note">
              Team members will log in with the root account email shown above and the passkey you create here.
            </div>
          </section>

          {error && <div className="team-create-alert team-create-alert--error">{error}</div>}
          {message && <div className="team-create-alert team-create-alert--success">{message}</div>}

          <div className="team-create-actions">
            <button
              type="submit"
              className="team-create-submit"
              disabled={createTeamMutation.isPending || !displayEmail}
            >
              {createTeamMutation.isPending ? 'Creating team...' : 'Create Team Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

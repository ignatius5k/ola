import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import React, { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';

import { WorkspaceAccessShell } from '../src/auth/WorkspaceAccessShell.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const USER_ID = 'user-analyst-1';
const WORKSPACE_ID = 'workspace-1';
const membership = {
  workspace_id: WORKSPACE_ID,
  user_id: USER_ID,
  role: 'analyst',
  active: true,
  workspaces: { id: WORKSPACE_ID, name: 'Ola Test' }
};

function deferred() {
  let resolve;
  const promise = new Promise(next => {
    resolve = next;
  });
  return { promise, resolve };
}

function queryFor(promise) {
  return {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    then(resolve, reject) {
      return promise.then(resolve, reject);
    }
  };
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }

  assert.fail(message);
}

test('background access checks preserve mounted work and fail closed', async t => {
  const vite = await createServer({
    root: ROOT,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:54321'),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('test-key')
    }
  });
  const { AuthProvider, useAuth } = await vite.ssrLoadModule(
    '/src/auth/AuthProvider.jsx'
  );
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: 'http://localhost/'
  });
  const globalDescriptors = new Map(
    ['window', 'document', 'navigator', 'HTMLElement'].map(name => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name)
    ])
  );

  for (const [name, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement
  })) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value
    });
  }

  const focusTarget = new EventTarget();
  const responses = [Promise.resolve({ data: [membership], error: null })];
  let latestAuth;
  let mounts = 0;
  let unmounts = 0;
  let updateDraft;

  const client = {
    auth: {
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async getSession() {
        return {
          data: { session: { user: { id: USER_ID, email: 'a@example.test' } } },
          error: null
        };
      },
      async signInWithPassword() {
        return { error: null };
      },
      async signOut() {
        return { error: null };
      }
    },
    from(table) {
      assert.equal(table, 'workspace_members');
      const response = responses.shift();
      assert.ok(response, 'a membership response was queued');
      return queryFor(response);
    }
  };

  function DraftWorkspace() {
    const [draft, setDraft] = useState('');
    updateDraft = setDraft;

    useEffect(() => {
      mounts += 1;
      return () => {
        unmounts += 1;
      };
    }, []);

    return React.createElement('input', {
      'aria-label': 'Investigation note',
      value: draft,
      onChange: event => setDraft(event.target.value)
    });
  }

  function GateHarness() {
    latestAuth = useAuth();
    const canRenderWorkspace = latestAuth.membership?.active &&
      ['analyst', 'reviewer'].includes(latestAuth.membership.role);

    if (!canRenderWorkspace) {
      return React.createElement('span', { 'data-status': latestAuth.status });
    }

    return React.createElement(
      WorkspaceAccessShell,
      {
        checking: latestAuth.accessChecking,
        errorMessage: latestAuth.status === 'error' ? latestAuth.authError : '',
        onRetry: latestAuth.refreshMembership,
        onSignOut: latestAuth.signOut
      },
      React.createElement(DraftWorkspace)
    );
  }

  const container = dom.window.document.getElementById('root');
  const root = createRoot(container);
  t.after(async () => {
    await act(async () => root.unmount());
    await vite.close();
    dom.window.close();

    for (const [name, descriptor] of globalDescriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    }
  });

  await act(async () => {
    root.render(
      React.createElement(
        AuthProvider,
        { client, focusTarget },
        React.createElement(GateHarness)
      )
    );
  });

  await waitFor(() => latestAuth?.status === 'ready', 'initial access became ready');
  assert.equal(mounts, 1);
  assert.equal(latestAuth.role, 'analyst');
  assert.equal(latestAuth.actionsAllowed, true);

  await act(async () => {
    updateDraft('Bank receipt checked');
  });

  const successfulRefresh = deferred();
  responses.push(successfulRefresh.promise);
  await act(async () => {
    focusTarget.dispatchEvent(new Event('focus'));
  });

  assert.equal(latestAuth.status, 'ready');
  assert.equal(latestAuth.role, null);
  assert.equal(latestAuth.displayRole, 'analyst');
  assert.equal(latestAuth.actionsAllowed, false);
  assert.equal(
    container.querySelector('.auth-workspace-content').hasAttribute('inert'),
    true
  );
  assert.equal(container.querySelector('input').value, 'Bank receipt checked');
  assert.equal(mounts, 1);
  assert.equal(unmounts, 0);

  await act(async () => {
    successfulRefresh.resolve({ data: [membership], error: null });
    await successfulRefresh.promise;
  });
  await waitFor(() => !latestAuth.accessChecking, 'successful refresh completed');

  assert.equal(container.querySelector('input').value, 'Bank receipt checked');
  assert.equal(mounts, 1);
  assert.equal(unmounts, 0);

  const failedRefresh = deferred();
  responses.push(failedRefresh.promise);
  await act(async () => {
    focusTarget.dispatchEvent(new Event('focus'));
  });
  assert.equal(latestAuth.actionsAllowed, false);

  await act(async () => {
    failedRefresh.resolve({ data: null, error: new Error('offline') });
    await failedRefresh.promise;
  });
  await waitFor(() => latestAuth.status === 'error', 'membership errors fail closed');

  assert.equal(latestAuth.role, null);
  assert.equal(latestAuth.displayRole, 'analyst');
  assert.equal(latestAuth.actionsAllowed, false);
  assert.equal(container.querySelector('input').value, 'Bank receipt checked');
  assert.equal(
    container.querySelector('.auth-workspace-content').hasAttribute('inert'),
    true
  );
  assert.equal(mounts, 1);
  assert.equal(unmounts, 0);

  const retryRefresh = deferred();
  responses.push(retryRefresh.promise);
  const retryButton = [...container.querySelectorAll('button')]
    .find(button => button.textContent === 'Try again');
  assert.ok(retryButton);
  await act(async () => {
    retryButton.click();
  });
  assert.equal(latestAuth.status, 'ready');
  assert.equal(latestAuth.actionsAllowed, false);

  await act(async () => {
    retryRefresh.resolve({ data: [membership], error: null });
    await retryRefresh.promise;
  });
  await waitFor(() => latestAuth.actionsAllowed, 'retry restored verified access');

  assert.equal(latestAuth.role, 'analyst');
  assert.equal(container.querySelector('input').value, 'Bank receipt checked');
  assert.equal(mounts, 1);
  assert.equal(unmounts, 0);

  const revokedRefresh = deferred();
  responses.push(revokedRefresh.promise);
  await act(async () => {
    focusTarget.dispatchEvent(new Event('focus'));
  });
  assert.equal(latestAuth.status, 'ready');
  assert.equal(latestAuth.role, null);
  assert.equal(latestAuth.displayRole, 'analyst');
  assert.equal(latestAuth.actionsAllowed, false);

  await act(async () => {
    revokedRefresh.resolve({ data: [], error: null });
    await revokedRefresh.promise;
  });
  await waitFor(() => latestAuth.status === 'forbidden', 'revoked access was denied');
  assert.equal(latestAuth.role, null);
  assert.equal(unmounts, 1);
});

import React from 'react';

export function WorkspaceAccessShell({
  checking,
  errorMessage = '',
  onRetry,
  onSignOut,
  children
}) {
  const blocked = checking || Boolean(errorMessage);

  return React.createElement(
    'div',
    { className: 'auth-workspace-shell' },
    React.createElement(
      'div',
      {
        className: 'auth-workspace-content',
        inert: blocked ? true : undefined,
        'aria-busy': checking ? 'true' : undefined
      },
      children
    ),
    blocked
      ? React.createElement(
          'div',
          {
            className: 'auth-refresh-guard',
            role: errorMessage ? 'alert' : 'status',
            'aria-live': errorMessage ? 'assertive' : 'polite'
          },
          errorMessage
            ? React.createElement(
                'section',
                { className: 'auth-refresh-card' },
                React.createElement('strong', null, 'Unable to verify access'),
                React.createElement('p', null, errorMessage),
                React.createElement(
                  'div',
                  { className: 'auth-refresh-actions' },
                  React.createElement(
                    'button',
                    { className: 'button primary', type: 'button', onClick: onRetry },
                    'Try again'
                  ),
                  React.createElement(
                    'button',
                    { className: 'button outline', type: 'button', onClick: onSignOut },
                    'Sign out'
                  )
                )
              )
            : 'Checking your workspace access...'
        )
      : null
  );
}

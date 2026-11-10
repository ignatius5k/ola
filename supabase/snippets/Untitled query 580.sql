DELETE FROM auth.sessions
WHERE user_id = (
  SELECT id
  FROM auth.users
  WHERE email = 'bootstrap-analyst@ola.local'
);
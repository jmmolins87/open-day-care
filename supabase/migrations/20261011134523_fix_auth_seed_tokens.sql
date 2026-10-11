-- GoTrue escanea confirmation_token (y el resto de tokens) como string no anulable
-- en /token; los usuarios creados por GoTrue escriben '' y los seeds manuales NULL → 500.
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change = coalesce(email_change, '')
where confirmation_token is null
   or recovery_token is null
   or email_change_token_new is null
   or email_change is null;

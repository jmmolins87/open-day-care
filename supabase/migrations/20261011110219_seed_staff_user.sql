insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'staff@solles.test',
  crypt('staff1234', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object(
    'daycare_id', (select id::text from public.daycares where name = 'Guardería Sala Soles'),
    'role', 'staff',
    'full_name', 'Staff Demo'
  ),
  now(),
  now();

insert into auth.identities (
  id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  'email',
  u.email,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(),
  now(),
  now()
from auth.users u
where u.email = 'staff@solles.test';

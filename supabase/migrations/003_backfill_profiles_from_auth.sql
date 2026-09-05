-- Backfill profiles from auth.users (run once if profiles table is empty or out of sync)
-- App roles live in profiles.user_type — NOT auth.users.role (which stays 'authenticated')

INSERT INTO public.profiles (id, full_name, phone, email, nationality, user_type)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
  u.raw_user_meta_data->>'phone',
  u.email,
  COALESCE(u.raw_user_meta_data->>'nationality', 'Filipino'),
  'tourist'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Verify app roles (this is what the application uses):
-- SELECT id, email, full_name, user_type FROM public.profiles ORDER BY created_at;

-- Promote administrator (replace email):
-- UPDATE public.profiles SET user_type = 'admin' WHERE email = 'your@email.com';

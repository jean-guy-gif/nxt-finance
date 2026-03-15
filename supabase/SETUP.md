# Supabase Setup — NXT Finance

## 1. Create Supabase project

Create a new Supabase project at https://supabase.com/dashboard.
This project is **dedicated to NXT Finance** — do not share with other products.

## 2. Configure environment

Copy your project URL and anon key into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run migrations

In the Supabase SQL Editor, execute in order:

1. `supabase/migrations/001_initial_schema.sql` — tables, enums, indexes, RLS, triggers
2. `supabase/migrations/002_storage_bucket.sql` — receipts storage bucket + policies

## 4. Create demo user in Supabase Auth

Go to **Authentication > Users > Add User**:

- Email: `demo@nxt-finance.fr`
- Password: `demo2024`
- Auto Confirm: Yes

**Copy the UUID** of the created user.

## 5. Update seed with real UUID

In `supabase/seed.sql`, replace all occurrences of:
```
00000000-0000-0000-0000-000000000001
```
with the actual UUID from step 4.

For the demo accountant, either:
- Create a second user (`comptable-demo@nxt-finance.fr` / `demo2024`) and replace `00000000-0000-0000-0000-000000000002`
- Or remove the accountant-related seed rows for initial testing

## 6. Run seed

Execute `supabase/seed.sql` in the SQL Editor.

## 7. Create storage bucket (if not done via migration)

If the migration for the storage bucket fails (some Supabase plans require manual bucket creation):

1. Go to **Storage > New Bucket**
2. Name: `receipts`
3. Public: No
4. Run the RLS policies from `002_storage_bucket.sql` manually

## 8. Verify

1. Start the app: `npm run dev`
2. Navigate to `/login`
3. Click "Accéder à la démo" → should auto-fill demo credentials
4. Click "Se connecter"
5. Dashboard should load with demo data

## Troubleshooting

- **Login fails**: Check that the demo user exists in Auth and the UUID matches the seed
- **Empty dashboard**: Check that the seed SQL ran without errors
- **Storage upload fails**: Check that the `receipts` bucket exists and policies are applied
- **RLS blocks queries**: Check that `agency_members` has a row linking the demo user to the demo agency

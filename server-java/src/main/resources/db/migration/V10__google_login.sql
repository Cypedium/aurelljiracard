-- Sign in with Google (POST /auth/google) and connecting Google to an account (POST /user/google).
-- google_sub is Google's stable user id ("sub" in the ID token); email is from the same token.
-- Users created by Google sign-in have no password, so password login always fails for them.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN email VARCHAR(320);

-- Profile pictures are removed (register form and Google sign-in no longer set one)
ALTER TABLE users DROP COLUMN picture_url;

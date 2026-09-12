-- Drop the phone_hash column added in 0018.
--
-- It held an HMAC of the E.164 number, keyed by a server-side secret, with the
-- intent that a leaked table would not expose a reversible list of phone
-- numbers. That reasoning does not survive contact with this schema: users.phone
-- stores the same number in plaintext, in the same row, because phone login
-- looks up by it. The hash sat next to the value it was meant to protect, so it
-- bought nothing and cost an extra secret to manage.
--
-- Contact matching now compares normalized E.164 numbers against users.phone
-- directly. The privacy posture is unchanged; the moving parts are fewer.
--
-- If leak-resistance is wanted later, the change is to stop storing raw numbers
-- at all -- hash on the way in and look up by hash at login -- not to reinstate
-- a hash alongside the plaintext.

DROP INDEX IF EXISTS idx_users_phone_hash;

ALTER TABLE users DROP COLUMN phone_hash;

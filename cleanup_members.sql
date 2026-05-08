-- Delete in correct order (respecting foreign keys)
DELETE FROM free_coffee_claims;
DELETE FROM member_visits;
DELETE FROM member_special_dates;
DELETE FROM member_feedback;
DELETE FROM member_notifications;
DELETE FROM member_offers;
DELETE FROM members;

-- Verify all deleted
SELECT COUNT(*) FROM members;
SELECT COUNT(*) FROM free_coffee_claims;

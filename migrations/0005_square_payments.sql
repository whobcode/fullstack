-- Square Payment Integration Migration
-- Adds payment tracking fields to character_slot_purchases table

-- Add payment status and Square payment ID columns
ALTER TABLE character_slot_purchases ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE character_slot_purchases ADD COLUMN square_payment_id TEXT;
ALTER TABLE character_slot_purchases ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for payment lookups
CREATE INDEX idx_slot_purchases_payment ON character_slot_purchases(square_payment_id);
CREATE INDEX idx_slot_purchases_status ON character_slot_purchases(payment_status);

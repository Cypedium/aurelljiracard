-- Issue keys are unique across all cards (fails if duplicates already exist)
ALTER TABLE cards ADD CONSTRAINT cards_product_id_key UNIQUE (product_id);

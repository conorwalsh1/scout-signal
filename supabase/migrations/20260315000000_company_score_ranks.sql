ALTER TABLE company_scores
  ADD COLUMN IF NOT EXISTS rank_position INTEGER,
  ADD COLUMN IF NOT EXISTS previous_rank_position INTEGER;

CREATE INDEX IF NOT EXISTS index_company_scores_rank_position
  ON company_scores (rank_position);

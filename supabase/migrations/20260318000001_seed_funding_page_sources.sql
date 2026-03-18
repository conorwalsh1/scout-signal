-- Seed monitored_sources from companies table for funding/news/press monitoring.
-- One active "funding_page" source per company that has a website and no existing mapping.

INSERT INTO monitored_sources (company_id, company_name, company_domain, source_type, source_key, source_url, metadata_json)
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.domain AS company_domain,
  'funding_page' AS source_type,
  'funding:' || COALESCE(c.domain, c.id::text) AS source_key,
  c.website AS source_url,
  jsonb_build_object(
    'seeded_from', 'companies',
    'seeded_at', now(),
    'candidate_paths', ARRAY['/press', '/news', '/newsroom', '/blog', '/press-releases']
  )
FROM companies c
WHERE c.website IS NOT NULL
  AND c.website <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM monitored_sources m
    WHERE m.source_type = 'funding_page'
      AND m.company_id = c.id
  );

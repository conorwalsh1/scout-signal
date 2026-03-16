-- Manual FT1000 website/domain backfill for specific companies
-- Updates only rows where website is currently NULL or empty

UPDATE companies
SET website = 'https://kahoot.com', domain = 'kahoot.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Kahoot!';

UPDATE companies
SET website = 'https://seats.io', domain = 'seats.io', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Seats.io';

UPDATE companies
SET website = 'https://roomraccoon.com', domain = 'roomraccoon.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'RoomRaccoon';

UPDATE companies
SET website = 'https://www.superprof.com', domain = 'superprof.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Superprof';

UPDATE companies
SET website = 'https://www.eversports.com', domain = 'eversports.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Eversports';

UPDATE companies
SET website = 'https://www.novaxia.fr', domain = 'novaxia.fr', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Novaxia';

UPDATE companies
SET website = 'https://opera-energie.com', domain = 'opera-energie.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Opéra Energie';

UPDATE companies
SET website = 'https://froda.se', domain = 'froda.se', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Froda';

UPDATE companies
SET website = 'https://dialecticanet.com', domain = 'dialecticanet.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Dialectica';

UPDATE companies
SET website = 'https://www.gruum.com', domain = 'gruum.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'grüum';

UPDATE companies
SET website = 'https://www.bredbandsval.se', domain = 'bredbandsval.se', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Bredbandsval.se';

UPDATE companies
SET website = 'https://cottonbee.com', domain = 'cottonbee.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'CottonBee';

UPDATE companies
SET website = 'https://rifo-lab.com', domain = 'rifo-lab.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Rifò';

UPDATE companies
SET website = 'https://sinay.ai', domain = 'sinay.ai', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Sinay';

-- Duplicate Eversports row in source data – covered by earlier UPDATE on name

UPDATE companies
SET website = 'https://www.mycomplianceoffice.com', domain = 'mycomplianceoffice.com', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'MyComplianceOffice (MCO)';

UPDATE companies
SET website = 'https://chefstore.nl', domain = 'chefstore.nl', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Chefstore.nl';

UPDATE companies
SET website = 'https://looping.nl', domain = 'looping.nl', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Looping.nl';

UPDATE companies
SET website = 'https://www.wikicasa.it', domain = 'wikicasa.it', updated_at = now()
WHERE (website IS NULL OR website = '')
  AND name = 'Wikicasa';


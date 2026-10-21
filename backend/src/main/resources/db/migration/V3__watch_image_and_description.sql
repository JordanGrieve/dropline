-- The product photograph is served by the front end at /watch.png
-- (frontend/public/CREDITS.md for the licence). One line of copy under
-- the name, as on the reference design.

ALTER TABLE drop ADD COLUMN description TEXT NOT NULL DEFAULT '';

UPDATE drop
   SET image_url   = '/watch.png',
       description = 'Brushed steel case and bracelet, matte black dial, luminous indices. One hundred made, numbered.'
 WHERE id = 1;

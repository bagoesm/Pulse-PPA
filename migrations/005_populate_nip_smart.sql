-- Migration: Smart NIP Assignment with Fuzzy Matching
-- Created: 2026-05-19
-- Description: Intelligently assigns NIP to users using multiple matching strategies

-- ============================================================================
-- PART 1: PREVIEW MODE - Check matches before updating
-- ============================================================================

-- Create temporary table with parsed NIP data
CREATE TEMP TABLE IF NOT EXISTS temp_nip_mapping (
    nip VARCHAR(50),
    nama_nip VARCHAR(255),
    nama_clean VARCHAR(255)
);

-- Insert NIP data with cleaned names (lowercase, no extra spaces)
INSERT INTO temp_nip_mapping (nip, nama_nip, nama_clean) VALUES
('196804112007011001', 'Surachman', LOWER(TRIM('Surachman'))),
('197508191997122001', 'Nurhayati', LOWER(TRIM('Nurhayati'))),
('197609202010011008', 'Iwan Setiawan', LOWER(TRIM('Iwan Setiawan'))),
('198007052025211025', 'Eko Priyanto', LOWER(TRIM('Eko Priyanto'))),
('198012112009021001', 'Chrystianto Budi M.', LOWER(TRIM('Chrystianto Budi M.'))),
('198409172009022001', 'Anita Putri Bungsu', LOWER(TRIM('Anita Putri Bungsu'))),
('198709112023211025', 'Muhammad Ardillah', LOWER(TRIM('Muhammad Ardillah'))),
('198804122010122003', 'Indah Lukitasari', LOWER(TRIM('Indah Lukitasari'))),
('199004142014021002', 'Anugrah Pambudi Raharjo', LOWER(TRIM('Anugrah Pambudi Raharjo'))),
('199111102024211002', 'Ahmat Aris Heriyanto', LOWER(TRIM('Ahmat Aris Heriyanto'))),
('199204062024211001', 'Raden Raditya Satrio Wijanarko', LOWER(TRIM('Raden Raditya Satrio Wijanarko'))),
('199207282025211021', 'Amad Yusuf', LOWER(TRIM('Amad Yusuf'))),
('199309122020122013', 'Dian Surida', LOWER(TRIM('Dian Surida'))),
('199402182024212004', 'Siti Julpah Hartati', LOWER(TRIM('Siti Julpah Hartati'))),
('199403122025061003', 'Tri Ako Nugroho', LOWER(TRIM('Tri Ako Nugroho'))),
('199403132025061003', 'Adhika Ridwan S.', LOWER(TRIM('Adhika Ridwan S.'))),
('199407242024212002', 'Nadhira Auliarachim', LOWER(TRIM('Nadhira Auliarachim'))),
('199408102024212003', 'Rachmah Dewi Kusumah', LOWER(TRIM('Rachmah Dewi Kusumah'))),
('199503022024212005', 'Ninda Nur Amaliya', LOWER(TRIM('Ninda Nur Amaliya'))),
('199503052024211001', 'Ridwan Baehaqi', LOWER(TRIM('Ridwan Baehaqi'))),
('199505132024211002', 'Riki Ahmad Fauji', LOWER(TRIM('Riki Ahmad Fauji'))),
('199506012024212004', 'Ane Wahyuni', LOWER(TRIM('Ane Wahyuni'))),
('199507012020121007', 'Restu Nayulio', LOWER(TRIM('Restu Nayulio'))),
('199510022024212004', 'Ismi Nadiya', LOWER(TRIM('Ismi Nadiya'))),
('199511252024212005', 'Bella Pitria', LOWER(TRIM('Bella Pitria'))),
('199603052025062005', 'Hesty Hatnawati Rati', LOWER(TRIM('Hesty Hatnawati Rati'))),
('199604082025211036', 'Ryan Sofyan', LOWER(TRIM('Ryan Sofyan'))),
('199704132024211001', 'Tendi', LOWER(TRIM('Tendi'))),
('199612122024212003', 'Poppy Lestari', LOWER(TRIM('Poppy Lestari'))),
('199701122025061004', 'Yanuar Yusuf', LOWER(TRIM('Yanuar Yusuf'))),
('199704132024211001', 'Bastian Al Ravisi', LOWER(TRIM('Bastian Al Ravisi'))),
('199712102024211001', 'Rahmat Deswanto', LOWER(TRIM('Rahmat Deswanto'))),
('199801232024211002', 'Divi Tegar H.', LOWER(TRIM('Divi Tegar H.'))),
('199807152022032012', 'Yuli Rosa R.', LOWER(TRIM('Yuli Rosa R.'))),
('199808012025061002', 'Bagoes Muliawan', LOWER(TRIM('Bagoes Muliawan'))),
('199905072024212002', 'Ghina Fauziah', LOWER(TRIM('Ghina Fauziah'))),
('199905072024212002', 'Wida Ningsih', LOWER(TRIM('Wida Ningsih'))),
('200004292025062006', 'Fresya Maharani S.', LOWER(TRIM('Fresya Maharani S.'))),
('200005182025062008', 'Naomi Anastasya S.', LOWER(TRIM('Naomi Anastasya S.'))),
('200111242025062010', 'Debby Varera R', LOWER(TRIM('Debby Varera R'))),
('1', 'Nana Supriatna', LOWER(TRIM('Nana Supriatna'))),
('2', 'Asep Janudin', LOWER(TRIM('Asep Janudin'))),
('3', 'Endis Muhamad Yudhistira', LOWER(TRIM('Endis Muhamad Yudhistira'))),
('4', 'Yudhistira Iriana Putra', LOWER(TRIM('Yudhistira Iriana Putra'))),
('5', 'Arief Rahman', LOWER(TRIM('Arief Rahman'))),
('6', 'Zulkipli', LOWER(TRIM('Zulkipli'))),
('7', 'Debby Prasetya', LOWER(TRIM('Debby Prasetya')));

-- ============================================================================
-- PREVIEW: Show potential matches
-- ============================================================================
-- Review this output carefully before running the actual updates!

WITH matched_users AS (
    SELECT DISTINCT ON (p.id)
        p.id,
        p.name AS db_name,
        p.email,
        p.nip AS current_nip,
        t.nama_nip AS nip_name,
        t.nip AS new_nip,
        CASE 
            -- Strategy 1: Exact match (best)
            WHEN LOWER(TRIM(p.name)) = t.nama_clean THEN 1
            -- Strategy 2: DB name contains NIP name (handles titles like S.Kom)
            WHEN LOWER(TRIM(p.name)) LIKE '%' || t.nama_clean || '%' THEN 2
            -- Strategy 3: Remove common titles and match
            WHEN LOWER(REGEXP_REPLACE(p.name, ',?\s*(S\.Kom|M\.T\.|M\.Kom|S\.T\.|S\.Si|M\.Si|Dr\.|Ir\.)', '', 'gi')) = t.nama_clean THEN 3
            -- Strategy 4: Match first and last name
            WHEN LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                 AND LOWER(SPLIT_PART(TRIM(p.name), ' ', -1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', -1)) THEN 4
            -- Strategy 5: First name + middle initial match
            WHEN LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                 AND LOWER(SUBSTRING(SPLIT_PART(TRIM(p.name), ' ', 2), 1, 1)) = LOWER(SUBSTRING(SPLIT_PART(t.nama_nip, ' ', 2), 1, 1)) THEN 5
            ELSE 99
        END AS match_strategy,
        CASE 
            WHEN LOWER(TRIM(p.name)) = t.nama_clean THEN '✓ Exact Match'
            WHEN LOWER(TRIM(p.name)) LIKE '%' || t.nama_clean || '%' THEN '✓ Contains Match (with title)'
            WHEN LOWER(REGEXP_REPLACE(p.name, ',?\s*(S\.Kom|M\.T\.|M\.Kom|S\.T\.|S\.Si|M\.Si|Dr\.|Ir\.)', '', 'gi')) = t.nama_clean THEN '✓ Match after removing title'
            WHEN LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                 AND LOWER(SPLIT_PART(TRIM(p.name), ' ', -1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', -1)) THEN '✓ First+Last Name Match'
            WHEN LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                 AND LOWER(SUBSTRING(SPLIT_PART(TRIM(p.name), ' ', 2), 1, 1)) = LOWER(SUBSTRING(SPLIT_PART(t.nama_nip, ' ', 2), 1, 1)) THEN '✓ First Name + Initial Match'
            ELSE '✗ No Match'
        END AS match_type
    FROM profiles p
    CROSS JOIN temp_nip_mapping t
    WHERE 
        -- Only match if strategies 1-5 apply
        (
            LOWER(TRIM(p.name)) = t.nama_clean
            OR LOWER(TRIM(p.name)) LIKE '%' || t.nama_clean || '%'
            OR LOWER(REGEXP_REPLACE(p.name, ',?\s*(S\.Kom|M\.T\.|M\.Kom|S\.T\.|S\.Si|M\.Si|Dr\.|Ir\.)', '', 'gi')) = t.nama_clean
            OR (
                LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                AND LOWER(SPLIT_PART(TRIM(p.name), ' ', -1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', -1))
            )
            OR (
                LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                AND LOWER(SUBSTRING(SPLIT_PART(TRIM(p.name), ' ', 2), 1, 1)) = LOWER(SUBSTRING(SPLIT_PART(t.nama_nip, ' ', 2), 1, 1))
            )
        )
    ORDER BY p.id, match_strategy ASC
)
SELECT 
    db_name,
    email,
    current_nip,
    '→' AS arrow,
    new_nip,
    nip_name,
    match_type
FROM matched_users
ORDER BY match_strategy, db_name;

-- Show summary
SELECT 
    COUNT(*) AS total_matches,
    COUNT(CASE WHEN current_nip IS NULL OR current_nip = '' THEN 1 END) AS will_be_updated,
    COUNT(CASE WHEN current_nip IS NOT NULL AND current_nip != '' THEN 1 END) AS already_has_nip
FROM (
    SELECT DISTINCT ON (p.id)
        p.id,
        p.nip AS current_nip
    FROM profiles p
    CROSS JOIN temp_nip_mapping t
    WHERE 
        LOWER(TRIM(p.name)) = t.nama_clean
        OR LOWER(TRIM(p.name)) LIKE '%' || t.nama_clean || '%'
        OR LOWER(REGEXP_REPLACE(p.name, ',?\s*(S\.Kom|M\.T\.|M\.Kom|S\.T\.|S\.Si|M\.Si|Dr\.|Ir\.)', '', 'gi')) = t.nama_clean
        OR (
            LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
            AND LOWER(SPLIT_PART(TRIM(p.name), ' ', -1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', -1))
        )
    ORDER BY p.id
) AS matches;

-- ============================================================================
-- STOP HERE! Review the output above before proceeding!
-- ============================================================================
-- If the matches look correct, uncomment and run the UPDATE section below
-- ============================================================================

/*
-- ============================================================================
-- PART 2: ACTUAL UPDATE - Uncomment this section to apply changes
-- ============================================================================

-- Update using best match strategy
WITH best_matches AS (
    SELECT DISTINCT ON (p.id)
        p.id,
        t.nip,
        CASE 
            WHEN LOWER(TRIM(p.name)) = t.nama_clean THEN 1
            WHEN LOWER(TRIM(p.name)) LIKE '%' || t.nama_clean || '%' THEN 2
            WHEN LOWER(REGEXP_REPLACE(p.name, ',?\s*(S\.Kom|M\.T\.|M\.Kom|S\.T\.|S\.Si|M\.Si|Dr\.|Ir\.)', '', 'gi')) = t.nama_clean THEN 3
            WHEN LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                 AND LOWER(SPLIT_PART(TRIM(p.name), ' ', -1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', -1)) THEN 4
            WHEN LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                 AND LOWER(SUBSTRING(SPLIT_PART(TRIM(p.name), ' ', 2), 1, 1)) = LOWER(SUBSTRING(SPLIT_PART(t.nama_nip, ' ', 2), 1, 1)) THEN 5
            ELSE 99
        END AS match_strategy
    FROM profiles p
    CROSS JOIN temp_nip_mapping t
    WHERE 
        (p.nip IS NULL OR p.nip = '')  -- Only update if NIP is empty
        AND (
            LOWER(TRIM(p.name)) = t.nama_clean
            OR LOWER(TRIM(p.name)) LIKE '%' || t.nama_clean || '%'
            OR LOWER(REGEXP_REPLACE(p.name, ',?\s*(S\.Kom|M\.T\.|M\.Kom|S\.T\.|S\.Si|M\.Si|Dr\.|Ir\.)', '', 'gi')) = t.nama_clean
            OR (
                LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                AND LOWER(SPLIT_PART(TRIM(p.name), ' ', -1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', -1))
            )
            OR (
                LOWER(SPLIT_PART(TRIM(p.name), ' ', 1)) = LOWER(SPLIT_PART(t.nama_nip, ' ', 1))
                AND LOWER(SUBSTRING(SPLIT_PART(TRIM(p.name), ' ', 2), 1, 1)) = LOWER(SUBSTRING(SPLIT_PART(t.nama_nip, ' ', 2), 1, 1))
            )
        )
    ORDER BY p.id, match_strategy ASC
)
UPDATE profiles p
SET nip = bm.nip
FROM best_matches bm
WHERE p.id = bm.id;

-- Show results
SELECT 
    name,
    email,
    nip,
    jabatan
FROM profiles
WHERE nip IS NOT NULL AND nip != ''
ORDER BY name;

-- Show unmatched NIP entries
SELECT 
    t.nama_nip,
    t.nip,
    'No matching user in database' AS status
FROM temp_nip_mapping t
WHERE NOT EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE 
        LOWER(TRIM(p.name)) = t.nama_clean
        OR LOWER(TRIM(p.name)) LIKE '%' || t.nama_clean || '%'
        OR LOWER(REGEXP_REPLACE(p.name, ',?\s*(S\.Kom|M\.T\.|M\.Kom|S\.T\.|S\.Si|M\.Si|Dr\.|Ir\.)', '', 'gi')) = t.nama_clean
)
ORDER BY t.nama_nip;
*/

-- Clean up
DROP TABLE IF EXISTS temp_nip_mapping;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run this script first to see the PREVIEW of matches
-- 2. Review the output carefully - check if names are matched correctly
-- 3. If matches look good, uncomment the UPDATE section (remove /* and */)
-- 4. Run the script again to apply the updates
-- 5. Users with existing NIP will NOT be overwritten
-- ============================================================================

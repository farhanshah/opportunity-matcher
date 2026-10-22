-- Official source expansion, verified against public operator sites on 22 Oct 2026.
-- Monitoring registry only; no eligibility, deadline or Open-status claim.
INSERT INTO monitored_sources(source_key,provider,source_url,source_type,check_interval_minutes,expected_terms,is_active)
SELECT v.source_key,v.provider,v.source_url,'official_page',1440,'[]'::jsonb,true
FROM (VALUES
 ('mext_2027_research_embassy','Study in Japan / MEXT','https://www.studyinjapan.go.jp/en/smap-stopj-applications-research.html'),
 ('mext_scholarship_main','Study in Japan / MEXT','https://www.studyinjapan.go.jp/en/planning/scholarships/mext-scholarships/'),
 ('turkiye_fulltime','Türkiye Scholarships (YTB)','https://www.turkiyeburslari.gov.tr/fulltimeprograms'),
 ('turkiye_programme_criteria','Türkiye Scholarships (YTB)','https://www.turkiyeburslari.gov.tr/scholarshipsprograms')
) v(source_key,provider,source_url)
WHERE NOT EXISTS(SELECT 1 FROM monitored_sources m WHERE m.source_url=v.source_url)
ON CONFLICT(source_key) DO NOTHING;

UPDATE monitored_sources
SET source_url='https://www.campusfrance.org/en/the-france-excellence-eiffel-scholarship-program',updated_at=now()
WHERE source_key='eiffel'
 AND source_url='https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence';

-- Leads made from WhatsApp chats now start with origin "ads" (most chats come
-- from the ads; the CS changes the rest with !updateleads). The ones the
-- listener made earlier with "unknown" follow, and their note no longer asks
-- to fill in the origin. Leads that already have another origin are not
-- touched. updated_at moves so the WhatsApp contact name follows
-- ("Lead WA ..." becomes "Lead Ads ...").
--
-- "unknown" stays a valid origin for older data and !updateleads.

UPDATE public.leads
SET origin = 'ads',
    notes = NULLIF(btrim(replace(coalesce(notes, ''), ' Isi origin lewat !updateleads.', '')), ''),
    updated_at = now()
WHERE origin = 'unknown';

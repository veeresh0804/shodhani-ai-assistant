
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notification channel" ON realtime.messages;
DROP POLICY IF EXISTS "Users can subscribe to own channels" ON realtime.messages;

CREATE POLICY "Users can read own notification channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications:' || auth.uid()::text
  OR realtime.topic() IN (
    SELECT 'interviews:student:' || s.id::text FROM public.students s WHERE s.user_id = auth.uid()
  )
  OR realtime.topic() IN (
    SELECT 'interviews:recruiter:' || r.id::text FROM public.recruiters r WHERE r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can subscribe to own channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'notifications:' || auth.uid()::text
  OR realtime.topic() IN (
    SELECT 'interviews:student:' || s.id::text FROM public.students s WHERE s.user_id = auth.uid()
  )
  OR realtime.topic() IN (
    SELECT 'interviews:recruiter:' || r.id::text FROM public.recruiters r WHERE r.user_id = auth.uid()
  )
);

-- Table for property videos
CREATE TABLE public.property_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT DEFAULT '',
  video_type TEXT NOT NULL DEFAULT 'standard' CHECK (video_type IN ('standard', 'tour_360')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies for property_videos
CREATE POLICY "Public can view videos of published properties" ON public.property_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_videos.property_id
        AND properties.published = true
        AND properties.status = 'published'::property_status
    )
  );

CREATE POLICY "Staff can manage videos" ON public.property_videos
  FOR ALL USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));
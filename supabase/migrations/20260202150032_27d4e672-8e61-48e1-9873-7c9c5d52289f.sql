-- Add deadline column to release_trains
ALTER TABLE public.release_trains 
ADD COLUMN deadline timestamp with time zone DEFAULT NULL;
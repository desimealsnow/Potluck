-- Update attendee_count trigger to use party_size deltas
-- Applies to: public.trg_update_attendee_count()

CREATE OR REPLACE FUNCTION public.trg_update_attendee_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'accepted' THEN
      UPDATE events
      SET attendee_count = attendee_count + COALESCE(NEW.party_size, 1)
      WHERE id = NEW.event_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status change away from accepted: subtract OLD party size
    IF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
      UPDATE events
      SET attendee_count = attendee_count - COALESCE(OLD.party_size, 1)
      WHERE id = NEW.event_id;

    -- Status change to accepted: add NEW party size
    ELSIF OLD.status <> 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE events
      SET attendee_count = attendee_count + COALESCE(NEW.party_size, 1)
      WHERE id = NEW.event_id;

    -- Party size changed while accepted: adjust by delta
    ELSIF NEW.status = 'accepted' AND COALESCE(OLD.party_size, 1) <> COALESCE(NEW.party_size, 1) THEN
      UPDATE events
      SET attendee_count = attendee_count + (COALESCE(NEW.party_size, 1) - COALESCE(OLD.party_size, 1))
      WHERE id = NEW.event_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'accepted' THEN
      UPDATE events
      SET attendee_count = attendee_count - COALESCE(OLD.party_size, 1)
      WHERE id = OLD.event_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;



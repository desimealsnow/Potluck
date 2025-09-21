-- Items Library Migration
-- 1) Global item catalog
-- 2) User item templates
-- 3) Link event_items to catalog/user templates

BEGIN;

-- ===============================================
-- 1. Global Item Catalog
-- ===============================================
CREATE TABLE IF NOT EXISTS public.item_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  unit text,
  default_per_guest_qty numeric(6,2) NOT NULL DEFAULT 1.0,
  dietary_tags text[] NOT NULL DEFAULT '{}',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique by normalized name/category/unit for dedupe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'item_catalog_name_cat_unit_uk'
  ) THEN
    ALTER TABLE public.item_catalog
      ADD CONSTRAINT item_catalog_name_cat_unit_uk
      UNIQUE (
        lower(trim(both from name)),
        coalesce(category, ''),
        coalesce(unit, '')
      );
  END IF;
END $$;

-- Reuse shared updated_at trigger if present
DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'trigger_set_timestamp';
  IF FOUND THEN
    DROP TRIGGER IF EXISTS set_timestamp_item_catalog ON public.item_catalog;
    CREATE TRIGGER set_timestamp_item_catalog
      BEFORE UPDATE ON public.item_catalog
      FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;

COMMENT ON TABLE public.item_catalog IS 'Global catalog of common potluck items with default attributes';

-- ===============================================
-- 2. User Item Templates
-- ===============================================
CREATE TABLE IF NOT EXISTS public.user_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  unit text,
  default_per_guest_qty numeric(6,2) NOT NULL DEFAULT 1.0,
  dietary_tags text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique per-user normalized name/category/unit
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_items_user_name_cat_unit_uk'
  ) THEN
    ALTER TABLE public.user_items
      ADD CONSTRAINT user_items_user_name_cat_unit_uk
      UNIQUE (
        user_id,
        lower(trim(both from name)),
        coalesce(category, ''),
        coalesce(unit, '')
      );
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'trigger_set_timestamp';
  IF FOUND THEN
    DROP TRIGGER IF EXISTS set_timestamp_user_items ON public.user_items;
    CREATE TRIGGER set_timestamp_user_items
      BEFORE UPDATE ON public.user_items
      FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END $$;

COMMENT ON TABLE public.user_items IS 'Per-user library of frequently used items (templates)';

-- ===============================================
-- 3. Link event_items to catalog/user templates
-- ===============================================
ALTER TABLE public.event_items
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid REFERENCES public.item_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_item_id uuid REFERENCES public.user_items(id) ON DELETE SET NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_item_catalog_active ON public.item_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_user_items_user ON public.user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_event_items_catalog ON public.event_items(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_event_items_user_item ON public.event_items(user_item_id);

COMMIT;


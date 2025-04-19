CREATE TYPE public.license_status AS ENUM ('active', 'expired');
CREATE TYPE public.license_type AS ENUM ('perpetual', 'subscription');

CREATE TABLE public.license (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status license_status NOT NULL DEFAULT 'active',
    license_type license_type NOT NULL DEFAULT 'perpetual',
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
    stripe_customer_id TEXT,
    stripe_payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE public.device (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.license
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.device
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.license ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device ENABLE ROW LEVEL SECURITY;

-- Licenses policies
CREATE POLICY "Users can view their own license"
    ON public.license FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Only service role can insert license"
    ON public.license FOR INSERT
    WITH CHECK (false);

CREATE POLICY "Only service role can update license"
    ON public.license FOR UPDATE
    USING (false);

-- Active devices policies
CREATE POLICY "Users can view their own devices"
    ON public.device FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can register their own devices"
    ON public.device FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
    ON public.device FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own device details"
    ON public.device FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_license_user_id ON public.license(user_id);
CREATE INDEX idx_device_user_id ON public.device(user_id);
CREATE INDEX idx_device_device_id ON public.device(device_id);

GRANT SELECT ON public.license TO authenticated;
GRANT SELECT, INSERT, DELETE, UPDATE ON public.device TO authenticated;
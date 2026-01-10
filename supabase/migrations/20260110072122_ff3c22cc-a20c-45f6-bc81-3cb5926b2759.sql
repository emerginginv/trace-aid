-- Step 15: Status Page & Incident Communications

-- Create enums for status management
CREATE TYPE component_status AS ENUM ('operational', 'degraded', 'partial_outage', 'major_outage');
CREATE TYPE incident_severity AS ENUM ('minor', 'major', 'critical');
CREATE TYPE incident_status AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');

-- Service components table
CREATE TABLE service_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status component_status NOT NULL DEFAULT 'operational',
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Incidents table
CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  severity incident_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'investigating',
  summary text NOT NULL,
  affected_components uuid[] DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Incident updates table
CREATE TABLE incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  message text NOT NULL,
  status_snapshot incident_status NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  posted_by uuid NOT NULL REFERENCES profiles(id)
);

-- Status subscribers table
CREATE TABLE status_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  verified boolean NOT NULL DEFAULT false,
  verification_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE service_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_subscribers ENABLE ROW LEVEL SECURITY;

-- Public read access to service components
CREATE POLICY "service_components_public_read" ON service_components
  FOR SELECT TO anon, authenticated
  USING (true);

-- Platform staff can manage components
CREATE POLICY "service_components_staff_all" ON service_components
  FOR ALL TO authenticated
  USING (is_platform_staff(auth.uid()));

-- Public read access to incidents
CREATE POLICY "incidents_public_read" ON incidents
  FOR SELECT TO anon, authenticated
  USING (true);

-- Platform staff can manage incidents
CREATE POLICY "incidents_staff_all" ON incidents
  FOR ALL TO authenticated
  USING (is_platform_staff(auth.uid()));

-- Public read access to incident updates
CREATE POLICY "incident_updates_public_read" ON incident_updates
  FOR SELECT TO anon, authenticated
  USING (true);

-- Platform staff can post updates
CREATE POLICY "incident_updates_staff_all" ON incident_updates
  FOR ALL TO authenticated
  USING (is_platform_staff(auth.uid()));

-- Public can subscribe (insert)
CREATE POLICY "status_subscribers_public_insert" ON status_subscribers
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Platform staff can manage subscribers
CREATE POLICY "status_subscribers_staff_read" ON status_subscribers
  FOR SELECT TO authenticated
  USING (is_platform_staff(auth.uid()));

-- Seed initial service components
INSERT INTO service_components (name, description, display_order) VALUES
  ('Application', 'Main web application and dashboard', 1),
  ('API', 'REST API and backend services', 2),
  ('Authentication', 'Login and session management', 3),
  ('File Storage', 'File uploads and attachments', 4),
  ('Database', 'Data storage and queries', 5),
  ('Email', 'Email notifications and delivery', 6);

-- Function to update component status
CREATE OR REPLACE FUNCTION update_component_status(
  p_component_id uuid,
  p_status component_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify platform staff
  IF NOT is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE service_components
  SET status = p_status, updated_at = now(), updated_by = auth.uid()
  WHERE id = p_component_id;

  -- Log audit event
  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (
    'STATUS_COMPONENT_UPDATED',
    auth.uid(),
    jsonb_build_object(
      'component_id', p_component_id,
      'new_status', p_status
    )
  );
END;
$$;

-- Function to create incident
CREATE OR REPLACE FUNCTION create_incident(
  p_title text,
  p_severity incident_severity,
  p_summary text,
  p_affected_components uuid[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_id uuid;
BEGIN
  -- Verify platform staff
  IF NOT is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO incidents (title, severity, summary, affected_components, created_by)
  VALUES (p_title, p_severity, p_summary, p_affected_components, auth.uid())
  RETURNING id INTO v_incident_id;

  -- Create initial update
  INSERT INTO incident_updates (incident_id, message, status_snapshot, posted_by)
  VALUES (v_incident_id, p_summary, 'investigating', auth.uid());

  -- Log audit event
  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (
    'INCIDENT_CREATED',
    auth.uid(),
    jsonb_build_object(
      'incident_id', v_incident_id,
      'title', p_title,
      'severity', p_severity,
      'affected_components', p_affected_components
    )
  );

  RETURN v_incident_id;
END;
$$;

-- Function to post incident update
CREATE OR REPLACE FUNCTION post_incident_update(
  p_incident_id uuid,
  p_message text,
  p_new_status incident_status DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status incident_status;
  v_final_status incident_status;
BEGIN
  -- Verify platform staff
  IF NOT is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get current status
  SELECT status INTO v_current_status FROM incidents WHERE id = p_incident_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  v_final_status := COALESCE(p_new_status, v_current_status);

  -- Update incident status if changed
  IF p_new_status IS NOT NULL THEN
    UPDATE incidents
    SET 
      status = p_new_status,
      updated_at = now(),
      resolved_at = CASE WHEN p_new_status = 'resolved' THEN now() ELSE resolved_at END
    WHERE id = p_incident_id;
  END IF;

  -- Insert update
  INSERT INTO incident_updates (incident_id, message, status_snapshot, posted_by)
  VALUES (p_incident_id, p_message, v_final_status, auth.uid());

  -- Log audit event
  INSERT INTO audit_events (action, actor_user_id, metadata)
  VALUES (
    CASE WHEN p_new_status = 'resolved' THEN 'INCIDENT_RESOLVED' ELSE 'INCIDENT_UPDATED' END,
    auth.uid(),
    jsonb_build_object(
      'incident_id', p_incident_id,
      'new_status', v_final_status,
      'message', p_message
    )
  );
END;
$$;

-- Function to subscribe to status updates
CREATE OR REPLACE FUNCTION subscribe_to_status(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_subscriber_id uuid;
BEGIN
  -- Generate verification token
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Check if already subscribed
  IF EXISTS (SELECT 1 FROM status_subscribers WHERE email = lower(p_email)) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already subscribed');
  END IF;

  INSERT INTO status_subscribers (email, verification_token)
  VALUES (lower(p_email), v_token)
  RETURNING id INTO v_subscriber_id;

  -- Log audit event
  INSERT INTO audit_events (action, metadata)
  VALUES (
    'STATUS_SUBSCRIBER_ADDED',
    jsonb_build_object('subscriber_id', v_subscriber_id, 'email', lower(p_email))
  );

  RETURN jsonb_build_object('success', true, 'token', v_token);
END;
$$;

-- Function to verify subscription
CREATE OR REPLACE FUNCTION verify_status_subscription(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE status_subscribers
  SET verified = true, verification_token = NULL
  WHERE verification_token = p_token AND verified = false;
  
  RETURN FOUND;
END;
$$;

-- Function to get status page data
CREATE OR REPLACE FUNCTION get_status_page_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_components jsonb;
  v_active_incidents jsonb;
  v_recent_incidents jsonb;
  v_overall_status text;
BEGIN
  -- Get components
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'description', description,
      'status', status,
      'updated_at', updated_at
    ) ORDER BY display_order
  ) INTO v_components
  FROM service_components;

  -- Get active incidents (not resolved)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'title', i.title,
      'severity', i.severity,
      'status', i.status,
      'summary', i.summary,
      'started_at', i.started_at,
      'affected_components', i.affected_components,
      'updates', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', iu.id,
            'message', iu.message,
            'status_snapshot', iu.status_snapshot,
            'posted_at', iu.posted_at
          ) ORDER BY iu.posted_at DESC
        )
        FROM incident_updates iu
        WHERE iu.incident_id = i.id
      )
    ) ORDER BY i.started_at DESC
  ) INTO v_active_incidents
  FROM incidents i
  WHERE i.status != 'resolved';

  -- Get recent resolved incidents (last 90 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'title', i.title,
      'severity', i.severity,
      'status', i.status,
      'summary', i.summary,
      'started_at', i.started_at,
      'resolved_at', i.resolved_at,
      'affected_components', i.affected_components
    ) ORDER BY i.resolved_at DESC
  ) INTO v_recent_incidents
  FROM incidents i
  WHERE i.status = 'resolved'
    AND i.resolved_at > now() - interval '90 days';

  -- Calculate overall status
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM service_components WHERE status = 'major_outage') THEN 'major_outage'
    WHEN EXISTS (SELECT 1 FROM service_components WHERE status = 'partial_outage') THEN 'partial_outage'
    WHEN EXISTS (SELECT 1 FROM service_components WHERE status = 'degraded') THEN 'degraded'
    ELSE 'operational'
  END INTO v_overall_status;

  RETURN jsonb_build_object(
    'overall_status', v_overall_status,
    'components', COALESCE(v_components, '[]'::jsonb),
    'active_incidents', COALESCE(v_active_incidents, '[]'::jsonb),
    'recent_incidents', COALESCE(v_recent_incidents, '[]'::jsonb),
    'last_updated', now()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_component_status TO authenticated;
GRANT EXECUTE ON FUNCTION create_incident TO authenticated;
GRANT EXECUTE ON FUNCTION post_incident_update TO authenticated;
GRANT EXECUTE ON FUNCTION subscribe_to_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_status_subscription TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_status_page_data TO anon, authenticated;
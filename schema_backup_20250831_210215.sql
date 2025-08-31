--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_actions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    actor_id character varying NOT NULL,
    action_type character varying NOT NULL,
    target_type character varying NOT NULL,
    target_id character varying NOT NULL,
    before_data jsonb,
    after_data jsonb,
    ip_address character varying,
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: analytics_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_snapshots (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    snapshot_date timestamp without time zone NOT NULL,
    total_users integer DEFAULT 0 NOT NULL,
    total_subscribers integer DEFAULT 0 NOT NULL,
    total_properties integer DEFAULT 0 NOT NULL,
    total_leads integer DEFAULT 0 NOT NULL,
    mrr numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    arr numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    churn_rate numeric(5,4) DEFAULT '0'::numeric,
    conversion_rate numeric(5,4) DEFAULT '0'::numeric,
    avg_revenue_per_user numeric(10,2) DEFAULT '0'::numeric,
    tier_breakdown jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    property_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: lead_assignment_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_assignment_tracking (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    organization_id character varying NOT NULL,
    agent_id character varying NOT NULL,
    last_assigned_at timestamp without time zone,
    total_assigned integer DEFAULT 0,
    is_available boolean DEFAULT true,
    max_leads_per_day integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: lead_routing_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_routing_config (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    organization_id character varying NOT NULL,
    routing_type character varying DEFAULT 'round_robin'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    settings jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    message text,
    property_id character varying,
    agent_id character varying NOT NULL,
    status character varying DEFAULT 'new'::character varying NOT NULL,
    source character varying DEFAULT 'website'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    organization_id character varying,
    priority character varying DEFAULT 'medium'::character varying,
    assigned_by character varying,
    assigned_at timestamp without time zone,
    followup_date timestamp without time zone,
    score integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    tier character varying NOT NULL,
    seats_total integer DEFAULT 10 NOT NULL,
    seats_used integer DEFAULT 0 NOT NULL,
    listing_cap integer DEFAULT 25 NOT NULL,
    featured_credits integer DEFAULT 0 NOT NULL,
    owner_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    rank_boost numeric(3,2) DEFAULT 1.00,
    integrations jsonb DEFAULT '{}'::jsonb
);


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title character varying NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    address character varying NOT NULL,
    city character varying NOT NULL,
    state character varying NOT NULL,
    country character varying DEFAULT 'USA'::character varying NOT NULL,
    zip_code character varying,
    bedrooms integer,
    bathrooms numeric(3,1),
    sqft integer,
    property_type character varying,
    images jsonb,
    slug character varying NOT NULL,
    agent_id character varying NOT NULL,
    organization_id character varying,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    featured_until timestamp without time zone,
    views integer DEFAULT 0 NOT NULL,
    saves integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: revenue_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_events (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    organization_id character varying,
    event_type character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'USD'::character varying,
    plan_id character varying,
    stripe_event_id character varying,
    metadata jsonb,
    processed_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: saved_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_searches (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    name character varying NOT NULL,
    filters jsonb NOT NULL,
    alert_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id character varying NOT NULL,
    name character varying NOT NULL,
    stripe_price_id character varying NOT NULL,
    price numeric(10,2) NOT NULL,
    "interval" character varying NOT NULL,
    features jsonb NOT NULL,
    listing_cap integer,
    seats integer,
    created_at timestamp without time zone DEFAULT now(),
    annual_stripe_price_id character varying,
    annual_price numeric(10,2),
    annual_discount_percent integer DEFAULT 20,
    is_active boolean DEFAULT true
);


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_activity_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    activity character varying NOT NULL,
    details jsonb,
    ip_address character varying,
    user_agent character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role character varying DEFAULT 'free'::character varying NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    stripe_customer_id character varying,
    stripe_subscription_id character varying,
    organization_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    feature_flags jsonb DEFAULT '{}'::jsonb,
    trial_end timestamp without time zone,
    current_period_end timestamp without time zone,
    cancel_at_period_end boolean DEFAULT false,
    password character varying,
    verified boolean DEFAULT false,
    billing_interval character varying DEFAULT 'monthly'::character varying
);


--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_codes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    email character varying NOT NULL,
    code character varying NOT NULL,
    purpose character varying DEFAULT 'email_verification'::character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: admin_actions admin_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


--
-- Name: analytics_snapshots analytics_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: lead_assignment_tracking lead_assignment_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_tracking
    ADD CONSTRAINT lead_assignment_tracking_pkey PRIMARY KEY (id);


--
-- Name: lead_routing_config lead_routing_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_routing_config
    ADD CONSTRAINT lead_routing_config_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: properties properties_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_slug_unique UNIQUE (slug);


--
-- Name: revenue_events revenue_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_events
    ADD CONSTRAINT revenue_events_pkey PRIMARY KEY (id);


--
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- PostgreSQL database dump complete
--


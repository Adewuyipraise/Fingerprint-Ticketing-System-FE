CREATE EXTENSION IF NOT EXISTS pgcrypto;

--
-- PostgreSQL database dump
--

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-05-13 14:43:08

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 7 (class 2615 OID 16787)
-- Name: internal; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA IF NOT EXISTS internal;


ALTER SCHEMA internal OWNER TO postgres;

--
-- TOC entry 2 (class 3079 OID 16800)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5158 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;


--
-- TOC entry 223 (class 1259 OID 16838)
-- Name: attendance_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    clock_time timestamp without time zone NOT NULL,
    source character varying(50) DEFAULT 'zkteco'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_name character varying(100)
);


ALTER TABLE public.attendance_logs OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16846)
-- Name: attendance_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.attendance_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5160 (class 0 OID 0)
-- Dependencies: 224
-- Name: attendance_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_logs_id_seq OWNED BY public.attendance_logs.id;


--
-- TOC entry 225 (class 1259 OID 16847)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zk_user_id character varying,
    action character varying(255) NOT NULL,
    entity character varying(100) NOT NULL,
    entity_id character varying(255),
    details text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45)
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16857)
-- Name: auth_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.auth_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    zk_user_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auth_users_role_check CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('hr'::character varying)::text, ('canteen_rep'::character varying)::text, ('accountant'::character varying)::text, ('auditor'::character varying)::text])))
);


ALTER TABLE public.auth_users OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16870)
-- Name: ticket_rule_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.ticket_rule_assignments (
    id integer NOT NULL,
    rule_set_id integer,
    zk_user_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    priority integer DEFAULT 0,
    "position" character varying(100)
);


ALTER TABLE public.ticket_rule_assignments OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16876)
-- Name: ticket_rule_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.ticket_rule_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_rule_assignments_id_seq OWNER TO postgres;

--
-- TOC entry 5161 (class 0 OID 0)
-- Dependencies: 228
-- Name: ticket_rule_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_rule_assignments_id_seq OWNED BY public.ticket_rule_assignments.id;


--
-- TOC entry 229 (class 1259 OID 16877)
-- Name: ticket_rule_sets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.ticket_rule_sets (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    "position" character varying(100) DEFAULT 'all'::character varying,
    max_per_day integer DEFAULT 1,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(50),
    priority integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ticket_rule_sets OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16889)
-- Name: ticket_rule_sets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.ticket_rule_sets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_rule_sets_id_seq OWNER TO postgres;

--
-- TOC entry 5162 (class 0 OID 0)
-- Dependencies: 230
-- Name: ticket_rule_sets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_rule_sets_id_seq OWNED BY public.ticket_rule_sets.id;


--
-- TOC entry 231 (class 1259 OID 16890)
-- Name: ticket_rule_windows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.ticket_rule_windows (
    id integer NOT NULL,
    rule_set_id integer,
    name character varying(50) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    max_count integer DEFAULT 1,
    priority integer DEFAULT 0
);


ALTER TABLE public.ticket_rule_windows OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16899)
-- Name: ticket_rule_windows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.ticket_rule_windows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_rule_windows_id_seq OWNER TO postgres;

--
-- TOC entry 5163 (class 0 OID 0)
-- Dependencies: 232
-- Name: ticket_rule_windows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_rule_windows_id_seq OWNED BY public.ticket_rule_windows.id;


--
-- TOC entry 233 (class 1259 OID 16900)
-- Name: ticket_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.ticket_rules (
    id integer NOT NULL,
    "position" character varying(50),
    max_per_day integer,
    morning_start time without time zone,
    morning_end time without time zone,
    evening_start time without time zone,
    evening_end time without time zone
);


ALTER TABLE public.ticket_rules OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16904)
-- Name: ticket_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.ticket_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ticket_rules_id_seq OWNER TO postgres;

--
-- TOC entry 5164 (class 0 OID 0)
-- Dependencies: 234
-- Name: ticket_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_rules_id_seq OWNED BY public.ticket_rules.id;


--
-- TOC entry 235 (class 1259 OID 16905)
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.tickets (
    id integer NOT NULL,
    ticket_number character varying(100) NOT NULL,
    zk_user_id character varying(50),
    event_name character varying(100),
    event_date date,
    printed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name text,
    department text,
    amount numeric
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16913)
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq OWNER TO postgres;

--
-- TOC entry 5165 (class 0 OID 0)
-- Dependencies: 236
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- TOC entry 237 (class 1259 OID 16914)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS public.users (
    id integer NOT NULL,
    zk_user_id character varying(50) NOT NULL,
    name character varying(100),
    department text,
    amount numeric,
    "position" text,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16923)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5166 (class 0 OID 0)
-- Dependencies: 238
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4940 (class 2604 OID 16924)
-- Name: attendance_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_logs ALTER COLUMN id SET DEFAULT nextval('public.attendance_logs_id_seq'::regclass);


--
-- TOC entry 4948 (class 2604 OID 16925)
-- Name: ticket_rule_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rule_assignments ALTER COLUMN id SET DEFAULT nextval('public.ticket_rule_assignments_id_seq'::regclass);


--
-- TOC entry 4951 (class 2604 OID 16926)
-- Name: ticket_rule_sets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rule_sets ALTER COLUMN id SET DEFAULT nextval('public.ticket_rule_sets_id_seq'::regclass);


--
-- TOC entry 4959 (class 2604 OID 16927)
-- Name: ticket_rule_windows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rule_windows ALTER COLUMN id SET DEFAULT nextval('public.ticket_rule_windows_id_seq'::regclass);


--
-- TOC entry 4962 (class 2604 OID 16928)
-- Name: ticket_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rules ALTER COLUMN id SET DEFAULT nextval('public.ticket_rules_id_seq'::regclass);


--
-- TOC entry 4963 (class 2604 OID 16929)
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- TOC entry 4965 (class 2604 OID 16930)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

--
-- TOC entry 4974 (class 2606 OID 16932)
-- Name: attendance_logs attendance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_logs
    ADD CONSTRAINT attendance_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4976 (class 2606 OID 16934)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4978 (class 2606 OID 16936)
-- Name: auth_users auth_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_email_key UNIQUE (email);


--
-- TOC entry 4980 (class 2606 OID 16938)
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- TOC entry 4983 (class 2606 OID 16940)
-- Name: ticket_rule_assignments ticket_rule_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rule_assignments
    ADD CONSTRAINT ticket_rule_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 4985 (class 2606 OID 16942)
-- Name: ticket_rule_sets ticket_rule_sets_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rule_sets
    ADD CONSTRAINT ticket_rule_sets_name_unique UNIQUE (name);


--
-- TOC entry 4987 (class 2606 OID 16944)
-- Name: ticket_rule_sets ticket_rule_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rule_sets
    ADD CONSTRAINT ticket_rule_sets_pkey PRIMARY KEY (id);


--
-- TOC entry 4989 (class 2606 OID 16946)
-- Name: ticket_rule_windows ticket_rule_windows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rule_windows
    ADD CONSTRAINT ticket_rule_windows_pkey PRIMARY KEY (id);


--
-- TOC entry 4991 (class 2606 OID 16948)
-- Name: ticket_rules ticket_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rules
    ADD CONSTRAINT ticket_rules_pkey PRIMARY KEY (id);


--
-- TOC entry 4995 (class 2606 OID 16950)
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 4997 (class 2606 OID 16952)
-- Name: tickets tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);


--
-- TOC entry 4999 (class 2606 OID 16954)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5001 (class 2606 OID 16956)
-- Name: users users_zk_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_zk_user_id_key UNIQUE (zk_user_id);


--
-- TOC entry 5003 (class 2606 OID 16958)
-- Name: users users_zk_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_zk_user_id_unique UNIQUE (zk_user_id);


--
-- TOC entry 4981 (class 1259 OID 16959)
-- Name: idx_auth_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON public.auth_users USING btree (email);


--
-- TOC entry 4992 (class 1259 OID 16960)
-- Name: idx_tickets_event_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_tickets_event_date ON public.tickets USING btree (event_date);


--
-- TOC entry 4993 (class 1259 OID 16961)
-- Name: idx_tickets_zk_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX IF NOT EXISTS idx_tickets_zk_user_date ON public.tickets USING btree (zk_user_id, event_date);


--
-- TOC entry 5004 (class 2606 OID 16962)
-- Name: ticket_rule_assignments ticket_rule_assignments_rule_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rule_assignments
    ADD CONSTRAINT ticket_rule_assignments_rule_set_id_fkey FOREIGN KEY (rule_set_id) REFERENCES public.ticket_rule_sets(id) ON DELETE CASCADE;


--
-- TOC entry 5005 (class 2606 OID 16967)
-- Name: ticket_rule_windows ticket_rule_windows_rule_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_rule_windows
    ADD CONSTRAINT ticket_rule_windows_rule_set_id_fkey FOREIGN KEY (rule_set_id) REFERENCES public.ticket_rule_sets(id) ON DELETE CASCADE;


-- Completed on 2026-05-13 14:43:08

--
-- PostgreSQL database dump complete
--

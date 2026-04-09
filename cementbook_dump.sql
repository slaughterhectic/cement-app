--
-- PostgreSQL database dump
--

\restrict VhhhcmSWLweMWFNzJUbG7Nf2WSwSbvfIM2xvZGIJGf4WaKOye7pAegLgWZnHgJ6

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

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
-- Name: bank_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_balances (
    id integer NOT NULL,
    bank_name text NOT NULL,
    opening_balance real DEFAULT 0
);


--
-- Name: bank_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_balances_id_seq OWNED BY public.bank_balances.id;


--
-- Name: cement_brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cement_brands (
    id integer NOT NULL,
    name text NOT NULL,
    type text,
    manufacturer text,
    is_active integer DEFAULT 1,
    CONSTRAINT cement_brands_type_check CHECK ((type = ANY (ARRAY['OPC'::text, 'PPC'::text, 'DAMAGE'::text, 'OTHER'::text])))
);


--
-- Name: cement_brands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cement_brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cement_brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cement_brands_id_seq OWNED BY public.cement_brands.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    date text NOT NULL,
    amount real NOT NULL,
    category text,
    description text NOT NULL,
    bank_name text,
    mode text DEFAULT 'bank'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT expenses_mode_check CHECK ((mode = ANY (ARRAY['bank'::text, 'cash'::text])))
);


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: godowns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.godowns (
    id integer NOT NULL,
    name text NOT NULL,
    location text
);


--
-- Name: godowns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.godowns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: godowns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.godowns_id_seq OWNED BY public.godowns.id;


--
-- Name: imprest_handlers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imprest_handlers (
    id integer NOT NULL,
    handler_name text NOT NULL,
    opening_balance real DEFAULT 0
);


--
-- Name: imprest_handlers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imprest_handlers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imprest_handlers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imprest_handlers_id_seq OWNED BY public.imprest_handlers.id;


--
-- Name: imprest_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imprest_transactions (
    id integer NOT NULL,
    date text NOT NULL,
    handler_name text DEFAULT 'Akash'::text NOT NULL,
    particulars text,
    narration text,
    debit real DEFAULT 0,
    credit real DEFAULT 0,
    remark text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: imprest_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.imprest_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imprest_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imprest_transactions_id_seq OWNED BY public.imprest_transactions.id;


--
-- Name: loans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loans (
    id integer NOT NULL,
    lender_name text NOT NULL,
    principal real NOT NULL,
    interest_rate real NOT NULL,
    emi_amount real,
    start_date text NOT NULL,
    tenure_months integer,
    outstanding_principal real,
    remarks text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: loans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.loans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.loans_id_seq OWNED BY public.loans.id;


--
-- Name: parties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parties (
    id integer NOT NULL,
    name text NOT NULL,
    phone text,
    location text,
    district text,
    type text,
    opening_balance real DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT parties_type_check CHECK ((type = ANY (ARRAY['dealer'::text, 'contractor'::text, 'builder'::text, 'institution'::text, 'damage_buyer'::text, 'other'::text])))
);


--
-- Name: parties_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parties_id_seq OWNED BY public.parties.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    date text NOT NULL,
    party_id integer NOT NULL,
    amount real NOT NULL,
    mode text DEFAULT 'bank'::text,
    bank_name text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_mode_check CHECK ((mode = ANY (ARRAY['bank'::text, 'cash'::text])))
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchases (
    id integer NOT NULL,
    date text NOT NULL,
    supplier_name text NOT NULL,
    brand_id integer,
    cement_type text,
    bags real NOT NULL,
    purchase_rate real NOT NULL,
    purchase_amount real GENERATED ALWAYS AS ((bags * purchase_rate)) STORED,
    godown_id integer,
    truck_number text,
    source_location text,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    invoice_number text
);


--
-- Name: purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchases_id_seq OWNED BY public.purchases.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    date text NOT NULL,
    party_id integer NOT NULL,
    brand_id integer NOT NULL,
    cement_type text,
    bags real NOT NULL,
    sale_rate real NOT NULL,
    sale_amount real GENERATED ALWAYS AS ((bags * sale_rate)) STORED,
    destination text,
    invoice_number text,
    billed_party text,
    billed_quantity integer,
    billed_rate real,
    billed_amount real,
    truck_number text,
    godown_id integer,
    remarks text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: bank_balances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_balances ALTER COLUMN id SET DEFAULT nextval('public.bank_balances_id_seq'::regclass);


--
-- Name: cement_brands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cement_brands ALTER COLUMN id SET DEFAULT nextval('public.cement_brands_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: godowns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.godowns ALTER COLUMN id SET DEFAULT nextval('public.godowns_id_seq'::regclass);


--
-- Name: imprest_handlers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imprest_handlers ALTER COLUMN id SET DEFAULT nextval('public.imprest_handlers_id_seq'::regclass);


--
-- Name: imprest_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imprest_transactions ALTER COLUMN id SET DEFAULT nextval('public.imprest_transactions_id_seq'::regclass);


--
-- Name: loans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans ALTER COLUMN id SET DEFAULT nextval('public.loans_id_seq'::regclass);


--
-- Name: parties id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parties ALTER COLUMN id SET DEFAULT nextval('public.parties_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: purchases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Data for Name: bank_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_balances (id, bank_name, opening_balance) FROM stdin;
\.


--
-- Data for Name: cement_brands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cement_brands (id, name, type, manufacturer, is_active) FROM stdin;
1	Shree Cement OPC	OPC	Shree Cement	1
2	Shree Cement PPC	PPC	Shree Cement	1
3	JK Cement OPC	OPC	JK Cement	1
4	JK Cement PPC	PPC	JK Cement	1
5	Birla OPC	OPC	Birla	1
6	Birla Multicem	PPC	Birla	1
7	Ultratech OPC	OPC	Ultratech	1
8	Ultratech PPC	PPC	Ultratech	1
9	Ultratech Damage	DAMAGE	Ultratech	1
10	Tansen OPC	OPC	Tansen	1
11	Tansen PPC	PPC	Tansen	1
12	Sagarmatha OPC	OPC	Sagarmatha	1
13	Bangur OPC	OPC	Bangur	1
14	Bangur PPC	PPC	Bangur	1
15	ACC Gold	PPC	ACC	1
16	Mycem PPC	PPC	Mycem	1
17	Double Bull OPC	OPC	Double Bull	1
18	Double Bull PPC	PPC	Double Bull	1
19	HV Cement	OPC	HV	1
20	Palpa OPC	OPC	Palpa	1
21	Arghakhanchi OPC	OPC	Arghakhanchi	1
22	Prism NFR	OTHER	Prism	1
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, date, amount, category, description, bank_name, mode, created_at) FROM stdin;
1	2025-10-10	118	Bank charges	Cheque Book Charges	BOB	bank	2026-04-07 21:28:40.555943+00
2	2025-10-14	2330	Office	HP PRINTER	ARMTECH	bank	2026-04-07 21:28:40.557495+00
3	2025-10-15	295	Bank charges	Cheque Book Charges	BOB	bank	2026-04-07 21:28:40.55848+00
4	2025-10-22	6357.84	Office	WIFI RECHARGE	ARMTECH	bank	2026-04-07 21:28:40.559605+00
5	2025-10-15	2.95	Bank charges	Weekly Bal Alerts charges for Aug-25	ARMTECH	bank	2026-04-07 21:28:40.560442+00
6	2025-10-23	1000	Office	RAKESH SINGH SATNA TRP	ARMTECH	bank	2026-04-07 21:28:40.561735+00
7	2025-10-15	2.36	Bank charges	Weekly Bal Alerts charges for Aug-25	ARMTECH	bank	2026-04-07 21:28:40.562759+00
8	2025-10-27	2897	Office	JIO RECHARGE	ARMTECH	bank	2026-04-07 21:28:40.56397+00
9	2025-10-15	53.1	Bank charges	IMPS Transaction Dated On 27- Sep-2025	ARMTECH	bank	2026-04-07 21:28:40.565304+00
10	2025-10-15	53.1	Bank charges	IMPS Transaction Dated On 29- Sep-2025	ARMTECH	bank	2026-04-07 21:28:40.566408+00
11	2025-10-24	2.36	Bank charges	Weekly Bal Alerts charges for Sep-25	ARMTECH	bank	2026-04-07 21:28:40.56795+00
15	2025-10-27	41.3	Bank charges	Chrg: IMPS Transaction Dated On 01- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.572565+00
16	2025-10-27	35.4	Bank charges	Chrg: IMPS Transaction Dated On 08- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.573722+00
17	2025-10-27	17.7	Bank charges	Chrg: IMPS Transaction Dated On 11- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.574915+00
18	2025-10-27	41.3	Bank charges	Chrg: IMPS Transaction Dated On 14- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.576011+00
19	2025-10-27	35.4	Bank charges	Chrg: IMPS Transaction Dated On 16- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.577138+00
20	2025-10-27	35.4	Bank charges	Chrg: IMPS Transaction Dated On 10- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.57831+00
21	2025-10-27	41.3	Bank charges	Chrg: IMPS Transaction Dated On 15- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.579434+00
22	2025-10-27	35.4	Bank charges	Chrg: IMPS Transaction Dated On 13- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.580576+00
23	2025-10-27	17.7	Bank charges	Chrg: IMPS Transaction Dated On 12- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.581807+00
24	2025-10-27	53.1	Bank charges	Chrg: IMPS Transaction Dated On 17- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.58293+00
25	2025-10-27	64.9	Bank charges	Chrg: IMPS Transaction Dated On 18- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.584302+00
26	2025-10-28	11.8	Bank charges	Chrg: IMPS Transaction Dated On 02- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.585323+00
27	2025-10-28	47.2	Bank charges	Chrg: IMPS Transaction Dated On 07- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.586913+00
28	2025-10-28	35.4	Bank charges	Chrg: IMPS Transaction Dated On 03- Oct-2025	ARMTECH	bank	2026-04-07 21:28:40.587928+00
12	2025-10-25	8.85	Bank charges	CHARGES FOR :IMPS/P2A/529818858932/XXXXXXXX	BOB	bank	2026-04-07 21:28:40.569303+00
13	2025-10-26	8.85	Bank charges	CHARGES FOR :IMPS/P2A/529909878799/XXXXXXXX	BOB	bank	2026-04-07 21:28:40.5704+00
14	2025-10-26	8.85	Bank charges	CHARGES FOR :IMPS/P2A/529910190671/XXXXXXXX	BOB	bank	2026-04-07 21:28:40.571447+00
\.


--
-- Data for Name: godowns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.godowns (id, name, location) FROM stdin;
1	Maunda Godown	Maunda, Lucknow
2	Dubagga Godown	Dubagga, Lucknow
3	Plant	Lucknow
\.


--
-- Data for Name: imprest_handlers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.imprest_handlers (id, handler_name, opening_balance) FROM stdin;
1	Akash	101479
16	Me	0
\.


--
-- Data for Name: imprest_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.imprest_transactions (id, date, handler_name, particulars, narration, debit, credit, remark, created_at) FROM stdin;
1	2026-04-01	Akash	Staff welfare & Refreshment	Being amonut paid to annu for milk	55	0	\N	2026-04-09 20:57:07.07584+00
2	2026-04-01	Akash	Office expense	Being amonut paid for armtech stamp	150	0	\N	2026-04-09 20:57:07.085394+00
3	2026-04-01	Akash	Office expense	Being amonut paid for locker	147	0	\N	2026-04-09 20:57:07.088973+00
4	2026-04-01	Akash	Labour - Loading / Unloading	Being amount paid to labour for unloading 6862	2800	0	\N	2026-04-09 20:57:07.092453+00
5	2026-04-01	Akash	Travel Expense	Being amount paid to labour for taxi freight	150	0	\N	2026-04-09 20:57:07.094965+00
6	2026-04-01	Akash	Driver expnese	Being amount paid to advance to 6862 driver	3050	0	\N	2026-04-09 20:57:07.097435+00
7	2026-04-01	Akash	Labour - Loading / Unloading	Being amount paid to labour for unloading 7183	5400	0	\N	2026-04-09 20:57:07.099801+00
8	2026-04-01	Akash	Driver expnese	Being amount paid to advance to 7183 driver	1500	0	\N	2026-04-09 20:57:07.102442+00
9	2026-04-01	Akash	Jai Bhawani Enterprises	Being amonut cash received from jai bhawani enterprises	0	50000	\N	2026-04-09 20:57:07.105058+00
10	2026-04-01	Akash	Fuel expense	Being amount paid for truck fuel to 7210	4000	0	\N	2026-04-09 20:57:07.107338+00
11	2026-04-01	Akash	Driver expnese	Being amount paid to advance to 7210 driver	2000	0	\N	2026-04-09 20:57:07.109408+00
12	2026-04-02	Akash	Staff welfare & Refreshment	Being amonut paid to annu for milk	70	0	\N	2026-04-09 20:57:07.111675+00
13	2026-04-02	Akash	Driver expnese	Being amount paid to advance to 7210 driver	4500	0	\N	2026-04-09 20:57:07.113812+00
14	2026-04-02	Akash	Driver expnese	Being amount paid to advance to 7183 driver(2600 advance, 400 factory expense,)	3000	0	\N	2026-04-09 20:57:07.115942+00
15	2026-04-02	Akash	Labour - Loading / Unloading	Being amount paid to labour for unloading 6862	2260	0	\N	2026-04-09 20:57:07.118024+00
16	2026-04-02	Akash	Driver expnese	Being amount paid to advance to 6862 driver	2740	0	\N	2026-04-09 20:57:07.120077+00
17	2026-04-03	Akash	Fuel expense	Being amount paid for truck fuel to 7183	4000	0	\N	2026-04-09 20:57:07.126697+00
\.


--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loans (id, lender_name, principal, interest_rate, emi_amount, start_date, tenure_months, outstanding_principal, remarks, created_at) FROM stdin;
\.


--
-- Data for Name: parties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parties (id, name, phone, location, district, type, opening_balance, created_at) FROM stdin;
1	PRATIK SINGH	\N	\N	\N	dealer	0	2026-04-07 21:28:40.330566+00
2	PWD TENDER	\N	\N	\N	dealer	0	2026-04-07 21:28:40.334198+00
3	A-1 ENTERPRISES	\N	\N	\N	dealer	0	2026-04-07 21:28:40.336363+00
4	Faisal javed	\N	\N	\N	dealer	55300	2026-04-07 21:28:40.338421+00
5	AWADH RMC	\N	\N	\N	dealer	1.47685e+06	2026-04-07 21:28:40.340072+00
6	Abhishek SINGH	\N	\N	\N	dealer	1000	2026-04-07 21:28:40.341745+00
7	Abhishek Munsi	\N	\N	\N	dealer	0	2026-04-07 21:28:40.343759+00
8	AHAMAD JAGDISHPUR	\N	\N	\N	dealer	0	2026-04-07 21:28:40.345463+00
9	Ajay Deoria	\N	\N	\N	dealer	152320	2026-04-07 21:28:40.346818+00
10	Akbar Azamgarh	\N	\N	\N	dealer	33800	2026-04-07 21:28:40.348157+00
11	ANIL AGARWAL	\N	\N	\N	dealer	212660	2026-04-07 21:28:40.349338+00
12	ANIL SINGH ALLAHABAD	\N	\N	\N	dealer	1700	2026-04-07 21:28:40.350681+00
13	AMIT MISHRA SHRAVASTI	\N	\N	\N	dealer	307414.22	2026-04-07 21:28:40.352347+00
14	Anoop	\N	\N	\N	dealer	0	2026-04-07 21:28:40.353914+00
15	ANUBHAV SINGH	\N	\N	\N	dealer	645895.6	2026-04-07 21:28:40.355193+00
16	Anurag pratapgarh	\N	\N	\N	dealer	-1	2026-04-07 21:28:40.356502+00
17	ARVIND VERMA	\N	\N	\N	dealer	195656.72	2026-04-07 21:28:40.357767+00
18	Ashish Yash Builders	\N	\N	\N	dealer	28000	2026-04-07 21:28:40.358904+00
19	Atul Jalan	\N	\N	\N	dealer	23600	2026-04-07 21:28:40.360034+00
20	ABDUL DUBAGGA	\N	\N	\N	dealer	0	2026-04-07 21:28:40.361166+00
21	ARUN GUPTA	\N	\N	\N	dealer	0	2026-04-07 21:28:40.362354+00
22	Amit agarwal gkp	\N	\N	\N	dealer	0	2026-04-07 21:28:40.363546+00
23	SHREE ANNAPURNA INDUSTRIES	\N	\N	\N	dealer	3600	2026-04-07 21:28:40.364801+00
24	Anil agarwal Behraich	\N	\N	\N	dealer	149940	2026-04-07 21:28:40.366129+00
25	ABHINAV ENTERPRISES	\N	\N	\N	dealer	2000	2026-04-07 21:28:40.367546+00
26	ARUN	\N	\N	\N	dealer	100	2026-04-07 21:28:40.369224+00
27	AZAD SINGH	\N	\N	\N	dealer	15500	2026-04-07 21:28:40.370658+00
28	Berhni Transport New	\N	\N	\N	dealer	150885	2026-04-07 21:28:40.371849+00
29	Berhni Transport	\N	\N	\N	dealer	291060	2026-04-07 21:28:40.373454+00
30	Bandhu Pipe	\N	\N	\N	dealer	467440	2026-04-07 21:28:40.375128+00
31	BABA CONSTRUCTION	\N	\N	\N	dealer	397200	2026-04-07 21:28:40.376646+00
32	BABLU SINGH	\N	\N	\N	dealer	1000	2026-04-07 21:28:40.378046+00
33	BHUPENDRA SINGH	\N	\N	\N	dealer	564570	2026-04-07 21:28:40.379223+00
34	BANSAL	\N	\N	\N	dealer	53540	2026-04-07 21:28:40.380499+00
35	BIRLA MUNSI HARDOI	\N	\N	\N	dealer	40	2026-04-07 21:28:40.381997+00
36	BRIJESH SINGH	\N	\N	\N	dealer	416470	2026-04-07 21:28:40.38336+00
37	CREATIVE INDIA	\N	\N	\N	dealer	0	2026-04-07 21:28:40.384931+00
38	CS COLLEGE MAINPURI	\N	\N	\N	dealer	-3700	2026-04-07 21:28:40.386733+00
39	CHANDAN MISHRA	\N	\N	\N	dealer	137005	2026-04-07 21:28:40.388216+00
40	CHINMAY CONSTRUCTION	\N	\N	\N	dealer	1.493394e+06	2026-04-07 21:28:40.389501+00
41	DEVRISHI	\N	\N	\N	dealer	-142200	2026-04-07 21:28:40.390799+00
42	Dharmendra	\N	\N	\N	dealer	0	2026-04-07 21:28:40.392126+00
43	Dharmendra Yadav	\N	\N	\N	dealer	199380	2026-04-07 21:28:40.393508+00
44	divyendu	\N	\N	\N	dealer	25450	2026-04-07 21:28:40.394686+00
45	DILEEP SINGH	\N	\N	\N	dealer	27000	2026-04-07 21:28:40.395874+00
46	DEEN DAYAL SINGH	\N	\N	\N	dealer	59500	2026-04-07 21:28:40.397055+00
47	DILEEP ALAMNAGAR	\N	\N	\N	dealer	0	2026-04-07 21:28:40.398331+00
48	DEEPAK	\N	\N	\N	dealer	27001	2026-04-07 21:28:40.399521+00
49	DIXIT RBL	\N	\N	\N	dealer	389250	2026-04-07 21:28:40.400867+00
50	fauji traders	\N	\N	\N	dealer	34000	2026-04-07 21:28:40.402516+00
51	G Das	\N	\N	\N	dealer	51700	2026-04-07 21:28:40.404058+00
52	GHANSHYAM PANDIT	\N	\N	\N	dealer	62000	2026-04-07 21:28:40.405306+00
53	Gopal Gomtinagar	\N	\N	\N	dealer	1350	2026-04-07 21:28:40.406532+00
54	Guddu Behraich	\N	\N	\N	dealer	1600	2026-04-07 21:28:40.40779+00
55	GD ENTERPRISES	\N	\N	\N	dealer	0	2026-04-07 21:28:40.408994+00
56	Harendra allahabad	\N	\N	\N	dealer	50100	2026-04-07 21:28:40.410176+00
57	INDIAN ENTERPRISES	\N	\N	\N	dealer	0	2026-04-07 21:28:40.411321+00
58	KALLU MISHRA	\N	\N	\N	dealer	200	2026-04-07 21:28:40.412565+00
59	Kamlesh Deoria	\N	\N	\N	dealer	82260	2026-04-07 21:28:40.4139+00
60	Kamal Lucknow	\N	\N	\N	dealer	131940	2026-04-07 21:28:40.415226+00
61	KISHAN SINGH	\N	\N	\N	dealer	91400	2026-04-07 21:28:40.416413+00
62	KRISHNA TIWARI	\N	\N	\N	dealer	0	2026-04-07 21:28:40.417752+00
63	KUMAR CHINHAT	\N	\N	\N	dealer	588800	2026-04-07 21:28:40.419298+00
64	MANISH YADAV BALLIA	\N	\N	\N	dealer	12680	2026-04-07 21:28:40.420789+00
65	MSG TILES	\N	\N	\N	dealer	49450	2026-04-07 21:28:40.422032+00
66	MISHRA & SON	\N	\N	\N	dealer	0	2026-04-07 21:28:40.423213+00
67	MAURYA ENTERPRISES	\N	\N	\N	dealer	0	2026-04-07 21:28:40.424347+00
68	MAX INFRA	\N	\N	\N	dealer	274500	2026-04-07 21:28:40.425464+00
69	new regent	\N	\N	\N	dealer	742700	2026-04-07 21:28:40.426629+00
70	NEW BHARAT	\N	\N	\N	dealer	-1000	2026-04-07 21:28:40.427871+00
71	NIKHIL SINGH	\N	\N	\N	dealer	334040	2026-04-07 21:28:40.429063+00
72	OP AZAMGHAR	\N	\N	\N	dealer	10198	2026-04-07 21:28:40.430214+00
73	PUNJAB CEMENT	\N	\N	\N	dealer	581919	2026-04-07 21:28:40.431441+00
74	PRINCE GUPTA	\N	\N	\N	dealer	-280000	2026-04-07 21:28:40.432571+00
75	PRASHANT SINGH	\N	\N	\N	dealer	73900	2026-04-07 21:28:40.433888+00
76	PANKAJ SHUKLA	\N	\N	\N	dealer	485360	2026-04-07 21:28:40.435434+00
77	PREMA ENTERPRISES	\N	\N	\N	dealer	27300	2026-04-07 21:28:40.437198+00
78	PANKAJ SINGH	\N	\N	\N	dealer	386400	2026-04-07 21:28:40.438666+00
79	RL Enterprises	\N	\N	\N	dealer	-1000	2026-04-07 21:28:40.440088+00
80	JD English school	\N	\N	\N	dealer	0	2026-04-07 21:28:40.441476+00
81	JK CONSTRUCTION GROUP	\N	\N	\N	dealer	0	2026-04-07 21:28:40.442709+00
82	RESTRICTED SINGH	\N	\N	\N	dealer	7000	2026-04-07 21:28:40.443942+00
83	REPUBLICAN SCHOOL	\N	\N	\N	dealer	51000	2026-04-07 21:28:40.445011+00
84	RAGHAV SINGH	\N	\N	\N	dealer	19600	2026-04-07 21:28:40.446053+00
85	Ramesh tripati	\N	\N	\N	dealer	0	2026-04-07 21:28:40.44731+00
86	RUSTAMPUR SITE	\N	\N	\N	dealer	86250	2026-04-07 21:28:40.448631+00
87	Rahey Shyam Verma	\N	\N	\N	dealer	6720	2026-04-07 21:28:40.449833+00
88	Rohit Gorakhpur	\N	\N	\N	dealer	35420	2026-04-07 21:28:40.451153+00
89	RANJIT	\N	\N	\N	dealer	3500	2026-04-07 21:28:40.452683+00
90	RAJU TIWARI	\N	\N	\N	dealer	105000	2026-04-07 21:28:40.454227+00
91	SASHI YADAV	\N	\N	\N	dealer	-5	2026-04-07 21:28:40.45553+00
92	Shivam alamnagar	\N	\N	\N	dealer	60460	2026-04-07 21:28:40.456718+00
93	SAHU BASTI	\N	\N	\N	dealer	175559	2026-04-07 21:28:40.45792+00
94	SUNDERAM FABRICATORS	\N	\N	\N	dealer	-105700	2026-04-07 21:28:40.459437+00
95	SKY LINE	\N	\N	\N	dealer	0	2026-04-07 21:28:40.460889+00
96	SAHAS COMPANY	\N	\N	\N	dealer	0	2026-04-07 21:28:40.46208+00
97	SALVENDRA GONDA	\N	\N	\N	dealer	749620	2026-04-07 21:28:40.46333+00
98	SANJAY SINGH RUDAULI	\N	\N	\N	dealer	353670	2026-04-07 21:28:40.464597+00
99	SANJAY SONI	\N	\N	\N	dealer	211999	2026-04-07 21:28:40.465896+00
100	SHIVAM INTERLOCKING	\N	\N	\N	dealer	84060	2026-04-07 21:28:40.467257+00
101	Shivam Mishra	\N	\N	\N	dealer	15375	2026-04-07 21:28:40.468892+00
102	SHOBHIT SINGH	\N	\N	\N	dealer	457805	2026-04-07 21:28:40.470289+00
103	MAAN SINGH	\N	\N	\N	dealer	0	2026-04-07 21:28:40.471375+00
104	SHREE KHATU SHYAM	\N	\N	\N	dealer	306540	2026-04-07 21:28:40.472469+00
105	SONU BRICKS	\N	\N	\N	dealer	100000	2026-04-07 21:28:40.473699+00
106	Sonu Yadav	\N	\N	\N	dealer	173776.7	2026-04-07 21:28:40.474809+00
107	SURAJ YADAV	\N	\N	\N	dealer	83000	2026-04-07 21:28:40.475926+00
108	SURAJ PATHAK	\N	\N	\N	dealer	2690	2026-04-07 21:28:40.477052+00
109	IMC SATYA PAREEK	\N	\N	\N	dealer	500	2026-04-07 21:28:40.47819+00
110	S S INDUSTRIES	\N	\N	\N	dealer	122773	2026-04-07 21:28:40.479203+00
111	SUBHASH RBL	\N	\N	\N	dealer	12380	2026-04-07 21:28:40.480255+00
112	Shivanshu Singh	\N	\N	\N	dealer	191464.22	2026-04-07 21:28:40.481457+00
113	Sunil raebarelly	\N	\N	\N	dealer	0	2026-04-07 21:28:40.482621+00
114	Sachin Allahabad	\N	\N	\N	dealer	0	2026-04-07 21:28:40.483808+00
115	SANTRAM	\N	\N	\N	dealer	15620	2026-04-07 21:28:40.48518+00
116	shailendar kumar	\N	\N	\N	dealer	4258.9	2026-04-07 21:28:40.486625+00
117	AJEET SINGH	\N	\N	\N	dealer	368050	2026-04-07 21:28:40.488166+00
118	AKSHAY SINGH	\N	\N	\N	dealer	27000	2026-04-07 21:28:40.489581+00
119	SAURABH SINGH	\N	\N	\N	dealer	35750	2026-04-07 21:28:40.490734+00
120	VINAY KUMAR JAISWAL	\N	\N	\N	dealer	20000	2026-04-07 21:28:40.492043+00
121	VAKIL SAHAB	\N	\N	\N	dealer	0	2026-04-07 21:28:40.493189+00
122	VIVEK SHUKLA GONDA	\N	\N	\N	dealer	213500	2026-04-07 21:28:40.494409+00
123	VERMA TANDA	\N	\N	\N	dealer	0	2026-04-07 21:28:40.495551+00
124	VERMA BASTI	\N	\N	\N	dealer	6400	2026-04-07 21:28:40.496653+00
125	Yadav Gonda	\N	\N	\N	dealer	472700	2026-04-07 21:28:40.498275+00
126	UDIT YADAV SITAPUR	\N	\N	\N	dealer	7940	2026-04-07 21:28:40.499761+00
127	Upendra Jaiswal	\N	\N	\N	dealer	61455	2026-04-07 21:28:40.501922+00
128	Javed Sir	\N	\N	\N	dealer	-31500	2026-04-07 21:28:40.504271+00
129	ABHIJIT AGARWAL	\N	\N	\N	dealer	217310	2026-04-07 21:28:40.505746+00
130	Ajay Transport	\N	\N	\N	dealer	1.1812484e+06	2026-04-07 21:28:40.507164+00
131	Archit Construction	\N	\N	\N	dealer	689601	2026-04-07 21:28:40.50844+00
132	Bharat Article	\N	\N	\N	dealer	32230	2026-04-07 21:28:40.509615+00
133	Ram Krishna Shukla	\N	\N	\N	dealer	613050	2026-04-07 21:28:40.510825+00
134	Santosh Singh	\N	\N	\N	dealer	1.005265e+06	2026-04-07 21:28:40.512166+00
135	HIMANSHU SINGH	\N	\N	\N	dealer	577052.75	2026-04-07 21:28:40.513463+00
136	ANURAG SINGH	\N	\N	\N	dealer	1.779981e+06	2026-04-07 21:28:40.514803+00
137	MARVA CEMENT	\N	\N	\N	dealer	305728	2026-04-07 21:28:40.515991+00
138	Neeraj Gupta	\N	\N	\N	dealer	498125.5	2026-04-07 21:28:40.517452+00
139	SANDEEP KARSA	\N	\N	\N	dealer	-3.68912e+06	2026-04-07 21:28:40.51935+00
140	Vivek Singh	\N	\N	\N	dealer	623990	2026-04-07 21:28:40.520919+00
141	Yash Builders	\N	\N	\N	dealer	954656	2026-04-07 21:28:40.522164+00
142	UTCL Lucknow	\N	\N	\N	dealer	70000	2026-04-07 21:28:40.523499+00
143	Birla SHyam	\N	\N	\N	dealer	50000	2026-04-07 21:28:40.52497+00
144	Birla Mahatejas	\N	\N	\N	dealer	50000	2026-04-07 21:28:40.526368+00
145	ACC Berhni	\N	\N	\N	dealer	291060	2026-04-07 21:28:40.527852+00
146	Birla D	\N	\N	\N	dealer	0	2026-04-07 21:28:40.529413+00
147	BIRLA Satna	\N	\N	\N	dealer	435060	2026-04-07 21:28:40.530634+00
148	SHUBHAM ENTERPRISES	\N	\N	\N	dealer	0	2026-04-07 21:28:40.53185+00
149	Gaurav Jaiswal	\N	\N	\N	dealer	1.152633e+06	2026-04-07 21:28:40.532973+00
150	GLOBAL ENTERPRISES	\N	\N	\N	dealer	-11.8	2026-04-07 21:28:40.534261+00
151	KUMAR BUILDERS	\N	\N	\N	dealer	0	2026-04-07 21:28:40.536046+00
152	Sagarmatha OPC Cement	\N	\N	\N	dealer	1.26e+06	2026-04-07 21:28:40.537669+00
153	Tansen	\N	\N	\N	dealer	1.85316e+06	2026-04-07 21:28:40.539083+00
154	VRINDAVAN BIHARI	\N	\N	\N	dealer	89900	2026-04-07 21:28:40.540324+00
155	RP ASSOCIATE	\N	\N	\N	dealer	78000	2026-04-07 21:28:40.541536+00
156	SAMARA ENTERPRISES	\N	\N	\N	dealer	0	2026-04-07 21:28:40.542757+00
157	MAHAKAL LLP	\N	\N	\N	dealer	0	2026-04-07 21:28:40.54412+00
158	RAJNISH MISHRA	\N	\N	\N	dealer	144000	2026-04-07 21:28:40.545361+00
159	Shree Cement	\N	\N	\N	dealer	-2.215643e+06	2026-04-07 21:28:40.546603+00
160	PINTU SULTANPUR	\N	\N	\N	dealer	-240000	2026-04-07 21:28:40.548183+00
161	Bangur cement	\N	\N	\N	dealer	371850	2026-04-07 21:28:40.549474+00
162	PACHERIA GONDA	\N	\N	\N	dealer	549520	2026-04-07 21:28:40.550821+00
163	JK Cement	\N	\N	\N	dealer	235360	2026-04-07 21:28:40.552462+00
164	NET PROFIT	\N	\N	\N	dealer	0	2026-04-07 21:28:40.554072+00
165	PRIYANSHU singh	\N	\N	\N	dealer	0	2026-04-07 21:28:40.62799+00
166	Vivek 1	\N	\N	\N	dealer	0	2026-04-07 21:28:41.119221+00
167	OP AZAMGARH	\N	\N	\N	dealer	0	2026-04-07 21:28:41.589055+00
168	RAHUL KAKORI	\N	\N	\N	dealer	0	2026-04-07 21:28:41.71234+00
169	ABHISHEK JAUNPUR	\N	\N	\N	dealer	0	2026-04-07 21:28:41.717435+00
170	RK Shukla	\N	\N	\N	dealer	0	2026-04-07 21:28:41.763404+00
171	Anoop Fzb	\N	\N	\N	dealer	0	2026-04-07 21:28:42.004221+00
172	manish singh	\N	\N	\N	dealer	0	2026-04-07 21:28:42.073331+00
173	Dhanraj	\N	\N	\N	dealer	0	2026-04-07 21:28:42.240841+00
174	A S ENTERPRISES	\N	\N	\N	dealer	0	2026-04-07 21:28:42.324448+00
175	BHALE SULTAN	\N	\N	\N	dealer	0	2026-04-07 21:28:42.326895+00
176	Sanjay singh	\N	\N	\N	dealer	0	2026-04-07 21:28:42.769592+00
177	MJD TILES	\N	\N	\N	dealer	0	2026-04-07 21:28:43.24752+00
178	shailendra	\N	\N	\N	dealer	0	2026-04-07 21:28:43.365478+00
179	VINOD SINGH RUDAULI	\N	\N	\N	dealer	0	2026-04-07 21:28:43.39062+00
180	sobhai pradhan	\N	\N	\N	dealer	0	2026-04-07 21:28:43.394293+00
181	PRINCE TRANSPORT	\N	\N	\N	dealer	0	2026-04-07 21:28:43.396491+00
182	PRASANT BARABANKI	\N	\N	\N	dealer	0	2026-04-07 21:28:43.411185+00
183	fauiji traders	\N	\N	\N	dealer	0	2026-04-07 21:28:43.469144+00
184	JK CONSTRUCTION	\N	\N	\N	dealer	0	2026-04-07 21:28:43.567381+00
185	KUMAR MISHRA	\N	\N	\N	dealer	0	2026-04-07 21:28:43.58088+00
186	Arvind Azamgarh	\N	\N	\N	dealer	0	2026-04-07 21:28:43.70467+00
187	RAJNEESH MISHRA	\N	\N	\N	dealer	0	2026-04-07 21:28:43.730664+00
188	UPENDERA JAISWAL	\N	\N	\N	dealer	0	2026-04-07 21:28:43.757414+00
189	OP YADAV	\N	\N	\N	dealer	0	2026-04-07 21:28:43.76732+00
190	INDIa ENTERPRISES	\N	\N	\N	dealer	0	2026-04-07 21:28:43.823545+00
191	SOBHIT SINGH	\N	\N	\N	dealer	0	2026-04-07 21:28:43.829359+00
192	JAGDISHPUR	\N	\N	\N	dealer	0	2026-04-07 21:28:43.897424+00
193	SHIVAM SINGH KADIPUR	\N	\N	\N	dealer	0	2026-04-07 21:28:43.993815+00
194	AJAY GOODS CAREER	\N	\N	\N	dealer	0	2026-04-07 21:28:44.014395+00
195	AMIT MISHRA	\N	\N	\N	dealer	0	2026-04-07 21:28:44.599526+00
196	AMIT MISHRA BEHRAICH	\N	\N	\N	dealer	0	2026-04-07 21:28:44.782833+00
197	NIKIL SINGH	\N	\N	\N	dealer	0	2026-04-07 21:28:44.833802+00
198	PACHERIYA GONDA	\N	\N	\N	dealer	0	2026-04-07 21:28:44.973216+00
199	AJIT SINGH	\N	\N	\N	dealer	0	2026-04-07 21:28:44.990547+00
200	PANKAJ RMC	\N	\N	\N	dealer	0	2026-04-07 21:28:45.091939+00
201	SINGH CONSTRUCTION	\N	\N	\N	dealer	0	2026-04-07 21:28:45.128409+00
202	MAUDA GODOWN	\N	\N	\N	dealer	0	2026-04-07 21:28:45.246522+00
203	CS Collage of nursing	\N	\N	\N	dealer	0	2026-04-07 21:28:45.259299+00
204	SHUKLA LUCKNOW	\N	\N	\N	dealer	0	2026-04-07 21:28:45.426263+00
205	Subhadip S	7908631466	Bengaluru	Bengaluru	contractor	0	2026-04-08 05:23:32.263442+00
206	ABC	0000000000	Bengaluru	Bengaluru	contractor	0	2026-04-08 19:00:29.60688+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, date, party_id, amount, mode, bank_name, remarks, created_at) FROM stdin;
1	2025-10-04	74	245700	bank	ARMTECH	LAXMI CEMENT AGENCY	2026-04-07 21:28:40.589797+00
2	2025-10-31	74	249300	bank	ARMTECH	LAXMI CEMENT AGENCY	2026-04-07 21:28:40.591704+00
840	2026-03-25	108	205200	bank	ARMTECH	BALAJI ASS	2026-04-07 21:28:41.57984+00
7	2026-02-28	74	285000	bank	ARMTECH	LAXMI CEMENT AGENCY	2026-04-07 21:28:40.59737+00
9	2026-03-27	74	280000	bank	ARMTECH	LAXMI CEMENT AGENCY	2026-04-07 21:28:40.599652+00
10	2026-03-31	74	224000	bank	ARMTECH	LAXMI CEMENT AGENCY	2026-04-07 21:28:40.600645+00
12	2026-01-20	4	49900	bank	ARMTECH	NOVA CONSTRUCTION	2026-04-07 21:28:40.603049+00
13	2026-01-20	4	100	bank	ARMTECH	NOVA CONSTRUCTION	2026-04-07 21:28:40.604154+00
14	2026-01-30	4	90000	bank	ARMTECH	NOVA CONSTRUCTION	2026-04-07 21:28:40.605233+00
15	2026-02-25	4	50000	bank	ARMTECH	NOVA CONSTRUCTION	2026-04-07 21:28:40.606417+00
16	2025-08-09	59	140000	bank	\N	\N	2026-04-07 21:28:40.611463+00
17	2025-08-11	59	24240	cash	\N	Freight	2026-04-07 21:28:40.612716+00
18	2025-09-22	59	30000	bank	ARMTECH	LATATRAD IN	2026-04-07 21:28:40.614234+00
19	2025-10-03	59	160000	bank	ARMTECH	LATA TRADING COMPANY	2026-04-07 21:28:40.615389+00
20	2025-10-28	59	50000	bank	ARMTECH	LATA TRADING COMPANY	2026-04-07 21:28:40.61646+00
21	2025-11-13	59	200000	bank	ARMTECH	LATA TRADING COMPANY	2026-04-07 21:28:40.617598+00
22	2025-12-10	59	23100	bank	AXIS	LATA TRADING COMPANY	2026-04-07 21:28:40.618775+00
23	2025-12-15	59	100000	bank	ARMTECH	FAIZ AHMAD	2026-04-07 21:28:40.619887+00
25	2025-08-02	165	34500	cash	\N	100 Bags Lost of Tansen	2026-04-07 21:28:40.628939+00
27	2025-08-05	165	54600	cash	\N	Jagdamba Transport	2026-04-07 21:28:40.631171+00
30	2025-08-07	165	13000	cash	\N	Paid to Himanshu Singh	2026-04-07 21:28:40.635551+00
31	2025-08-07	165	20000	cash	\N	Paid to Himanshu Singh	2026-04-07 21:28:40.636902+00
35	2025-08-11	165	35500	cash	\N	Cash Received by Rahul	2026-04-07 21:28:40.641004+00
36	2025-08-16	165	37000	cash	\N	Yadav Fuel	2026-04-07 21:28:40.641798+00
37	2025-08-17	165	54600	cash	\N	\N	2026-04-07 21:28:40.642972+00
38	2025-08-17	165	70000	bank	\N	\N	2026-04-07 21:28:40.64412+00
43	2025-08-25	165	45600	cash	\N	YADAV FUEL	2026-04-07 21:28:40.649402+00
47	2025-08-25	165	20000	cash	\N	YADAV FUEL	2026-04-07 21:28:40.654056+00
48	2025-08-26	165	8000	cash	\N	YADAV FUELS	2026-04-07 21:28:40.65521+00
59	2025-09-08	165	90000	bank	ARMTECH	Priyanshu Singh	2026-04-07 21:28:40.667104+00
64	2025-09-11	165	25000	cash	\N	paid to abhijeet yadav	2026-04-07 21:28:40.672994+00
65	2025-09-11	165	33500	cash	\N	paid to abhijeet yadav	2026-04-07 21:28:40.674314+00
66	2025-09-15	165	53000	bank	KOTAK	PRIYANSHU SINGH	2026-04-07 21:28:40.67545+00
67	2025-09-15	165	19500	bank	KOTAK	PRIYANSHU SINGH	2026-04-07 21:28:40.676548+00
68	2025-09-19	165	19300	cash	\N	YADAV FUELS	2026-04-07 21:28:40.677672+00
69	2025-09-19	165	60000	cash	\N	YADAV FUELS	2026-04-07 21:28:40.678857+00
73	2025-09-27	165	15000	cash	\N	SHIV KUMAR MISHRA	2026-04-07 21:28:40.683716+00
74	2025-09-27	165	95000	bank	BOB	PRIYANSHU SINGH	2026-04-07 21:28:40.685019+00
75	2025-09-28	165	85000	cash	\N	SHIV KUMAR MISHRA	2026-04-07 21:28:40.686195+00
76	2025-09-29	165	290000	bank	ARMTECH	PRIYANSHU SINGH	2026-04-07 21:28:40.687579+00
79	2025-10-01	165	50000	cash	\N	YADAV FUELS	2026-04-07 21:28:40.691303+00
81	2025-10-18	165	40000	cash	\N	RAHUL SAVING	2026-04-07 21:28:40.693703+00
82	2025-10-30	165	274700	bank	BOB	\N	2026-04-07 21:28:40.69477+00
83	2025-10-31	165	30000	cash	\N	RAHUL SIR SAVING	2026-04-07 21:28:40.695935+00
84	2025-11-06	165	30000	cash	\N	HDFC SAVING	2026-04-07 21:28:40.6968+00
85	2025-11-08	165	137200	bank	\N	\N	2026-04-07 21:28:40.698006+00
3	2026-01-16	74	280000	bank	ARMTECH	SHUBHAM BUILDERS	2026-04-07 21:28:40.592795+00
28	2025-08-05	165	60000	bank	ARMTECH	Armtech	2026-04-07 21:28:40.632584+00
63	2025-09-11	165	60000	bank	KOTAK	vivek kumar	2026-04-07 21:28:40.671656+00
87	2025-11-27	165	20000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.700252+00
88	2025-11-28	165	30000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.701484+00
89	2025-12-02	165	40000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.702634+00
60	2025-09-08	165	235200	bank	KOTAK	JANTA CC BRICKS	2026-04-07 21:28:40.668188+00
24	2026-01-22	59	60000	bank	AXIS	\N	2026-04-07 21:28:40.621073+00
26	2025-08-05	165	15000	bank	\N	Buddheshwar | Sender: Buddheshwar	2026-04-07 21:28:40.630035+00
29	2025-08-07	165	47000	bank	\N	Buddheshwar | Sender: Buddheshwar	2026-04-07 21:28:40.634075+00
32	2025-08-08	165	95000	bank	\N	Buddheshwar | Sender: Buddheshwar	2026-04-07 21:28:40.637919+00
33	2025-08-08	165	95000	bank	\N	Buddheshwar | Sender: Buddheshwar	2026-04-07 21:28:40.638717+00
34	2025-08-09	165	30000	bank	\N	Buddheshwar | Sender: Buddheshwar	2026-04-07 21:28:40.639904+00
93	2025-12-08	165	196200	bank	BOB	TRANSFER	2026-04-07 21:28:40.707788+00
100	2025-12-31	165	20000	cash	\N	cash paid to pintu	2026-04-07 21:28:40.715308+00
127	2026-02-26	165	50000	bank	BOB	\N	2026-04-07 21:28:40.7465+00
135	2026-03-17	165	47785.78	bank	AXIS	\N	2026-04-07 21:28:40.75556+00
136	2026-03-18	165	80000	bank	BOB	\N	2026-04-07 21:28:40.756627+00
138	2026-03-24	165	30000	bank	BOB	\N	2026-04-07 21:28:40.758691+00
139	2026-03-25	165	50000	bank	BOB	\N	2026-04-07 21:28:40.759862+00
140	2026-03-25	165	50000	bank	BOB	\N	2026-04-07 21:28:40.761073+00
141	2026-03-25	165	5000	bank	BOB	\N	2026-04-07 21:28:40.762319+00
142	2026-03-28	165	70000	bank	BOB	\N	2026-04-07 21:28:40.763375+00
147	2025-04-19	9	200000	bank	\N	\N	2026-04-07 21:28:40.769583+00
148	2025-05-09	9	20000	cash	\N	\N	2026-04-07 21:28:40.770767+00
149	2025-06-28	9	65000	bank	\N	\N	2026-04-07 21:28:40.771922+00
150	2025-07-22	9	170000	bank	\N	\N	2026-04-07 21:28:40.772938+00
152	2025-08-27	9	60000	bank	\N	\N	2026-04-07 21:28:40.774848+00
155	2025-09-22	9	100000	bank	ARMTECH	ASHUTOSH	2026-04-07 21:28:40.778021+00
156	2025-10-10	9	200000	bank	ARMTECH	ASHUTOSH	2026-04-07 21:28:40.779411+00
157	2025-11-05	9	100000	bank	ARMTECH	ASHUTOSH	2026-04-07 21:28:40.780533+00
168	2026-01-21	64	60000	bank	BOB	\N	2026-04-07 21:28:40.79546+00
174	2026-01-31	64	50000	bank	BOB	\N	2026-04-07 21:28:40.803151+00
175	2026-02-02	64	50000	bank	BOB	\N	2026-04-07 21:28:40.804476+00
177	2025-10-18	125	197000	cash	\N	Javed Sir	2026-04-07 21:28:40.807218+00
178	2025-10-29	125	20000	bank	BOB	\N	2026-04-07 21:28:40.808025+00
179	2025-10-29	125	19900	bank	BOB	\N	2026-04-07 21:28:40.809158+00
180	2025-10-29	125	50000	bank	BOB	\N	2026-04-07 21:28:40.810324+00
181	2025-10-29	125	100	bank	BOB	\N	2026-04-07 21:28:40.811437+00
185	2025-11-10	125	90000	bank	BOB	\N	2026-04-07 21:28:40.816093+00
190	2025-11-24	125	99000	bank	BOB	\N	2026-04-07 21:28:40.821457+00
176	2025-10-10	125	197000	bank	ARMTECH	AMIT YADAV	2026-04-07 21:28:40.806317+00
91	2025-12-04	165	95000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.705142+00
92	2025-12-08	165	40000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.706541+00
94	2025-12-16	165	30000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.7089+00
95	2025-12-20	165	80000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.709972+00
96	2025-12-23	165	35000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.711129+00
97	2025-12-29	165	45000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.712034+00
98	2025-12-30	165	50000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.713204+00
99	2025-12-31	165	95000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.714069+00
101	2026-01-03	165	40000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.716322+00
102	2026-01-03	165	60000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.717492+00
103	2026-01-03	165	40000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.718851+00
104	2026-01-06	165	50000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.720152+00
105	2026-01-07	165	50000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.721264+00
106	2026-01-13	165	50000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.722343+00
107	2026-01-15	165	50000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.723472+00
108	2026-01-15	165	31000	bank	KOTAK	priyanshu singh	2026-04-07 21:28:40.72434+00
158	2025-12-02	9	100000	bank	AXIS	ASHUTOSH	2026-04-07 21:28:40.781559+00
159	2025-12-10	9	100000	bank	AXIS	ASHUTOSH	2026-04-07 21:28:40.782608+00
160	2025-12-29	9	100000	bank	AXIS	ASHUTOSH	2026-04-07 21:28:40.783818+00
161	2026-01-23	9	100000	bank	AXIS	ASHUTOSH	2026-04-07 21:28:40.78513+00
162	2026-02-04	9	100000	bank	AXIS	ASHUTOSH	2026-04-07 21:28:40.786256+00
163	2026-02-21	9	100000	bank	AXIS	ASHUTOSH	2026-04-07 21:28:40.787357+00
164	2026-03-10	9	120000	bank	AXIS	ASHUTOSH	2026-04-07 21:28:40.788421+00
165	2026-03-23	9	100000	bank	AXIS	ASHUTOSH	2026-04-07 21:28:40.789589+00
166	2026-04-06	9	100000	bank	AXIS	ASHUTOSH	2026-04-07 21:28:40.790724+00
167	2026-01-07	64	205000	bank	HDFC	RKYENTERPRRISES	2026-04-07 21:28:40.794423+00
151	2025-08-21	9	150000	bank	\N	ASHUTOSH | Sender: ASHUTOSH	2026-04-07 21:28:40.774009+00
153	2025-09-10	9	90000	bank	\N	ASHUTOSH | Sender: ASHUTOSH	2026-04-07 21:28:40.775673+00
154	2025-09-12	9	90000	bank	\N	ASHUTOSH | Sender: ASHUTOSH	2026-04-07 21:28:40.776916+00
194	2025-12-15	125	80000	bank	BOB	\N	2026-04-07 21:28:40.825736+00
197	2025-12-30	125	96000	bank	BOB	\N	2026-04-07 21:28:40.829099+00
198	2026-01-03	125	98000	bank	BOB	\N	2026-04-07 21:28:40.830253+00
233	2026-02-16	125	39000	bank	BOB	\N	2026-04-07 21:28:40.871129+00
244	2026-03-12	125	25000	bank	KOTAK	\N	2026-04-07 21:28:40.8831+00
245	2026-03-12	125	25000	bank	KOTAK	\N	2026-04-07 21:28:40.884361+00
248	2026-03-18	125	90000	bank	BOB	\N	2026-04-07 21:28:40.887969+00
249	2026-03-22	125	95000	bank	BOB	\N	2026-04-07 21:28:40.88902+00
250	2026-03-23	125	20000	bank	KOTAK	\N	2026-04-07 21:28:40.890202+00
251	2026-03-23	125	20000	bank	KOTAK	\N	2026-04-07 21:28:40.891339+00
252	2026-03-23	125	20000	bank	KOTAK	\N	2026-04-07 21:28:40.892438+00
253	2026-03-23	125	20000	bank	KOTAK	\N	2026-04-07 21:28:40.893575+00
254	2026-03-23	125	10000	bank	KOTAK	\N	2026-04-07 21:28:40.894438+00
255	2026-03-24	125	94000	bank	KOTAK	\N	2026-04-07 21:28:40.895299+00
256	2026-03-28	125	80000	bank	BOB	\N	2026-04-07 21:28:40.896187+00
257	2026-03-28	125	10000	bank	BOB	\N	2026-04-07 21:28:40.897368+00
258	2025-09-01	17	93000	bank	\N	\N	2026-04-07 21:28:40.898911+00
259	2025-09-01	17	61995.28	bank	\N	\N	2026-04-07 21:28:40.89994+00
260	2025-09-02	17	14200	bank	\N	\N	2026-04-07 21:28:40.901168+00
261	2025-09-03	17	51000	bank	ARMTECH	ARVIND KUMAR	2026-04-07 21:28:40.902348+00
262	2025-09-21	17	26500	bank	ARMTECH	PRADHAN	2026-04-07 21:28:40.903482+00
263	2025-09-21	17	26500	bank	ARMTECH	NAVNEET KUMAR	2026-04-07 21:28:40.904612+00
264	2025-09-22	17	25000	bank	ARMTECH	ARVIND KUMAR	2026-04-07 21:28:40.905675+00
265	2025-09-23	17	29200	bank	ARMTECH	AKBARPUR	2026-04-07 21:28:40.906862+00
266	2025-10-03	17	14000	bank	ARMTECH	ARVIND KUMAR	2026-04-07 21:28:40.908015+00
267	2025-10-09	17	34000	bank	ARMTECH	ARVIND KUMAR	2026-04-07 21:28:40.909127+00
268	2025-10-10	17	90000	bank	ARMTECH	ARVIND KUMAR	2026-04-07 21:28:40.910543+00
269	2025-10-10	17	114000	bank	ARMTECH	RKY ENTERPRISES	2026-04-07 21:28:40.911751+00
270	2025-10-10	17	30000	bank	ARMTECH	ARVIND KUMAR	2026-04-07 21:28:40.913158+00
271	2025-10-14	17	39750	bank	ARMTECH	PRADHAN ENTERPRISES	2026-04-07 21:28:40.914425+00
272	2025-10-16	17	120000	bank	ARMTECH	\N	2026-04-07 21:28:40.915494+00
273	2025-11-01	17	54600	cash	\N	paid to jagdamba transport	2026-04-07 21:28:40.916592+00
276	2025-11-02	17	40000	bank	ARMTECH	ARVIND KUMAR VERMA	2026-04-07 21:28:40.920318+00
277	2025-11-03	17	15000	bank	BOB	\N	2026-04-07 21:28:40.921292+00
278	2025-11-03	17	500	bank	BOB	\N	2026-04-07 21:28:40.922424+00
279	2025-11-07	17	50000	bank	ARMTECH	ARVIND AT AKBARPUR	2026-04-07 21:28:40.923504+00
280	2025-11-07	17	31000	bank	BOB	ratneshkumarmishra1	2026-04-07 21:28:40.924639+00
281	2025-11-08	17	14000	bank	ARMTECH	ARVIND KUMAR VERMA	2026-04-07 21:28:40.925873+00
282	2025-11-09	17	49999	bank	ARMTECH	PRADHAN ENT	2026-04-07 21:28:40.92701+00
285	2025-11-10	17	43000	bank	ARMTECH	PRADHAN ENT	2026-04-07 21:28:40.930423+00
291	2025-11-11	17	68000	bank	ARMTECH	ARVIND KUMAR VERMA	2026-04-07 21:28:40.93729+00
195	2025-12-22	125	95000	bank	BOB	\N	2026-04-07 21:28:40.826869+00
210	2026-02-01	125	100	bank	ARMTECH	Ashish Yadav	2026-04-07 21:28:40.843774+00
211	2026-02-01	125	50000	bank	ARMTECH	Ashish Yadav	2026-04-07 21:28:40.844877+00
212	2026-02-01	125	47900	bank	ARMTECH	Ashish Yadav	2026-04-07 21:28:40.846044+00
289	2025-11-10	17	69995	bank	ARMTECH	PRANJAL CONSTRUCTION	2026-04-07 21:28:40.935098+00
288	2025-11-10	17	30000	bank	ARMTECH	RANA	2026-04-07 21:28:40.933825+00
199	2026-01-07	125	99000	bank	KOTAK	Ashish Yadav	2026-04-07 21:28:40.831398+00
213	2026-02-07	125	16000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.847229+00
214	2026-02-07	125	16000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.848374+00
215	2026-02-07	125	16000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.849517+00
216	2026-02-07	125	16000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.850706+00
217	2026-02-07	125	16000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.852048+00
219	2026-02-08	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.854411+00
220	2026-02-08	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.855612+00
221	2026-02-08	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.857053+00
222	2026-02-08	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.858402+00
223	2026-02-08	125	15000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.859816+00
225	2026-02-12	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.861961+00
226	2026-02-12	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.863068+00
227	2026-02-12	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.864219+00
228	2026-02-12	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.865418+00
230	2026-02-16	125	25000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.867537+00
231	2026-02-16	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.868818+00
232	2026-02-16	125	16000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.870071+00
237	2026-02-28	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.875634+00
292	2025-11-11	17	150000	bank	ARMTECH	PRADHAN ENT	2026-04-07 21:28:40.93836+00
293	2025-11-12	17	80000	bank	ARMTECH	ARVIND KUMAR VERMA	2026-04-07 21:28:40.939549+00
294	2025-11-14	17	92000	bank	BOB	\N	2026-04-07 21:28:40.940684+00
295	2025-11-14	17	10000	bank	BOB	\N	2026-04-07 21:28:40.94186+00
296	2025-11-17	17	192000	bank	ARMTECH	ARVIND KUMAR VERMA	2026-04-07 21:28:40.942975+00
297	2025-11-17	17	15000	bank	ARMTECH	ARVIND KUMAR VERMA	2026-04-07 21:28:40.944157+00
298	2025-11-25	17	100000	bank	AXIS	AZAMGARH	2026-04-07 21:28:40.94525+00
299	2025-11-25	17	15000	bank	AXIS	AZAMGARH	2026-04-07 21:28:40.946337+00
301	2025-11-29	17	31000	bank	ARMTECH	PRADHAN ENT	2026-04-07 21:28:40.948749+00
302	2025-11-30	17	50000	bank	BOB	\N	2026-04-07 21:28:40.94998+00
303	2025-12-01	17	31000	bank	ARMTECH	PRADHAN ENT	2026-04-07 21:28:40.9512+00
304	2025-12-01	17	46700	bank	ARMTECH	PRADHAN ENT	2026-04-07 21:28:40.952454+00
310	2025-12-10	17	25000	bank	ARMTECH	ARVIND	2026-04-07 21:28:40.958884+00
311	2025-12-10	17	50000	bank	ARMTECH	RANA SANGA	2026-04-07 21:28:40.96008+00
312	2025-12-11	17	44000	bank	ARMTECH	RANA SANGA	2026-04-07 21:28:40.961295+00
313	2025-12-11	17	15000	bank	BOB	\N	2026-04-07 21:28:40.962339+00
314	2025-12-12	17	33000	bank	BOB	\N	2026-04-07 21:28:40.963435+00
315	2025-12-14	17	50000	bank	BOB	\N	2026-04-07 21:28:40.964619+00
316	2025-12-15	17	31800	bank	ARMTECH	ARVIND KUMAR VERMA	2026-04-07 21:28:40.966069+00
317	2025-12-16	17	31000	bank	ARMTECH	PRADHAN ENT	2026-04-07 21:28:40.967544+00
318	2025-12-17	17	31000	bank	BOB	\N	2026-04-07 21:28:40.969183+00
319	2025-12-17	17	72000	bank	ARMTECH	SARITA ENTERPRISES	2026-04-07 21:28:40.970762+00
320	2025-12-18	17	100000	bank	ARMTECH	ADITI CONSTRUCTION	2026-04-07 21:28:40.971859+00
321	2025-12-20	17	50000	bank	ARMTECH	ARVIND KUMAR VERMA	2026-04-07 21:28:40.973025+00
322	2025-12-20	17	40000	bank	BOB	\N	2026-04-07 21:28:40.974133+00
323	2025-12-20	17	20000	bank	BOB	\N	2026-04-07 21:28:40.975204+00
324	2025-12-20	17	60000	bank	BOB	\N	2026-04-07 21:28:40.97635+00
325	2025-12-23	17	20000	bank	BOB	\N	2026-04-07 21:28:40.977595+00
326	2025-12-23	17	34500	bank	BOB	\N	2026-04-07 21:28:40.978584+00
327	2025-12-23	17	90000	bank	BOB	\N	2026-04-07 21:28:40.97967+00
328	2025-12-24	17	37100	bank	BOB	\N	2026-04-07 21:28:40.980599+00
329	2025-12-26	17	47250	bank	ARMTECH	MAADURG	2026-04-07 21:28:40.98181+00
330	2026-01-05	17	70000	bank	BOB	\N	2026-04-07 21:28:40.98294+00
364	2026-03-25	17	50000	bank	BOB	\N	2026-04-07 21:28:41.023164+00
365	2026-03-25	17	50000	bank	BOB	\N	2026-04-07 21:28:41.024541+00
366	2026-03-25	17	38000	bank	BOB	\N	2026-04-07 21:28:41.025965+00
368	2025-04-07	138	15000	bank	\N	\N	2026-04-07 21:28:41.031432+00
369	2025-04-07	138	114700	bank	\N	\N	2026-04-07 21:28:41.032883+00
370	2025-04-12	138	200000	bank	\N	\N	2026-04-07 21:28:41.034287+00
371	2025-04-12	138	140000	bank	\N	\N	2026-04-07 21:28:41.035787+00
372	2025-04-14	138	200000	bank	\N	\N	2026-04-07 21:28:41.037325+00
373	2025-04-14	138	9250	cash	\N	\N	2026-04-07 21:28:41.038895+00
374	2025-04-17	138	150000	bank	\N	\N	2026-04-07 21:28:41.039919+00
375	2025-04-18	138	500000	bank	\N	\N	2026-04-07 21:28:41.041133+00
376	2025-04-29	138	97000	bank	\N	\N	2026-04-07 21:28:41.042274+00
377	2025-04-30	138	187500	bank	\N	\N	2026-04-07 21:28:41.043431+00
378	2025-05-04	138	150000	bank	\N	\N	2026-04-07 21:28:41.044531+00
379	2025-05-06	138	125000	bank	\N	\N	2026-04-07 21:28:41.045716+00
380	2025-05-10	138	124605	cash	\N	\N	2026-04-07 21:28:41.046825+00
381	2025-05-10	138	270000	bank	\N	\N	2026-04-07 21:28:41.048212+00
382	2025-05-13	138	307000	bank	\N	\N	2026-04-07 21:28:41.049198+00
383	2025-05-15	138	100000	bank	\N	\N	2026-04-07 21:28:41.050112+00
384	2025-05-27	138	50000	bank	\N	\N	2026-04-07 21:28:41.051513+00
385	2025-05-27	138	125000	bank	\N	\N	2026-04-07 21:28:41.052939+00
386	2025-05-28	138	150000	bank	\N	\N	2026-04-07 21:28:41.054189+00
387	2025-05-29	138	150000	bank	\N	\N	2026-04-07 21:28:41.055258+00
388	2025-05-31	138	125000	bank	\N	\N	2026-04-07 21:28:41.05644+00
389	2025-06-02	138	200000	bank	\N	\N	2026-04-07 21:28:41.057325+00
390	2025-06-04	138	200000	bank	\N	\N	2026-04-07 21:28:41.0585+00
391	2025-06-05	138	150000	bank	\N	\N	2026-04-07 21:28:41.059648+00
392	2025-06-09	138	100000	bank	\N	\N	2026-04-07 21:28:41.060455+00
393	2025-06-12	138	100000	bank	\N	\N	2026-04-07 21:28:41.061212+00
394	2025-06-17	138	190000	bank	\N	\N	2026-04-07 21:28:41.061942+00
337	2026-01-13	17	80000	bank	ARMTECH	arvind verma	2026-04-07 21:28:40.991196+00
338	2026-01-18	17	49999	bank	ARMTECH	PRADHANENT	2026-04-07 21:28:40.992247+00
339	2026-01-18	17	48800	bank	ARMTECH	PRADHANENT	2026-04-07 21:28:40.993381+00
340	2026-01-19	17	25000	bank	ARMTECH	arvind verma	2026-04-07 21:28:40.994557+00
341	2026-01-19	17	15000	bank	ARMTECH	arvind verma	2026-04-07 21:28:40.995456+00
343	2026-01-29	17	40000	bank	ARMTECH	arvind verma	2026-04-07 21:28:40.997842+00
344	2026-02-02	17	60000	bank	ARMTECH	arvind verma	2026-04-07 21:28:40.999048+00
345	2026-02-02	17	40000	bank	ARMTECH	arvind verma	2026-04-07 21:28:41.000239+00
347	2026-02-04	17	24995	bank	ARMTECH	SHASHIKALA YADAV	2026-04-07 21:28:41.002937+00
348	2026-02-06	17	31000	bank	ARMTECH	PRADHANENT	2026-04-07 21:28:41.004127+00
352	2026-02-09	17	49999	bank	ARMTECH	PRADHANENT	2026-04-07 21:28:41.008557+00
353	2026-02-09	17	8901	bank	ARMTECH	PRADHANENT	2026-04-07 21:28:41.009702+00
355	2026-02-18	17	100000	bank	ARMTECH	DG ECO BRICK ENTERPRISES	2026-04-07 21:28:41.012071+00
356	2026-02-20	17	31000	bank	ARMTECH	PRADHANENT	2026-04-07 21:28:41.013118+00
359	2026-03-10	17	31000	bank	ARMTECH	PRADHANENT	2026-04-07 21:28:41.016903+00
360	2026-03-11	17	30000	bank	ARMTECH	arvind verma	2026-04-07 21:28:41.0183+00
362	2026-03-21	17	40000	bank	ARMTECH	\N	2026-04-07 21:28:41.020921+00
309	2025-12-09	17	94500	bank	AXIS	RAJ ENTERPRISEs	2026-04-07 21:28:40.957993+00
395	2025-06-19	138	77000	bank	\N	\N	2026-04-07 21:28:41.062869+00
396	2025-06-20	138	150000	bank	\N	\N	2026-04-07 21:28:41.06401+00
397	2025-06-24	138	150000	bank	\N	\N	2026-04-07 21:28:41.065202+00
398	2025-06-27	138	250000	bank	\N	\N	2026-04-07 21:28:41.066274+00
399	2025-06-30	138	100000	bank	\N	\N	2026-04-07 21:28:41.067484+00
400	2025-07-04	138	100000	bank	\N	\N	2026-04-07 21:28:41.068799+00
401	2025-07-07	138	100000	bank	\N	\N	2026-04-07 21:28:41.070006+00
402	2025-07-08	138	50000	bank	\N	\N	2026-04-07 21:28:41.071098+00
403	2025-07-09	138	99000	bank	\N	\N	2026-04-07 21:28:41.072173+00
404	2025-07-12	138	150000	bank	\N	\N	2026-04-07 21:28:41.073084+00
405	2025-07-14	138	100000	bank	\N	\N	2026-04-07 21:28:41.074192+00
406	2025-07-20	138	150000	bank	\N	\N	2026-04-07 21:28:41.075393+00
407	2025-07-24	138	200000	bank	\N	\N	2026-04-07 21:28:41.076529+00
408	2025-07-24	138	8000	cash	\N	\N	2026-04-07 21:28:41.077701+00
409	2025-07-27	138	300000	bank	\N	\N	2026-04-07 21:28:41.078984+00
410	2025-07-30	138	250000	bank	\N	\N	2026-04-07 21:28:41.080042+00
413	2025-08-02	138	79500	bank	\N	\N	2026-04-07 21:28:41.084024+00
414	2028-08-03	138	61915	bank	\N	\N	2026-04-07 21:28:41.085486+00
415	2028-08-03	138	89100	bank	\N	\N	2026-04-07 21:28:41.086947+00
416	2025-08-18	138	150000	bank	\N	\N	2026-04-07 21:28:41.088012+00
417	2025-08-20	138	150000	bank	\N	\N	2026-04-07 21:28:41.088953+00
418	2025-08-22	138	125000	bank	\N	\N	2026-04-07 21:28:41.089858+00
419	2025-08-27	138	200000	cash	\N	\N	2026-04-07 21:28:41.090994+00
420	2025-09-02	138	25000	bank	\N	\N	2026-04-07 21:28:41.092266+00
421	2025-09-03	138	152500	cash	\N	\N	2026-04-07 21:28:41.093475+00
422	2025-09-03	138	155000	cash	\N	\N	2026-04-07 21:28:41.094595+00
423	2025-09-09	138	200000	bank	\N	\N	2026-04-07 21:28:41.095571+00
424	2025-09-12	138	152500	cash	\N	\N	2026-04-07 21:28:41.096637+00
425	2025-10-10	138	140000	cash	\N	\N	2026-04-07 21:28:41.097821+00
426	2025-10-15	138	140000	cash	\N	\N	2026-04-07 21:28:41.099001+00
427	2025-10-25	138	137500	cash	\N	\N	2026-04-07 21:28:41.100217+00
428	2025-10-28	138	137500	cash	\N	\N	2026-04-07 21:28:41.101376+00
429	2025-11-01	138	100000	bank	KOTAK	KOTAK	2026-04-07 21:28:41.102538+00
430	2025-11-07	138	220000	bank	KOTAK	KOTAK	2026-04-07 21:28:41.103654+00
431	2025-11-13	138	137500	cash	\N	sonu yadav	2026-04-07 21:28:41.104718+00
432	2025-11-20	138	137500	cash	\N	sonu yadav	2026-04-07 21:28:41.105907+00
433	2025-11-29	138	140000	cash	\N	\N	2026-04-07 21:28:41.107+00
434	2025-12-09	138	140000	cash	\N	SONU	2026-04-07 21:28:41.108177+00
435	2025-12-17	138	137500	cash	\N	SONU	2026-04-07 21:28:41.109024+00
436	2025-12-28	138	110000	cash	\N	ABDUL DUBAGGA	2026-04-07 21:28:41.110144+00
437	2025-12-28	138	27500	cash	\N	SONU YADAV	2026-04-07 21:28:41.111362+00
438	2025-06-06	166	15000	cash	\N	\N	2026-04-07 21:28:41.12039+00
439	2025-06-07	166	15000	cash	\N	\N	2026-04-07 21:28:41.12155+00
440	2025-06-15	166	26000	cash	\N	\N	2026-04-07 21:28:41.122589+00
441	2025-06-20	166	60000	cash	\N	\N	2026-04-07 21:28:41.123783+00
442	2025-06-21	166	172500	bank	\N	\N	2026-04-07 21:28:41.124904+00
443	2025-06-21	166	150000	bank	\N	\N	2026-04-07 21:28:41.126181+00
444	2025-06-24	166	20000	bank	\N	\N	2026-04-07 21:28:41.127199+00
445	2025-06-25	166	100000	bank	\N	\N	2026-04-07 21:28:41.128312+00
446	2025-06-26	166	175500	bank	\N	\N	2026-04-07 21:28:41.129516+00
447	2025-06-27	166	60000	cash	\N	cash	2026-04-07 21:28:41.131587+00
448	2025-07-02	166	50000	bank	\N	\N	2026-04-07 21:28:41.132599+00
449	2025-07-02	166	5000	cash	\N	\N	2026-04-07 21:28:41.133723+00
450	2025-07-04	166	15000	bank	\N	\N	2026-04-07 21:28:41.135011+00
451	2025-07-05	166	5000	cash	\N	\N	2026-04-07 21:28:41.136195+00
452	2025-07-05	166	20000	cash	\N	\N	2026-04-07 21:28:41.137361+00
453	2025-07-07	166	2000	cash	\N	\N	2026-04-07 21:28:41.138411+00
454	2025-07-09	166	25000	bank	\N	\N	2026-04-07 21:28:41.139526+00
455	2025-07-09	166	26000	bank	\N	\N	2026-04-07 21:28:41.140438+00
456	2025-07-09	166	2000	bank	\N	\N	2026-04-07 21:28:41.141574+00
457	2025-07-11	166	10000	cash	\N	\N	2026-04-07 21:28:41.142706+00
458	2025-07-12	166	10000	bank	\N	\N	2026-04-07 21:28:41.143934+00
459	2025-07-12	166	149800	bank	\N	\N	2026-04-07 21:28:41.145088+00
460	2025-07-12	166	36500	cash	\N	\N	2026-04-07 21:28:41.146475+00
461	2025-07-14	166	2000	cash	\N	\N	2026-04-07 21:28:41.147923+00
462	2025-07-15	166	27750	cash	\N	\N	2026-04-07 21:28:41.149351+00
463	2025-07-20	166	50000	cash	\N	\N	2026-04-07 21:28:41.150443+00
464	2025-07-25	166	55000	bank	\N	\N	2026-04-07 21:28:41.151898+00
465	2025-07-25	166	2550	cash	\N	\N	2026-04-07 21:28:41.153262+00
466	2025-07-26	166	55000	cash	\N	\N	2026-04-07 21:28:41.154502+00
467	2025-07-26	166	104500	cash	\N	\N	2026-04-07 21:28:41.155566+00
468	2025-07-26	166	20000	cash	\N	ambey ki chowki	2026-04-07 21:28:41.156659+00
469	2025-07-26	166	10000	cash	\N	\N	2026-04-07 21:28:41.157871+00
470	2025-07-26	166	20000	cash	\N	royal station	2026-04-07 21:28:41.159031+00
471	2025-07-26	166	19000	cash	\N	\N	2026-04-07 21:28:41.159942+00
472	2025-07-27	166	75550	bank	\N	\N	2026-04-07 21:28:41.16105+00
473	2025-07-28	166	47000	bank	\N	\N	2026-04-07 21:28:41.162189+00
474	2025-08-01	166	244950	bank	\N	\N	2026-04-07 21:28:41.163462+00
475	2025-08-04	166	140000	bank	\N	\N	2026-04-07 21:28:41.164682+00
476	2025-08-04	166	69000	bank	\N	\N	2026-04-07 21:28:41.165645+00
477	2025-08-04	166	40000	bank	\N	\N	2026-04-07 21:28:41.166857+00
479	2025-08-07	166	35000	cash	\N	\N	2026-04-07 21:28:41.169212+00
480	2025-08-13	166	50000	bank	\N	\N	2026-04-07 21:28:41.170395+00
481	2025-08-13	166	20000	bank	\N	\N	2026-04-07 21:28:41.171398+00
482	2025-08-13	166	17000	bank	\N	\N	2026-04-07 21:28:41.17262+00
483	2025-08-14	166	80000	bank	\N	\N	2026-04-07 21:28:41.173612+00
484	2025-08-16	166	53500	bank	\N	\N	2026-04-07 21:28:41.174551+00
485	2025-08-17	166	50000	bank	\N	\N	2026-04-07 21:28:41.175606+00
486	2025-08-19	166	203550	bank	\N	\N	2026-04-07 21:28:41.176438+00
487	2025-08-20	166	186000	bank	\N	\N	2026-04-07 21:28:41.177572+00
488	2025-08-21	166	7200	bank	\N	\N	2026-04-07 21:28:41.178712+00
489	2025-08-22	166	2000	bank	\N	\N	2026-04-07 21:28:41.179651+00
490	2025-08-23	166	20400	bank	\N	\N	2026-04-07 21:28:41.180747+00
491	2025-08-26	166	30000	cash	\N	rahul	2026-04-07 21:28:41.181908+00
500	2025-09-04	166	41600	bank	KOTAK	\N	2026-04-07 21:28:41.192611+00
501	2025-09-04	166	50000	bank	ARMTECH	MR AWADHESH KUMAR	2026-04-07 21:28:41.193645+00
502	2025-09-05	166	69000	bank	ARMTECH	AYUSHMAN CONSTRUCTION	2026-04-07 21:28:41.194858+00
503	2025-09-05	166	1	bank	ARMTECH	AYUSHMAN CONSTRUCTION	2026-04-07 21:28:41.196044+00
504	2025-09-08	166	6125	bank	KOTAK	VIVEK KUMAR	2026-04-07 21:28:41.197041+00
505	2025-09-09	166	100	bank	KOTAK	SUNIL KUMAR	2026-04-07 21:28:41.198085+00
506	2025-09-09	166	46900	bank	KOTAK	SUNIL KUMAR	2026-04-07 21:28:41.199126+00
507	2025-09-09	166	16000	bank	KOTAK	SUNIL KUMAR	2026-04-07 21:28:41.200597+00
508	2025-09-09	166	69600	bank	ARMTECH	SANGAM CEMENT WALL COMPANY	2026-04-07 21:28:41.202071+00
509	2025-09-10	166	23390	bank	KOTAK	VIVEK KUMAR	2026-04-07 21:28:41.203493+00
516	2025-09-16	166	70000	bank	KOTAK	MOHAMMAD SAUD	2026-04-07 21:28:41.211183+00
517	2025-09-17	166	100000	bank	ARMTECH	BALAJI ENTERPRISES	2026-04-07 21:28:41.212389+00
518	2025-09-17	166	20000	bank	ARMTECH	BALAJI ENTERPRISES	2026-04-07 21:28:41.213528+00
526	2025-06-06	166	15000	cash	\N	\N	2026-04-07 21:28:41.222431+00
527	2025-06-07	166	15000	cash	\N	\N	2026-04-07 21:28:41.223712+00
528	2025-06-15	166	26000	cash	\N	\N	2026-04-07 21:28:41.224876+00
529	2025-06-20	166	60000	cash	\N	\N	2026-04-07 21:28:41.226173+00
530	2025-06-21	166	172500	bank	\N	\N	2026-04-07 21:28:41.227444+00
531	2025-06-21	166	150000	bank	\N	\N	2026-04-07 21:28:41.228659+00
532	2025-06-24	166	20000	bank	\N	\N	2026-04-07 21:28:41.22969+00
533	2025-06-25	166	100000	bank	\N	\N	2026-04-07 21:28:41.230853+00
534	2025-06-26	166	175500	bank	\N	\N	2026-04-07 21:28:41.231819+00
535	2025-06-27	166	60000	cash	\N	cash	2026-04-07 21:28:41.232952+00
536	2025-07-02	166	50000	bank	\N	\N	2026-04-07 21:28:41.234111+00
537	2025-07-02	166	5000	cash	\N	\N	2026-04-07 21:28:41.235449+00
538	2025-07-04	166	15000	bank	\N	\N	2026-04-07 21:28:41.23662+00
539	2025-07-05	166	5000	cash	\N	\N	2026-04-07 21:28:41.237687+00
540	2025-07-05	166	20000	cash	\N	\N	2026-04-07 21:28:41.238826+00
541	2025-07-07	166	2000	cash	\N	\N	2026-04-07 21:28:41.240014+00
542	2025-07-09	166	25000	bank	\N	\N	2026-04-07 21:28:41.240959+00
543	2025-07-09	166	26000	bank	\N	\N	2026-04-07 21:28:41.241839+00
544	2025-07-09	166	2000	bank	\N	\N	2026-04-07 21:28:41.243051+00
545	2025-07-11	166	10000	cash	\N	\N	2026-04-07 21:28:41.244181+00
546	2025-07-12	166	10000	bank	\N	\N	2026-04-07 21:28:41.245384+00
547	2025-07-12	166	149800	bank	\N	\N	2026-04-07 21:28:41.246488+00
548	2025-07-12	166	36500	cash	\N	\N	2026-04-07 21:28:41.247645+00
549	2025-07-14	166	2000	cash	\N	\N	2026-04-07 21:28:41.248947+00
550	2025-07-15	166	27750	cash	\N	\N	2026-04-07 21:28:41.250232+00
551	2025-07-20	166	50000	cash	\N	\N	2026-04-07 21:28:41.251505+00
552	2025-07-25	166	55000	bank	\N	\N	2026-04-07 21:28:41.252782+00
553	2025-07-25	166	2550	cash	\N	\N	2026-04-07 21:28:41.253972+00
554	2025-07-26	166	55000	cash	\N	\N	2026-04-07 21:28:41.255147+00
555	2025-07-26	166	104500	cash	\N	\N	2026-04-07 21:28:41.256485+00
556	2025-07-26	166	20000	cash	\N	andey ki chowki	2026-04-07 21:28:41.257758+00
557	2025-07-26	166	10000	cash	\N	\N	2026-04-07 21:28:41.259142+00
558	2025-07-26	166	20000	cash	\N	royal fuel station	2026-04-07 21:28:41.260243+00
559	2025-07-26	166	19000	cash	\N	\N	2026-04-07 21:28:41.261332+00
560	2025-07-27	166	75550	bank	\N	\N	2026-04-07 21:28:41.262776+00
561	2025-07-28	166	47000	bank	\N	\N	2026-04-07 21:28:41.263826+00
562	2025-08-01	166	244950	bank	\N	\N	2026-04-07 21:28:41.264869+00
563	2025-08-04	166	140000	bank	\N	\N	2026-04-07 21:28:41.265941+00
564	2025-08-04	166	69000	bank	\N	\N	2026-04-07 21:28:41.266674+00
565	2025-08-04	166	40000	bank	\N	\N	2026-04-07 21:28:41.267476+00
567	2025-08-07	166	35000	cash	\N	\N	2026-04-07 21:28:41.269868+00
568	2025-08-13	166	50000	bank	\N	\N	2026-04-07 21:28:41.270962+00
569	2025-08-13	166	20000	bank	\N	\N	2026-04-07 21:28:41.271985+00
570	2025-08-13	166	17000	bank	\N	\N	2026-04-07 21:28:41.272735+00
571	2025-08-14	166	80000	bank	\N	\N	2026-04-07 21:28:41.273912+00
572	2025-08-16	166	53500	bank	\N	\N	2026-04-07 21:28:41.275034+00
573	2025-08-17	166	50000	bank	\N	\N	2026-04-07 21:28:41.27622+00
574	2025-08-19	166	203550	bank	\N	\N	2026-04-07 21:28:41.277177+00
575	2025-08-20	166	186000	bank	\N	\N	2026-04-07 21:28:41.27822+00
576	2025-08-21	166	7200	bank	\N	\N	2026-04-07 21:28:41.278964+00
577	2025-08-22	166	2000	bank	\N	\N	2026-04-07 21:28:41.279757+00
584	2025-08-23	166	45400	cash	\N	yadav fuel	2026-04-07 21:28:41.287816+00
586	2025-08-23	166	2000	bank	\N	\N	2026-04-07 21:28:41.290039+00
587	2025-08-23	166	20400	bank	\N	\N	2026-04-07 21:28:41.291167+00
590	2025-08-26	166	30000	cash	\N	rahul	2026-04-07 21:28:41.293894+00
594	2025-08-28	166	45500	cash	\N	yadav fuels	2026-04-07 21:28:41.298489+00
595	2025-08-28	166	14400	cash	\N	satendra kumar	2026-04-07 21:28:41.299562+00
605	2025-09-04	166	41600	bank	KOTAK	\N	2026-04-07 21:28:41.311807+00
606	2025-09-04	166	50000	bank	ARMTECH	MR AWADHESH KUMAR	2026-04-07 21:28:41.313239+00
607	2025-09-05	166	69000	bank	ARMTECH	AYUSHMAN CONSTRUCTION	2026-04-07 21:28:41.314308+00
608	2025-09-05	166	1	bank	ARMTECH	AYUSHMAN CONSTRUCTION	2026-04-07 21:28:41.315269+00
514	2025-09-13	166	30000	cash	\N	CASH RECEIVED	2026-04-07 21:28:41.208939+00
510	2025-09-11	166	14000	bank	\N	BALAJI ENTERPRISES | Sender: BALAJI ENTERPRISES	2026-04-07 21:28:41.204818+00
515	2025-09-13	166	18400	bank	\N	SAURABH SINGH | Sender: SAURABH SINGH	2026-04-07 21:28:41.21005+00
609	2025-09-08	166	6125	bank	KOTAK	VIVEK KUMAR	2026-04-07 21:28:41.316257+00
610	2025-09-09	166	100	bank	KOTAK	SUNIL KUMAR	2026-04-07 21:28:41.317544+00
611	2025-09-09	166	25000	cash	\N	cash	2026-04-07 21:28:41.318784+00
612	2025-09-09	166	46900	bank	KOTAK	SUNIL KUMAR	2026-04-07 21:28:41.319865+00
613	2025-09-09	166	16000	bank	KOTAK	SUNIL KUMAR	2026-04-07 21:28:41.320847+00
614	2025-09-09	166	69600	bank	ARMTECH	SANGAM CEMENT WALL COMPANY	2026-04-07 21:28:41.321897+00
615	2025-09-10	166	23390	bank	KOTAK	VIVEK KUMAR	2026-04-07 21:28:41.323037+00
622	2025-09-16	166	70000	bank	KOTAK	MOHAMMAD SAUD	2026-04-07 21:28:41.330448+00
623	2025-09-17	166	100000	bank	ARMTECH	BALAJI ENTERPRISES	2026-04-07 21:28:41.331625+00
624	2025-09-17	166	20000	bank	ARMTECH	BALAJI ENTERPRISES	2026-04-07 21:28:41.332795+00
638	2025-10-05	166	20600	bank	\N	\N	2026-04-07 21:28:41.348201+00
639	2025-10-11	166	2000	cash	\N	cash	2026-04-07 21:28:41.349328+00
640	2025-10-11	166	2400	cash	\N	cash	2026-04-07 21:28:41.350621+00
648	2025-10-28	166	15000	cash	\N	\N	2026-04-07 21:28:41.359265+00
649	2025-10-28	166	9000	cash	\N	\N	2026-04-07 21:28:41.360107+00
650	2025-10-31	166	1	bank	\N	\N	2026-04-07 21:28:41.361236+00
651	2025-10-31	166	60000	bank	\N	\N	2026-04-07 21:28:41.362675+00
652	2025-10-31	166	29000	bank	\N	\N	2026-04-07 21:28:41.364186+00
653	2025-11-01	166	22500	bank	\N	\N	2026-04-07 21:28:41.365477+00
655	2025-11-04	166	48000	bank	\N	\N	2026-04-07 21:28:41.368154+00
656	2025-11-04	166	2000	bank	\N	\N	2026-04-07 21:28:41.36931+00
657	2025-11-06	166	2000	bank	\N	\N	2026-04-07 21:28:41.370573+00
658	2025-11-06	166	78000	bank	\N	\N	2026-04-07 21:28:41.371589+00
659	2025-11-10	166	31000	bank	\N	\N	2026-04-07 21:28:41.372498+00
660	2025-11-11	166	73200	cash	\N	\N	2026-04-07 21:28:41.373708+00
661	2025-11-12	166	26800	cash	\N	shri shyam properties	2026-04-07 21:28:41.37488+00
662	2025-11-15	166	2000	cash	\N	shri shyam properties	2026-04-07 21:28:41.37592+00
663	2025-11-15	166	28800	cash	\N	PAID TO SONU ( PICKUP)	2026-04-07 21:28:41.377052+00
664	2025-11-15	166	30000	cash	\N	paid TO SONU	2026-04-07 21:28:41.378277+00
665	2025-11-17	166	73000	cash	\N	OM ISHWARDEEN MISHRA TRADERS	2026-04-07 21:28:41.379352+00
666	2025-11-17	166	4000	cash	\N	vivek kumar	2026-04-07 21:28:41.380482+00
667	2025-11-18	166	25500	bank	\N	\N	2026-04-07 21:28:41.381677+00
669	2025-11-23	166	30000	bank	\N	\N	2026-04-07 21:28:41.383948+00
670	2025-11-24	166	15000	bank	\N	\N	2026-04-07 21:28:41.385037+00
671	2025-11-25	166	50	bank	\N	\N	2026-04-07 21:28:41.38618+00
672	2025-11-25	166	59550	bank	\N	\N	2026-04-07 21:28:41.387299+00
673	2025-11-25	166	31000	bank	\N	\N	2026-04-07 21:28:41.388249+00
675	2025-11-27	166	50000	bank	\N	\N	2026-04-07 21:28:41.39052+00
676	2025-11-27	166	29000	cash	\N	cash received	2026-04-07 21:28:41.391677+00
677	2025-11-29	166	77000	bank	\N	\N	2026-04-07 21:28:41.39283+00
678	2025-11-29	166	5000	bank	\N	\N	2026-04-07 21:28:41.393733+00
679	2025-11-30	166	43000	bank	\N	\N	2026-04-07 21:28:41.394898+00
681	2025-12-03	166	17500	cash	\N	cash received	2026-04-07 21:28:41.397105+00
682	2025-12-03	166	100000	bank	\N	\N	2026-04-07 21:28:41.399785+00
683	2025-12-03	166	20000	bank	\N	\N	2026-04-07 21:28:41.401113+00
684	2025-12-03	166	43000	bank	\N	\N	2026-04-07 21:28:41.402342+00
685	2025-12-04	166	25000	bank	\N	\N	2026-04-07 21:28:41.403471+00
686	2025-12-05	166	30000	bank	\N	\N	2026-04-07 21:28:41.40457+00
687	2025-12-08	166	20000	bank	\N	\N	2026-04-07 21:28:41.405581+00
688	2025-12-08	166	40000	bank	\N	\N	2026-04-07 21:28:41.406784+00
691	2025-12-09	166	27500	bank	\N	\N	2026-04-07 21:28:41.410024+00
693	2025-12-10	166	20000	bank	\N	\N	2026-04-07 21:28:41.412256+00
695	2025-12-10	166	20000	bank	\N	\N	2026-04-07 21:28:41.413992+00
696	2025-12-12	166	10000	bank	\N	\N	2026-04-07 21:28:41.415216+00
697	2025-12-15	166	38200	cash	\N	CASH RECEIVED	2026-04-07 21:28:41.416213+00
698	2025-12-15	166	27500	cash	\N	CASH RECEIVED	2026-04-07 21:28:41.416976+00
699	2025-12-16	166	25000	bank	\N	\N	2026-04-07 21:28:41.418606+00
700	2025-12-17	166	15000	bank	\N	\N	2026-04-07 21:28:41.420019+00
701	2025-12-17	166	100000	bank	\N	\N	2026-04-07 21:28:41.421323+00
703	2025-12-18	166	25000	bank	\N	\N	2026-04-07 21:28:41.423751+00
704	2025-12-18	166	3000	bank	\N	\N	2026-04-07 21:28:41.424538+00
706	2025-12-20	166	6500	bank	\N	\N	2026-04-07 21:28:41.425974+00
707	2025-12-24	166	32000	bank	\N	\N	2026-04-07 21:28:41.42676+00
708	2025-12-26	166	50000	bank	\N	\N	2026-04-07 21:28:41.427527+00
620	2025-09-13	166	30000	cash	\N	CASH RECEIVED	2026-04-07 21:28:41.328139+00
616	2025-09-11	166	14000	bank	\N	BALAJI ENTERPRISES | Sender: BALAJI ENTERPRISES	2026-04-07 21:28:41.324169+00
621	2025-09-13	166	18400	bank	\N	SAURABH SINGH | Sender: SAURABH SINGH	2026-04-07 21:28:41.329275+00
626	2025-09-24	166	30400	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.335189+00
709	2025-12-26	166	22000	bank	\N	\N	2026-04-07 21:28:41.428241+00
710	2025-12-27	166	30000	bank	\N	\N	2026-04-07 21:28:41.42941+00
711	2025-12-27	166	30000	bank	\N	\N	2026-04-07 21:28:41.430556+00
712	2025-12-29	166	25000	bank	\N	\N	2026-04-07 21:28:41.431869+00
713	2025-12-29	166	5000	bank	\N	\N	2026-04-07 21:28:41.432918+00
714	2025-12-30	166	128100	bank	\N	\N	2026-04-07 21:28:41.434082+00
715	2025-12-31	166	30000	bank	\N	\N	2026-04-07 21:28:41.435327+00
716	2026-01-02	166	20000	bank	\N	\N	2026-04-07 21:28:41.436455+00
717	2026-01-02	166	5000	bank	\N	\N	2026-04-07 21:28:41.437694+00
718	2026-01-03	166	10000	bank	\N	\N	2026-04-07 21:28:41.438988+00
719	2026-01-03	166	10000	bank	\N	\N	2026-04-07 21:28:41.440059+00
720	2026-01-03	166	50000	bank	\N	\N	2026-04-07 21:28:41.441139+00
722	2026-01-06	166	35000	bank	\N	\N	2026-04-07 21:28:41.442971+00
723	2026-01-06	166	10000	cash	\N	\N	2026-04-07 21:28:41.443801+00
724	2026-01-07	166	20000	bank	\N	\N	2026-04-07 21:28:41.444893+00
725	2026-01-08	166	150000	bank	\N	\N	2026-04-07 21:28:41.44602+00
726	2026-01-08	166	20000	bank	\N	\N	2026-04-07 21:28:41.447182+00
727	2026-01-09	166	25000	bank	\N	\N	2026-04-07 21:28:41.448389+00
728	2026-01-09	166	25000	bank	\N	\N	2026-04-07 21:28:41.449525+00
729	2026-01-09	166	3000	bank	\N	\N	2026-04-07 21:28:41.450457+00
730	2026-01-10	166	25000	bank	\N	\N	2026-04-07 21:28:41.451853+00
731	2026-01-10	166	25000	bank	\N	\N	2026-04-07 21:28:41.453001+00
732	2026-01-12	166	50000	bank	\N	\N	2026-04-07 21:28:41.45414+00
733	2026-01-12	166	124000	bank	\N	\N	2026-04-07 21:28:41.45512+00
734	2026-01-12	166	27500	bank	\N	\N	2026-04-07 21:28:41.456282+00
735	2026-01-13	166	55000	bank	\N	\N	2026-04-07 21:28:41.457575+00
737	2026-01-15	166	41000	cash	\N	cash received	2026-04-07 21:28:41.45974+00
738	2026-01-16	166	100000	bank	\N	\N	2026-04-07 21:28:41.460809+00
739	2026-01-16	166	15250	bank	\N	\N	2026-04-07 21:28:41.462022+00
740	2026-01-16	166	11000	bank	\N	\N	2026-04-07 21:28:41.462889+00
741	2026-01-16	166	28000	bank	\N	\N	2026-04-07 21:28:41.46369+00
742	2026-01-17	166	50000	bank	\N	\N	2026-04-07 21:28:41.4649+00
743	2026-01-18	166	95000	cash	\N	\N	2026-04-07 21:28:41.466044+00
744	2026-01-18	166	20000	bank	\N	\N	2026-04-07 21:28:41.467177+00
745	2026-01-18	166	10000	bank	\N	\N	2026-04-07 21:28:41.468467+00
746	2026-01-18	166	15000	bank	\N	\N	2026-04-07 21:28:41.469606+00
747	2026-01-18	166	30000	bank	\N	\N	2026-04-07 21:28:41.470955+00
748	2026-01-18	166	10000	bank	\N	\N	2026-04-07 21:28:41.472292+00
749	2026-01-20	166	5000	bank	\N	\N	2026-04-07 21:28:41.473612+00
750	2026-01-21	166	50000	bank	\N	\N	2026-04-07 21:28:41.474735+00
751	2026-01-23	166	50000	bank	\N	\N	2026-04-07 21:28:41.475946+00
752	2026-01-24	166	80000	bank	\N	\N	2026-04-07 21:28:41.477043+00
753	2026-01-27	166	50000	bank	\N	\N	2026-04-07 21:28:41.478107+00
754	2026-01-28	166	30000	bank	\N	\N	2026-04-07 21:28:41.479332+00
756	2026-01-31	166	26000	bank	\N	\N	2026-04-07 21:28:41.481577+00
757	2026-02-01	166	29000	bank	\N	\N	2026-04-07 21:28:41.482801+00
758	2026-02-01	166	41000	bank	\N	\N	2026-04-07 21:28:41.483723+00
760	2026-02-01	166	50000	cash	\N	cash received	2026-04-07 21:28:41.486231+00
761	2026-02-01	166	25000	cash	\N	cash received	2026-04-07 21:28:41.487377+00
762	2026-02-02	166	65000	bank	\N	\N	2026-04-07 21:28:41.488418+00
763	2026-02-03	166	45000	bank	\N	\N	2026-04-07 21:28:41.489446+00
764	2026-02-03	166	14000	bank	\N	\N	2026-04-07 21:28:41.490259+00
765	2026-02-03	166	1000	bank	\N	\N	2026-04-07 21:28:41.491482+00
767	2026-02-05	166	90000	bank	\N	\N	2026-04-07 21:28:41.494092+00
768	2026-02-05	166	29000	bank	\N	\N	2026-04-07 21:28:41.495223+00
769	2026-02-05	166	100000	cash	\N	cash paid to sonu	2026-04-07 21:28:41.496338+00
770	2026-02-07	166	20000	bank	\N	\N	2026-04-07 21:28:41.497523+00
771	2026-02-07	166	30000	bank	\N	\N	2026-04-07 21:28:41.498588+00
775	2026-02-11	166	50000	cash	\N	cash received	2026-04-07 21:28:41.503332+00
777	2026-02-17	166	20000	bank	\N	\N	2026-04-07 21:28:41.505381+00
778	2026-02-19	166	50000	bank	\N	\N	2026-04-07 21:28:41.506568+00
779	2026-02-20	166	22000	cash	\N	cash received by kamlesh	2026-04-07 21:28:41.507708+00
780	2026-02-23	166	20000	cash	\N	cash received by shivam	2026-04-07 21:28:41.508904+00
782	2026-02-23	166	33000	bank	\N	\N	2026-04-07 21:28:41.511186+00
784	2026-02-24	166	50000	bank	\N	\N	2026-04-07 21:28:41.51347+00
785	2026-02-26	166	100000	cash	\N	CASH RECEIVED	2026-04-07 21:28:41.514599+00
786	2026-02-26	166	62000	cash	\N	BALAJI ENTERPRISES	2026-04-07 21:28:41.515713+00
787	2026-02-27	166	30000	bank	\N	\N	2026-04-07 21:28:41.516944+00
789	2026-02-28	166	55000	bank	\N	\N	2026-04-07 21:28:41.519266+00
790	2026-03-02	166	3000	bank	\N	\N	2026-04-07 21:28:41.520438+00
791	2026-03-09	166	100000	bank	\N	\N	2026-04-07 21:28:41.521501+00
793	2026-03-13	166	50000	bank	\N	\N	2026-04-07 21:28:41.523659+00
794	2026-03-16	166	57000	bank	\N	\N	2026-04-07 21:28:41.524849+00
795	2026-03-17	166	30000	bank	\N	\N	2026-04-07 21:28:41.526187+00
796	2026-03-23	166	30000	bank	\N	\N	2026-04-07 21:28:41.527711+00
797	2026-03-23	166	40000	bank	\N	\N	2026-04-07 21:28:41.528975+00
798	2026-03-23	166	28000	bank	\N	\N	2026-04-07 21:28:41.530417+00
799	2026-03-24	166	50000	bank	\N	\N	2026-04-07 21:28:41.531633+00
800	2026-03-25	166	20000	bank	\N	\N	2026-04-07 21:28:41.532608+00
801	2026-03-25	166	30000	bank	\N	\N	2026-04-07 21:28:41.533481+00
802	2026-03-25	166	50000	bank	\N	\N	2026-04-07 21:28:41.534706+00
804	2026-03-27	166	35000	bank	\N	\N	2026-04-07 21:28:41.536995+00
805	2026-03-28	166	20000	cash	\N	cash received	2026-04-07 21:28:41.53807+00
806	2026-03-30	166	30000	bank	\N	\N	2026-04-07 21:28:41.539146+00
807	2026-03-31	166	50000	bank	\N	\N	2026-04-07 21:28:41.5403+00
808	2026-04-01	166	50000	cash	\N	cash received	2026-04-07 21:28:41.541487+00
809	2026-04-02	166	50000	bank	\N	\N	2026-04-07 21:28:41.542255+00
815	2025-10-08	70	22000	bank	\N	\N	2026-04-07 21:28:41.550917+00
816	2025-10-08	70	28000	bank	\N	\N	2026-04-07 21:28:41.552098+00
817	2025-10-08	70	10000	bank	\N	\N	2026-04-07 21:28:41.553251+00
818	2025-10-09	70	10000	bank	\N	\N	2026-04-07 21:28:41.554338+00
837	2026-03-23	109	30000	bank	ARMTECH	\N	2026-04-07 21:28:41.576884+00
841	2025-09-16	8	50000	bank	\N	\N	2026-04-07 21:28:41.581108+00
842	2025-09-16	8	25000	bank	\N	\N	2026-04-07 21:28:41.581923+00
844	2025-10-14	8	20000	cash	\N	paid to rudra logictic	2026-04-07 21:28:41.584389+00
847	2025-09-16	167	214200	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.591998+00
848	2025-09-28	167	98000	bank	KOTAK	\N	2026-04-07 21:28:41.593184+00
849	2025-09-29	167	59500	bank	KOTAK	\N	2026-04-07 21:28:41.594247+00
850	2025-10-01	167	32340	bank	KOTAK	MASHITAL	2026-04-07 21:28:41.595097+00
851	2025-10-06	167	1	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.596192+00
852	2025-10-07	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.597289+00
853	2025-10-07	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.598061+00
854	2025-10-07	167	63700	bank	KOTAK	MASHITAL	2026-04-07 21:28:41.599063+00
855	2025-10-14	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.60026+00
856	2025-10-14	167	49000	bank	ARMTECH	SHITLA PRASAD	2026-04-07 21:28:41.60126+00
857	2025-10-15	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.602431+00
858	2025-10-15	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.603535+00
859	2025-10-16	167	42300	bank	KOTAK	MASHITAL	2026-04-07 21:28:41.604556+00
860	2025-10-18	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.605611+00
861	2025-10-18	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.606338+00
862	2025-11-03	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.607103+00
863	2025-11-03	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.60797+00
864	2025-11-03	167	59500	cash	\N	\N	2026-04-07 21:28:41.609053+00
865	2025-11-09	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.609782+00
867	2025-11-10	167	59500	cash	\N	\N	2026-04-07 21:28:41.611306+00
870	2025-11-14	167	31500	bank	\N	\N	2026-04-07 21:28:41.613571+00
871	2025-11-14	167	59500	bank	\N	\N	2026-04-07 21:28:41.614791+00
872	2025-11-27	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.615911+00
873	2025-11-27	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.616995+00
874	2025-11-27	167	92680	bank	BOB	\N	2026-04-07 21:28:41.617819+00
875	2025-11-27	167	1	bank	BOB	\N	2026-04-07 21:28:41.618962+00
876	2025-12-02	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.620025+00
877	2025-12-02	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.621051+00
879	2025-12-15	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.623254+00
880	2025-12-15	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.624348+00
881	2025-12-15	167	60900	bank	BOB	\N	2026-04-07 21:28:41.625193+00
882	2025-12-19	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.626256+00
883	2025-12-19	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.62703+00
884	2025-12-19	167	51100	bank	BOB	\N	2026-04-07 21:28:41.627886+00
885	2025-12-20	167	30800	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.628935+00
886	2025-12-25	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.629686+00
888	2026-01-02	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.631296+00
889	2026-01-02	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.632424+00
890	2026-01-02	167	56000	bank	BOB	\N	2026-04-07 21:28:41.633869+00
891	2026-01-07	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.635396+00
892	2026-01-07	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.636957+00
895	2026-01-11	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.640257+00
896	2026-01-11	167	49000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.641474+00
897	2026-01-15	167	105000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.642537+00
898	2026-01-18	167	54200	bank	\N	\N	2026-04-07 21:28:41.64336+00
899	2026-01-19	167	50000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.644459+00
900	2026-01-20	167	143200	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.645216+00
901	2026-01-22	167	193200	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.646348+00
912	2026-03-24	167	168000	bank	\N	\N	2026-04-07 21:28:41.65871+00
913	2026-03-25	167	168000	bank	\N	\N	2026-04-07 21:28:41.659813+00
914	2025-04-01	141	1.004e+06	bank	\N	\N	2026-04-07 21:28:41.660852+00
915	2025-06-21	141	186000	bank	\N	\N	2026-04-07 21:28:41.661737+00
916	2025-07-03	141	198400	bank	\N	\N	2026-04-07 21:28:41.663002+00
917	2025-07-05	141	292400	bank	\N	\N	2026-04-07 21:28:41.664008+00
822	2025-10-08	36	175000	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.560756+00
823	2025-10-10	36	175000	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.561518+00
824	2026-01-25	36	159000	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.562784+00
825	2026-02-21	36	232680	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.563872+00
826	2026-02-23	36	476400	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.564993+00
866	2025-11-09	167	49000	bank	HDFC	MASHITAL	2026-04-07 21:28:41.610542+00
819	2025-09-06	36	178800	bank	\N	OM CORPORATION | Sender: OM CORPORATION	2026-04-07 21:28:41.557991+00
820	2025-09-12	36	178800	bank	\N	OM CORPORATION | Sender: OM CORPORATION	2026-04-07 21:28:41.559087+00
821	2025-09-13	36	339720	bank	\N	OM CORPORATION | Sender: OM CORPORATION	2026-04-07 21:28:41.559949+00
843	2025-09-19	8	33000	bank	\N	BHALE SULTAN | Sender: BHALE SULTAN	2026-04-07 21:28:41.583259+00
845	2025-08-24	167	182000	bank	\N	MASHITAL | Sender: MASHITAL	2026-04-07 21:28:41.590064+00
846	2025-09-04	167	178500	bank	\N	MASHITAL | Sender: MASHITAL	2026-04-07 21:28:41.591201+00
909	2026-03-06	167	160000	bank	\N	MASHITAL | Sender: MASHITAL	2026-04-07 21:28:41.655532+00
918	2025-07-05	141	292400	cash	\N	\N	2026-04-07 21:28:41.665223+00
919	2025-07-15	141	207000	bank	\N	\N	2026-04-07 21:28:41.666376+00
920	2025-07-15	141	417000	cash	\N	\N	2026-04-07 21:28:41.66746+00
921	2025-07-17	141	210000	bank	\N	\N	2026-04-07 21:28:41.668836+00
922	2025-07-17	141	224000	bank	\N	\N	2026-04-07 21:28:41.669983+00
923	2025-07-18	141	268800	bank	\N	\N	2026-04-07 21:28:41.671024+00
924	2025-07-25	141	290500	bank	\N	\N	2026-04-07 21:28:41.672155+00
925	2025-07-25	141	290500	cash	\N	\N	2026-04-07 21:28:41.67331+00
926	2025-07-29	141	297500	bank	\N	\N	2026-04-07 21:28:41.674287+00
927	2025-07-29	141	297500	cash	\N	\N	2026-04-07 21:28:41.675282+00
928	2025-07-31	141	192000	bank	\N	\N	2026-04-07 21:28:41.676143+00
929	2025-07-31	141	350000	bank	\N	\N	2026-04-07 21:28:41.676989+00
930	2025-07-31	141	350000	cash	\N	\N	2026-04-07 21:28:41.678187+00
931	2025-08-06	141	241400	bank	\N	\N	2026-04-07 21:28:41.678985+00
932	2025-08-11	141	241400	cash	\N	\N	2026-04-07 21:28:41.680191+00
933	2025-08-30	141	186000	bank	\N	\N	2026-04-07 21:28:41.681279+00
935	2025-09-24	141	196000	bank	\N	\N	2026-04-07 21:28:41.683585+00
936	2025-10-04	141	747136	bank	\N	\N	2026-04-07 21:28:41.68456+00
937	2025-10-04	141	750000	cash	\N	\N	2026-04-07 21:28:41.685867+00
938	2025-10-06	141	235200	bank	\N	\N	2026-04-07 21:28:41.687246+00
939	2025-10-07	141	300000	cash	\N	KOTAK	2026-04-07 21:28:41.688515+00
940	2025-10-28	141	300000	cash	\N	ARMTECH	2026-04-07 21:28:41.689882+00
941	2025-11-14	141	200000	cash	\N	ARMTECH	2026-04-07 21:28:41.690974+00
942	2025-11-19	141	200160	bank	\N	\N	2026-04-07 21:28:41.692163+00
943	2025-11-19	141	411440	cash	\N	KOTAK	2026-04-07 21:28:41.693+00
944	2025-12-26	141	200000	cash	\N	koTAK	2026-04-07 21:28:41.694132+00
945	2026-01-31	141	550000	cash	\N	koTAK	2026-04-07 21:28:41.695008+00
946	2025-07-10	19	182000	bank	\N	\N	2026-04-07 21:28:41.698541+00
947	2025-07-22	19	361900	bank	\N	\N	2026-04-07 21:28:41.699764+00
948	2025-07-24	19	361900	bank	\N	\N	2026-04-07 21:28:41.700881+00
949	2025-07-30	19	218400	bank	\N	\N	2026-04-07 21:28:41.701983+00
950	2025-08-02	19	329000	bank	\N	\N	2026-04-07 21:28:41.703183+00
951	2025-08-12	19	182000	bank	\N	\N	2026-04-07 21:28:41.704349+00
952	2025-08-25	19	378000	bank	\N	\N	2026-04-07 21:28:41.705388+00
953	2025-08-29	19	189000	bank	\N	\N	2026-04-07 21:28:41.706421+00
954	2025-08-29	19	175000	bank	\N	\N	2026-04-07 21:28:41.707366+00
959	2025-08-04	169	20000	cash	\N	Cash Paid to Ashutosh	2026-04-07 21:28:41.718492+00
960	2025-08-04	169	20000	cash	\N	Cash Paid to Manish	2026-04-07 21:28:41.719781+00
961	2025-08-08	169	2000	cash	\N	Cash Paid to Shrey	2026-04-07 21:28:41.720934+00
962	2025-08-08	169	48000	cash	\N	Cash Paid to Shrey	2026-04-07 21:28:41.721925+00
968	2025-08-22	169	45000	bank	\N	\N	2026-04-07 21:28:41.728015+00
969	2025-08-24	169	30000	bank	\N	\N	2026-04-07 21:28:41.729126+00
970	2025-08-29	169	20000	bank	\N	\N	2026-04-07 21:28:41.73036+00
971	2025-08-31	169	68000	cash	\N	CASH RECEIVED	2026-04-07 21:28:41.732043+00
972	2025-08-30	169	1	bank	\N	\N	2026-04-07 21:28:41.733065+00
980	2025-10-13	169	35000	cash	\N	PAID TO JAWED ALAM	2026-04-07 21:28:41.742053+00
981	2025-06-12	34	29400	bank	\N	\N	2026-04-07 21:28:41.743454+00
982	2025-06-12	34	50000	bank	\N	\N	2026-04-07 21:28:41.74438+00
983	2025-06-14	34	50000	bank	\N	\N	2026-04-07 21:28:41.745437+00
984	2025-06-14	34	66100	bank	\N	\N	2026-04-07 21:28:41.746929+00
985	2025-06-16	34	90000	bank	\N	\N	2026-04-07 21:28:41.747978+00
986	2025-06-20	34	55000	bank	\N	\N	2026-04-07 21:28:41.74937+00
987	2025-06-20	34	33000	bank	\N	\N	2026-04-07 21:28:41.750738+00
988	2025-06-24	34	63500	bank	\N	\N	2026-04-07 21:28:41.751804+00
989	2025-06-27	34	80000	bank	\N	\N	2026-04-07 21:28:41.752832+00
990	2025-06-27	34	20000	bank	\N	\N	2026-04-07 21:28:41.753958+00
991	2025-07-03	34	25000	bank	\N	\N	2026-04-07 21:28:41.755023+00
992	2025-07-03	34	25000	bank	\N	\N	2026-04-07 21:28:41.755885+00
993	2025-07-08	34	50000	bank	\N	\N	2026-04-07 21:28:41.756976+00
994	2025-07-08	34	50000	bank	\N	\N	2026-04-07 21:28:41.75777+00
995	2025-07-13	34	50000	bank	\N	\N	2026-04-07 21:28:41.758596+00
996	2025-07-14	34	30000	bank	\N	\N	2026-04-07 21:28:41.759375+00
997	2025-07-19	34	50000	bank	\N	\N	2026-04-07 21:28:41.760522+00
998	2025-08-22	34	15000	bank	\N	\N	2026-04-07 21:28:41.761452+00
999	2025-04-01	170	50000	bank	\N	\N	2026-04-07 21:28:41.764352+00
1000	2025-04-11	170	50000	bank	\N	\N	2026-04-07 21:28:41.765465+00
1001	2025-04-16	170	142000	bank	\N	\N	2026-04-07 21:28:41.766582+00
1002	2025-04-21	170	175000	bank	\N	\N	2026-04-07 21:28:41.767826+00
1003	2025-04-26	170	40000	bank	\N	\N	2026-04-07 21:28:41.768765+00
1004	2025-04-30	170	10000	bank	\N	\N	2026-04-07 21:28:41.769978+00
1005	2025-05-02	170	200000	bank	\N	\N	2026-04-07 21:28:41.770962+00
1006	2025-05-02	170	25000	bank	\N	\N	2026-04-07 21:28:41.772096+00
1007	2025-05-07	170	30000	cash	\N	\N	2026-04-07 21:28:41.773301+00
1008	2025-05-15	170	240000	bank	\N	\N	2026-04-07 21:28:41.774554+00
1009	2025-05-22	170	250000	bank	\N	\N	2026-04-07 21:28:41.775873+00
1010	2025-06-13	170	100000	bank	\N	\N	2026-04-07 21:28:41.777953+00
1011	2025-06-27	170	217000	bank	\N	\N	2026-04-07 21:28:41.780336+00
1012	2025-06-28	170	24500	cash	\N	\N	2026-04-07 21:28:41.782493+00
1015	2025-04-08	43	98000	bank	\N	\N	2026-04-07 21:28:41.788483+00
1016	2025-04-08	43	30400	cash	\N	\N	2026-04-07 21:28:41.789999+00
1017	2025-04-08	43	15500	cash	\N	\N	2026-04-07 21:28:41.79143+00
1018	2025-04-08	43	2000	bank	\N	\N	2026-04-07 21:28:41.792816+00
1019	2025-04-08	43	60000	bank	\N	\N	2026-04-07 21:28:41.794197+00
1020	2025-04-30	43	35900	bank	\N	\N	2026-04-07 21:28:41.795532+00
1021	2025-05-06	43	30000	bank	\N	\N	2026-04-07 21:28:41.79684+00
1022	2025-05-15	43	70000	bank	\N	\N	2026-04-07 21:28:41.79806+00
1023	2025-05-22	43	100000	bank	\N	\N	2026-04-07 21:28:41.799326+00
1024	2025-05-29	43	50000	bank	\N	\N	2026-04-07 21:28:41.8007+00
1025	2025-06-09	43	95000	bank	\N	\N	2026-04-07 21:28:41.802065+00
1026	2025-06-21	43	31920	cash	\N	\N	2026-04-07 21:28:41.803435+00
1027	2025-06-25	43	25000	bank	\N	\N	2026-04-07 21:28:41.804837+00
958	2025-09-08	168	30000	bank	\N	RAHUL | Sender: RAHUL	2026-04-07 21:28:41.713207+00
1028	2025-06-25	43	25000	bank	\N	\N	2026-04-07 21:28:41.806142+00
1029	2025-06-26	43	25000	cash	\N	\N	2026-04-07 21:28:41.807474+00
1030	2025-07-13	43	30000	cash	\N	\N	2026-04-07 21:28:41.808836+00
1031	2025-08-01	43	45000	cash	\N	\N	2026-04-07 21:28:41.810379+00
1032	2025-08-11	43	21000	bank	\N	\N	2026-04-07 21:28:41.811947+00
1033	2025-08-11	43	19000	bank	\N	\N	2026-04-07 21:28:41.813556+00
1034	2025-08-20	43	50400	cash	\N	\N	2026-04-07 21:28:41.815263+00
1036	2025-10-27	43	50000	bank	\N	\N	2026-04-07 21:28:41.818065+00
1037	2025-11-16	43	20000	bank	\N	\N	2026-04-07 21:28:41.819352+00
1038	2025-11-16	43	40000	bank	\N	\N	2026-04-07 21:28:41.820652+00
1039	2025-11-16	43	10000	bank	\N	\N	2026-04-07 21:28:41.821981+00
1040	2025-04-01	134	10000	bank	\N	\N	2026-04-07 21:28:41.827393+00
1041	2025-04-04	134	70000	bank	\N	\N	2026-04-07 21:28:41.828847+00
1042	2025-04-07	134	100000	bank	\N	\N	2026-04-07 21:28:41.83012+00
1043	2025-04-07	134	50000	bank	\N	\N	2026-04-07 21:28:41.831533+00
1044	2025-04-14	134	50000	bank	\N	\N	2026-04-07 21:28:41.832924+00
1045	2025-04-17	134	50000	bank	\N	\N	2026-04-07 21:28:41.834379+00
1046	2025-04-18	134	100000	bank	\N	\N	2026-04-07 21:28:41.835872+00
1047	2025-04-18	134	50000	bank	\N	\N	2026-04-07 21:28:41.837193+00
1048	2025-04-21	134	50000	bank	\N	\N	2026-04-07 21:28:41.838528+00
1049	2025-04-22	134	75000	bank	\N	\N	2026-04-07 21:28:41.839826+00
1050	2025-04-25	134	75000	bank	\N	\N	2026-04-07 21:28:41.841086+00
1051	2025-04-26	134	50000	bank	\N	\N	2026-04-07 21:28:41.842308+00
1052	2025-04-29	134	50000	bank	\N	\N	2026-04-07 21:28:41.84361+00
1053	2025-05-01	134	100000	bank	\N	\N	2026-04-07 21:28:41.844927+00
1054	2025-05-03	134	10	bank	\N	\N	2026-04-07 21:28:41.846154+00
1055	2025-05-03	134	50000	bank	\N	\N	2026-04-07 21:28:41.847455+00
1056	2025-05-04	134	30000	bank	\N	\N	2026-04-07 21:28:41.848846+00
1057	2025-05-05	134	70000	bank	\N	\N	2026-04-07 21:28:41.850133+00
1058	2025-05-06	134	50000	bank	\N	\N	2026-04-07 21:28:41.851401+00
1059	2025-05-07	134	25000	bank	\N	\N	2026-04-07 21:28:41.852751+00
1060	2025-05-09	134	50000	bank	\N	\N	2026-04-07 21:28:41.854104+00
1061	2025-05-10	134	50000	bank	\N	\N	2026-04-07 21:28:41.855432+00
1062	2025-05-11	134	20000	bank	\N	\N	2026-04-07 21:28:41.856957+00
1063	2025-05-13	134	50000	bank	\N	\N	2026-04-07 21:28:41.858317+00
1064	2025-05-15	134	20000	bank	\N	\N	2026-04-07 21:28:41.859611+00
1065	2025-05-17	134	15000	bank	\N	\N	2026-04-07 21:28:41.860844+00
1066	2025-05-20	134	30000	bank	\N	\N	2026-04-07 21:28:41.862102+00
1067	2025-05-26	134	25000	bank	\N	\N	2026-04-07 21:28:41.863396+00
1068	2025-05-28	134	25000	bank	\N	\N	2026-04-07 21:28:41.864773+00
1069	2025-06-05	134	30000	bank	\N	\N	2026-04-07 21:28:41.865875+00
1070	2025-06-13	134	100000	bank	\N	\N	2026-04-07 21:28:41.867013+00
1071	2025-06-16	134	140000	bank	\N	\N	2026-04-07 21:28:41.868252+00
1072	2025-06-27	134	80000	bank	\N	\N	2026-04-07 21:28:41.869384+00
1073	2025-06-28	134	50000	bank	\N	\N	2026-04-07 21:28:41.870517+00
1074	2025-06-30	134	200000	bank	\N	\N	2026-04-07 21:28:41.871689+00
1075	2025-07-01	134	50000	bank	\N	\N	2026-04-07 21:28:41.872872+00
1076	2025-07-02	134	50000	bank	\N	\N	2026-04-07 21:28:41.873931+00
1077	2025-07-04	134	50000	bank	\N	\N	2026-04-07 21:28:41.875264+00
1078	2025-07-05	134	50000	bank	\N	\N	2026-04-07 21:28:41.876391+00
1079	2025-07-07	134	150000	bank	\N	\N	2026-04-07 21:28:41.877842+00
1080	2025-07-25	134	50000	bank	\N	\N	2026-04-07 21:28:41.879176+00
1081	2025-07-28	134	160000	bank	\N	\N	2026-04-07 21:28:41.880557+00
1083	2025-08-15	134	60000	bank	\N	\N	2026-04-07 21:28:41.883544+00
1084	2025-08-18	134	126000	bank	\N	\N	2026-04-07 21:28:41.884888+00
1085	2025-08-18	134	14600	cash	\N	\N	2026-04-07 21:28:41.886101+00
1086	2025-08-18	134	70000	bank	\N	\N	2026-04-07 21:28:41.887206+00
1087	2025-08-18	134	50000	cash	\N	FREIGHT BIRLA	2026-04-07 21:28:41.888369+00
1088	2025-08-19	134	30000	bank	\N	\N	2026-04-07 21:28:41.889504+00
1089	2025-08-21	134	100000	bank	\N	\N	2026-04-07 21:28:41.890757+00
1093	2025-08-28	134	58800	cash	\N	BIRLA FREIGHT	2026-04-07 21:28:41.895456+00
1103	2025-09-12	134	50000	bank	ARMTECH	\N	2026-04-07 21:28:41.913141+00
1105	2025-09-22	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.916322+00
1106	2025-09-25	134	30000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.917605+00
1107	2025-09-25	134	20000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.918801+00
1108	2025-09-29	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.920047+00
1109	2025-10-17	134	30000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.92127+00
1110	2025-10-28	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.922489+00
1111	2025-10-28	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.923662+00
1112	2025-10-29	134	150000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.924849+00
1113	2025-11-07	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.925924+00
1114	2025-11-10	134	55000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.927137+00
1115	2025-11-15	134	25000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.928527+00
1116	2025-11-20	134	200000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.93001+00
1117	2025-11-28	134	25000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.931688+00
1118	2025-12-02	134	30000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.933228+00
1119	2025-12-12	134	150000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.934692+00
1120	2025-12-16	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.935818+00
1121	2025-12-18	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.937039+00
1122	2025-12-19	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.938196+00
1123	2025-12-22	134	75000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.939278+00
1124	2025-12-23	134	80000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.940233+00
1125	2025-12-25	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.941085+00
1126	2025-12-27	134	35000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.941914+00
1127	2025-12-29	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.943392+00
1128	2026-01-06	134	25000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.944821+00
1873	2025-08-29	3	50000	bank	\N	\N	2026-04-07 21:28:42.805602+00
1129	2026-01-09	134	75000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.946089+00
1130	2026-01-17	134	150000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.947478+00
1131	2026-01-20	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.948355+00
1132	2026-01-21	134	30000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.949435+00
1133	2026-01-22	134	70000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.950549+00
1134	2026-01-24	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.951842+00
1135	2026-01-29	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.953034+00
1136	2026-01-30	134	100000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.954206+00
1137	2026-02-03	134	35000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.955273+00
1138	2026-02-05	134	200000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.95633+00
1139	2026-02-05	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.957475+00
1140	2026-02-09	134	40000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.958642+00
1141	2026-02-10	134	55000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.959786+00
1142	2026-02-12	134	116000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.960915+00
1143	2026-02-13	134	70000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.961791+00
1144	2026-02-16	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.962866+00
1145	2026-02-20	134	75000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.964108+00
1146	2026-02-20	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.965248+00
1147	2026-02-24	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.966313+00
1148	2026-02-27	134	20000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.967436+00
1149	2026-03-03	134	25000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.96875+00
1150	2026-03-10	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.969962+00
1151	2026-03-10	134	30000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.971041+00
1152	2026-03-12	134	30000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.972087+00
1153	2026-03-18	134	50000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.973207+00
1154	2026-03-20	134	200000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.974353+00
1155	2026-03-21	134	100000	bank	ARMTECH	\N	2026-04-07 21:28:41.975508+00
1156	2026-03-23	134	95000	bank	ARMTECH	MAA GYAN PRABHA	2026-04-07 21:28:41.976644+00
1157	2026-03-26	134	216000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.977887+00
1158	2026-03-28	134	200000	bank	ARMTECH	SANTOSH KUMAR	2026-04-07 21:28:41.978858+00
1159	2026-03-28	134	135000	bank	ARMTECH	MAA GYAN PRABHA ENTERPRISES	2026-04-07 21:28:41.979932+00
1162	2025-09-07	16	30000	cash	\N	paid to jawed alam	2026-04-07 21:28:41.985381+00
1163	2025-09-07	16	20000	cash	\N	paid to jawed alam	2026-04-07 21:28:41.986522+00
1164	2025-11-20	16	35000	cash	\N	paid to rahul sir	2026-04-07 21:28:41.987641+00
1166	2025-12-01	16	50	bank	\N	\N	2026-04-07 21:28:41.989825+00
1167	2025-12-01	16	31000	bank	\N	\N	2026-04-07 21:28:41.990975+00
1168	2025-12-01	16	35450	bank	\N	\N	2026-04-07 21:28:41.992238+00
1169	2025-12-02	16	19500	bank	\N	\N	2026-04-07 21:28:41.99329+00
1170	2025-12-03	16	1	bank	\N	\N	2026-04-07 21:28:41.994061+00
1171	2025-12-03	16	11500	bank	\N	\N	2026-04-07 21:28:41.994823+00
1172	2025-12-03	16	40500	bank	\N	\N	2026-04-07 21:28:41.996003+00
1174	2025-08-11	101	50000	cash	\N	\N	2026-04-07 21:28:41.998219+00
1178	2025-04-05	171	80000	bank	\N	\N	2026-04-07 21:28:42.005059+00
1179	2025-04-09	171	146000	cash	\N	\N	2026-04-07 21:28:42.006186+00
1183	2025-04-29	171	50000	bank	\N	\N	2026-04-07 21:28:42.010436+00
1184	2025-05-06	171	45400	cash	\N	Ayesha Ali	2026-04-07 21:28:42.011636+00
1186	2025-05-25	171	38000	cash	\N	Sudhanshu Singh	2026-04-07 21:28:42.013962+00
1187	2025-05-25	171	1170	cash	\N	\N	2026-04-07 21:28:42.0151+00
1190	2025-06-06	171	50000	bank	\N	\N	2026-04-07 21:28:42.01872+00
1191	2025-06-18	171	50000	cash	\N	Poonam Singh	2026-04-07 21:28:42.020048+00
1195	2025-07-02	171	50000	bank	\N	\N	2026-04-07 21:28:42.023954+00
1196	2025-07-02	171	7000	bank	\N	\N	2026-04-07 21:28:42.025136+00
1198	2025-07-15	171	50000	cash	\N	Devraj Kumar	2026-04-07 21:28:42.027355+00
1199	2025-07-18	171	26000	cash	\N	Man Singh	2026-04-07 21:28:42.028123+00
1200	2025-07-24	171	50000	cash	\N	Royal Fuel Station	2026-04-07 21:28:42.028957+00
1201	2025-08-04	171	45000	cash	\N	Manish Kumar	2026-04-07 21:28:42.030071+00
1202	2025-08-04	171	5000	cash	\N	Manish Kumar	2026-04-07 21:28:42.03122+00
1203	2025-08-14	171	44000	bank	\N	\N	2026-04-07 21:28:42.032311+00
1207	2025-09-11	171	50000	cash	\N	PAID IN HIMANSHU QR CODE	2026-04-07 21:28:42.036758+00
1211	2025-10-13	171	32000	cash	\N	PAID TO JAWED ALAM	2026-04-07 21:28:42.041339+00
1213	2025-10-26	171	50000	bank	\N	\N	2026-04-07 21:28:42.042839+00
1217	2025-11-25	171	50000	bank	\N	\N	2026-04-07 21:28:42.046953+00
1218	2025-11-30	171	21000	bank	\N	\N	2026-04-07 21:28:42.047844+00
1221	2025-12-16	171	40000	bank	\N	\N	2026-04-07 21:28:42.050846+00
1180	2025-04-10	171	50000	bank	ARMTECH	Armtech A/c	2026-04-07 21:28:42.007319+00
1160	2025-09-27	16	50000	bank	\N	anurag singh | Sender: anurag singh	2026-04-07 21:28:41.983029+00
1161	2025-09-06	16	31000	bank	\N	anurag singh | Sender: anurag singh	2026-04-07 21:28:41.983993+00
1225	2025-08-25	54	40000	bank	\N	\N	2026-04-07 21:28:42.056522+00
1226	2025-08-26	54	40000	bank	\N	\N	2026-04-07 21:28:42.057584+00
1227	2025-08-27	54	80000	bank	\N	\N	2026-04-07 21:28:42.05841+00
1228	2025-09-06	54	20000	bank	\N	\N	2026-04-07 21:28:42.0592+00
1229	2025-10-14	54	30000	bank	\N	\N	2026-04-07 21:28:42.060325+00
1230	2025-10-15	137	1.093084e+06	cash	\N	As per marwa Ledger account Settlement	2026-04-07 21:28:42.061625+00
1232	2025-05-06	68	157500	bank	\N	\N	2026-04-07 21:28:42.063929+00
1233	2025-07-03	68	172500	bank	\N	\N	2026-04-07 21:28:42.06494+00
1234	2025-09-12	68	198000	bank	\N	\N	2026-04-07 21:28:42.06605+00
1235	2025-09-12	68	99000	bank	\N	\N	2026-04-07 21:28:42.067202+00
1236	2025-11-08	68	11340	cash	\N	\N	2026-04-07 21:28:42.06837+00
1237	2025-12-16	68	162000	bank	\N	\N	2026-04-07 21:28:42.069553+00
1238	2026-01-16	68	174000	bank	\N	\N	2026-04-07 21:28:42.070689+00
1239	2026-03-16	68	180000	bank	\N	\N	2026-04-07 21:28:42.071819+00
1240	2025-06-27	33	335000	bank	\N	\N	2026-04-07 21:28:42.074507+00
1241	2025-07-10	33	240900	bank	\N	\N	2026-04-07 21:28:42.075379+00
1242	2025-07-11	33	273900	bank	\N	\N	2026-04-07 21:28:42.076562+00
1243	2025-08-01	33	301500	bank	\N	\N	2026-04-07 21:28:42.077419+00
1275	2026-03-20	33	100000	bank	\N	\N	2026-04-07 21:28:42.115042+00
1276	2026-03-22	33	100000	bank	\N	\N	2026-04-07 21:28:42.116102+00
1288	2025-08-20	24	233000	bank	\N	\N	2026-04-07 21:28:42.134094+00
1289	2025-08-25	24	21000	cash	\N	Tansen freight	2026-04-07 21:28:42.135276+00
1290	2025-08-25	24	235720	bank	\N	\N	2026-04-07 21:28:42.136331+00
1291	2025-08-27	24	157000	bank	\N	\N	2026-04-07 21:28:42.137438+00
1292	2025-08-29	24	24500	cash	\N	Tansen freight	2026-04-07 21:28:42.13863+00
1293	2025-09-01	24	193400	bank	\N	\N	2026-04-07 21:28:42.139699+00
1294	2025-09-04	24	196000	bank	\N	\N	2026-04-07 21:28:42.140772+00
1295	2025-09-08	24	21000	cash	\N	TANSEN TANSPORT	2026-04-07 21:28:42.141991+00
1296	2025-09-12	24	157200	bank	ARMTECH	SHRI BAJALI ENTERPRISES	2026-04-07 21:28:42.142869+00
1300	2025-09-25	24	25900	cash	\N	Tansen freight	2026-04-07 21:28:42.147338+00
1303	2025-10-03	24	168000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.150797+00
1304	2025-10-04	24	30240	cash	\N	Tansen freight	2026-04-07 21:28:42.151993+00
1307	2025-10-08	24	196000	bank	ARMTECH	SHRI BALAJI ENTERPR	2026-04-07 21:28:42.155641+00
1309	2025-10-10	24	90000	bank	ARMTECH	SHRI BALAJI ENTERPR	2026-04-07 21:28:42.1583+00
1277	2026-03-24	33	200000	bank	ARMTECH	\N	2026-04-07 21:28:42.117251+00
1278	2026-04-05	33	250000	bank	ARMTECH	\N	2026-04-07 21:28:42.118208+00
1223	2025-08-06	54	150000	bank	ARMTECH	Armtech A/C	2026-04-07 21:28:42.053855+00
1231	2026-01-29	137	100000	bank	\N	MARWA CEMENT INDUSTRIES | Sender: MARWA CEMENT INDUSTRIES	2026-04-07 21:28:42.062631+00
1283	2025-09-20	58	50000	bank	\N	Yuvraj Singh | Sender: Yuvraj Singh	2026-04-07 21:28:42.128112+00
1310	2025-10-10	24	85000	bank	ARMTECH	SHRI BALAJI ENTERPR	2026-04-07 21:28:42.159703+00
1312	2025-10-16	24	21600	cash	\N	Tansen freight	2026-04-07 21:28:42.161645+00
1313	2025-10-18	24	70000	bank	ARMTECH	SHRI BALAJI ENTERPR	2026-04-07 21:28:42.16288+00
1319	2025-12-05	24	160000	bank	ARMTECH	SHRI BALAJI ENTERPR	2026-04-07 21:28:42.169166+00
1320	2025-12-15	24	190000	bank	ARMTECH	SHRI BALAJI ENTERPRISE	2026-04-07 21:28:42.170215+00
1322	2025-12-30	24	75000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.172468+00
1324	2026-01-05	24	200000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.174797+00
1325	2026-01-09	24	150000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.175904+00
1326	2026-01-17	24	140000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.177005+00
1327	2026-01-20	24	150000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.178203+00
1328	2026-01-28	24	150000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.179314+00
1329	2026-02-04	24	200000	bank	ARMTECH	PARAS ASSOCIATES	2026-04-07 21:28:42.180257+00
1330	2026-02-17	24	200000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.181399+00
1331	2026-02-21	24	150000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.182477+00
1333	2026-03-09	24	200000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.184526+00
1334	2026-03-16	24	150000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.18579+00
1335	2026-03-20	24	150000	bank	ARMTECH	\N	2026-04-07 21:28:42.186918+00
1336	2026-03-27	24	200000	bank	ARMTECH	SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.188027+00
1337	2026-03-07	24	150000	cash	\N	CASH RECEIVED	2026-04-07 21:28:42.189217+00
1338	2026-03-09	24	40000	cash	\N	CASH RECEIVED PAID TO RIZWAN TRP	2026-04-07 21:28:42.190256+00
1341	2026-03-16	24	15000	bank	\N	\N	2026-04-07 21:28:42.193283+00
1342	2026-03-17	24	9000	bank	\N	\N	2026-04-07 21:28:42.194475+00
1343	2026-03-17	24	1000	bank	\N	\N	2026-04-07 21:28:42.195387+00
1344	2026-03-17	24	2000	bank	\N	\N	2026-04-07 21:28:42.196239+00
1345	2026-03-17	24	2000	bank	\N	\N	2026-04-07 21:28:42.197386+00
1346	2026-03-17	24	28000	bank	\N	\N	2026-04-07 21:28:42.198317+00
1347	2026-03-17	24	20400	bank	\N	\N	2026-04-07 21:28:42.199356+00
1348	2026-03-17	24	20000	bank	\N	\N	2026-04-07 21:28:42.200504+00
1349	2026-03-17	24	400	bank	\N	\N	2026-04-07 21:28:42.201776+00
1350	2026-03-20	24	20000	bank	\N	\N	2026-04-07 21:28:42.202905+00
1351	2026-03-20	24	10000	bank	\N	\N	2026-04-07 21:28:42.204034+00
1352	2026-03-25	24	25000	bank	\N	\N	2026-04-07 21:28:42.205092+00
1353	2026-03-25	24	20000	bank	\N	\N	2026-04-07 21:28:42.206144+00
1355	2025-04-01	53	201000	bank	\N	\N	2026-04-07 21:28:42.210589+00
1356	2025-04-04	53	50000	bank	\N	\N	2026-04-07 21:28:42.211893+00
1357	2025-04-04	53	100000	bank	\N	\N	2026-04-07 21:28:42.213169+00
1358	2025-04-04	53	74200	bank	\N	\N	2026-04-07 21:28:42.214347+00
1359	2025-04-05	53	167500	bank	\N	\N	2026-04-07 21:28:42.215398+00
1360	2025-06-03	53	140000	bank	\N	\N	2026-04-07 21:28:42.216545+00
1361	2025-06-12	53	175000	bank	\N	\N	2026-04-07 21:28:42.217412+00
1362	2025-06-16	53	10000	bank	\N	\N	2026-04-07 21:28:42.218304+00
1363	2025-06-16	53	90000	bank	\N	\N	2026-04-07 21:28:42.219539+00
1364	2025-06-17	53	109320	bank	\N	\N	2026-04-07 21:28:42.220754+00
1365	2025-06-27	53	189000	bank	\N	\N	2026-04-07 21:28:42.221822+00
1366	2025-06-27	53	6000	cash	\N	\N	2026-04-07 21:28:42.222912+00
1367	2025-08-02	53	180000	bank	\N	\N	2026-04-07 21:28:42.224005+00
1368	2025-08-03	53	191900	bank	\N	\N	2026-04-07 21:28:42.225132+00
1369	2025-08-06	53	200000	bank	\N	\N	2026-04-07 21:28:42.226419+00
1370	2025-08-13	53	100000	bank	\N	\N	2026-04-07 21:28:42.227469+00
1371	2025-08-16	53	95000	bank	\N	\N	2026-04-07 21:28:42.228634+00
1372	2025-08-18	53	100000	bank	\N	\N	2026-04-07 21:28:42.229822+00
1373	2025-08-20	53	150000	bank	\N	\N	2026-04-07 21:28:42.23099+00
1382	2025-04-05	173	100000	cash	\N	\N	2026-04-07 21:28:42.241583+00
1383	2025-08-19	111	44500	cash	\N	\N	2026-04-07 21:28:42.245085+00
1384	2025-08-19	111	100000	cash	\N	\N	2026-04-07 21:28:42.246179+00
1385	2025-08-19	111	71100	cash	\N	\N	2026-04-07 21:28:42.247129+00
1386	2025-08-23	111	23440	bank	\N	\N	2026-04-07 21:28:42.24831+00
1389	2025-09-09	111	255000	cash	\N	\N	2026-04-07 21:28:42.251932+00
1393	2025-09-14	111	25000	bank	\N	\N	2026-04-07 21:28:42.256265+00
1401	2025-09-28	111	50000	bank	\N	\N	2026-04-07 21:28:42.264263+00
1874	2025-08-30	3	100000	bank	\N	\N	2026-04-07 21:28:42.806674+00
1311	2025-10-15	24	150000	bank	\N	SHRI BALAJI ENTERPR | Sender: SHRI BALAJI ENTERPR	2026-04-07 21:28:42.160791+00
1406	2025-10-05	111	30000	bank	\N	\N	2026-04-07 21:28:42.270934+00
1407	2025-10-05	111	19200	bank	\N	\N	2026-04-07 21:28:42.27195+00
1409	2025-10-06	111	50000	bank	\N	\N	2026-04-07 21:28:42.27378+00
1410	2025-10-06	111	75000	bank	\N	\N	2026-04-07 21:28:42.2745+00
1411	2025-10-09	111	200000	cash	\N	CASH RECEIVED	2026-04-07 21:28:42.275269+00
1412	2025-10-09	111	61000	bank	\N	\N	2026-04-07 21:28:42.276066+00
1413	2025-10-15	111	100000	bank	\N	\N	2026-04-07 21:28:42.276852+00
1415	2025-10-16	111	37500	bank	\N	\N	2026-04-07 21:28:42.278738+00
1416	2025-10-25	111	50000	bank	\N	\N	2026-04-07 21:28:42.279596+00
1417	2025-10-27	111	100000	bank	\N	\N	2026-04-07 21:28:42.280752+00
1418	2025-10-27	111	50000	bank	\N	\N	2026-04-07 21:28:42.281873+00
1419	2025-10-27	111	25000	bank	\N	\N	2026-04-07 21:28:42.283023+00
1420	2025-11-01	111	53500	bank	\N	\N	2026-04-07 21:28:42.283856+00
1421	2025-11-02	111	99000	bank	\N	\N	2026-04-07 21:28:42.285078+00
1423	2025-11-07	111	105000	bank	\N	\N	2026-04-07 21:28:42.287444+00
1424	2025-11-13	111	40000	bank	\N	\N	2026-04-07 21:28:42.288535+00
1425	2025-11-13	111	10000	bank	\N	\N	2026-04-07 21:28:42.2897+00
1427	2025-12-01	111	95000	bank	\N	\N	2026-04-07 21:28:42.291939+00
1428	2025-12-09	111	60000	bank	\N	\N	2026-04-07 21:28:42.293105+00
1429	2025-12-10	111	22615	bank	\N	\N	2026-04-07 21:28:42.294255+00
1431	2026-02-07	111	2000	bank	\N	\N	2026-04-07 21:28:42.296574+00
1432	2026-02-07	111	22000	bank	\N	\N	2026-04-07 21:28:42.297782+00
1433	2026-02-07	111	1001	bank	\N	\N	2026-04-07 21:28:42.299069+00
1434	2026-02-23	111	16200	cash	\N	FRIGHT PAID	2026-04-07 21:28:42.300127+00
1435	2026-02-23	111	16200	cash	\N	FRIGHT PAID	2026-04-07 21:28:42.301399+00
1436	2026-02-25	111	250000	cash	\N	cash received paid to dixit rbl	2026-04-07 21:28:42.302742+00
1437	2026-02-28	111	100000	bank	\N	\N	2026-04-07 21:28:42.304076+00
1438	2026-03-01	111	70000	bank	\N	\N	2026-04-07 21:28:42.305249+00
1439	2026-03-03	111	2000	bank	\N	\N	2026-04-07 21:28:42.306464+00
1440	2026-03-03	111	48000	bank	\N	\N	2026-04-07 21:28:42.307701+00
1441	2026-03-06	111	130000	bank	\N	\N	2026-04-07 21:28:42.308641+00
1442	2026-03-06	111	50000	bank	\N	\N	2026-04-07 21:28:42.309856+00
1443	2026-03-10	111	63800	bank	\N	\N	2026-04-07 21:28:42.310976+00
1444	2026-03-11	111	1000	bank	\N	\N	2026-04-07 21:28:42.31205+00
1445	2026-03-11	111	38000	bank	\N	\N	2026-04-07 21:28:42.313239+00
1446	2026-03-11	111	60000	bank	\N	\N	2026-04-07 21:28:42.314092+00
1447	2026-03-12	111	44000	bank	\N	\N	2026-04-07 21:28:42.315322+00
1448	2026-03-14	111	45000	bank	\N	\N	2026-04-07 21:28:42.316368+00
1449	2026-03-15	111	25000	bank	\N	\N	2026-04-07 21:28:42.317226+00
1452	2026-03-20	111	64800	bank	\N	\N	2026-04-07 21:28:42.321568+00
1453	2025-10-07	115	15100	cash	\N	cash received	2026-04-07 21:28:42.323056+00
1455	2025-08-11	135	61000	bank	\N	\N	2026-04-07 21:28:42.328603+00
1456	2025-08-18	135	135300	bank	\N	\N	2026-04-07 21:28:42.329748+00
1457	2025-08-20	135	3100	bank	\N	\N	2026-04-07 21:28:42.330776+00
1458	2025-09-03	135	100000	bank	\N	\N	2026-04-07 21:28:42.331685+00
1459	2025-09-04	135	50000	bank	\N	\N	2026-04-07 21:28:42.332831+00
1475	2025-09-16	135	75000	bank	ARMTECH	MAHALAXMI TRADERS	2026-04-07 21:28:42.350223+00
1476	2025-09-17	135	99995.28	bank	ARMTECH	GAURAV TRADERS	2026-04-07 21:28:42.351407+00
1477	2025-09-20	135	98000	bank	ARMTECH	GAURAV TRADERS	2026-04-07 21:28:42.352653+00
1478	2025-09-20	135	171000	bank	ARMTECH	SHIV SHAKTI	2026-04-07 21:28:42.353788+00
1479	2025-09-22	135	20000	bank	KOTAK	HIMANSHU	2026-04-07 21:28:42.354886+00
1480	2025-09-23	135	1	bank	ARMTECH	HIMANSHU	2026-04-07 21:28:42.355855+00
1481	2025-09-23	135	22500	bank	ARMTECH	HIMANSHU	2026-04-07 21:28:42.356991+00
1482	2025-09-23	135	5000	bank	ARMTECH	HIMANSHU	2026-04-07 21:28:42.358157+00
1483	2025-09-23	135	50000	bank	ARMTECH	vijay laxmi traders	2026-04-07 21:28:42.35928+00
1484	2025-09-24	135	9000	bank	ARMTECH	HIMANSHU	2026-04-07 21:28:42.36045+00
1485	2025-09-24	135	40000	bank	ARMTECH	KMDV TRADERS	2026-04-07 21:28:42.361578+00
1486	2025-09-25	135	70000	bank	ARMTECH	MAHALAXMI TRADERS	2026-04-07 21:28:42.362398+00
1487	2025-09-30	135	189000	bank	ARMTECH	kashi traders	2026-04-07 21:28:42.363245+00
1489	2025-10-08	135	127000	bank	ARMTECH	BALAJEE INTERLOKING	2026-04-07 21:28:42.365475+00
1490	2025-10-09	135	55000	bank	ARMTECH	KMDV TRADERS	2026-04-07 21:28:42.366585+00
1491	2025-10-13	135	60000	bank	ARMTECH	KMDV TRADERS	2026-04-07 21:28:42.367436+00
1492	2025-10-15	135	1	bank	ARMTECH	HIMANSHU	2026-04-07 21:28:42.368657+00
1493	2025-10-15	135	150000	bank	ARMTECH	ANUJ ENTERPRISES(	2026-04-07 21:28:42.369882+00
1494	2025-10-15	135	50000	bank	ARMTECH	HIMANSHU	2026-04-07 21:28:42.371017+00
1495	2025-10-15	135	30000	bank	ARMTECH	HIMANSHU	2026-04-07 21:28:42.371993+00
1496	2025-10-19	135	94000	bank	ARMTECH	SHRESHTH CONSTRUCTION	2026-04-07 21:28:42.373319+00
1497	2025-10-29	135	100000	bank	ARMTECH	VIJAY LAKSHMI	2026-04-07 21:28:42.37439+00
1498	2025-10-29	135	1000	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.375874+00
1499	2025-10-29	135	79000	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.377294+00
1875	2025-08-31	3	50000	bank	\N	\N	2026-04-07 21:28:42.807753+00
1426	2025-11-28	111	33000	bank	\N	cement | Sender: cement	2026-04-07 21:28:42.290848+00
1500	2025-10-29	135	142000	bank	ARMTECH	KASHI TRADER	2026-04-07 21:28:42.378218+00
1501	2025-10-30	135	50000	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.379359+00
1502	2025-11-03	135	27500	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.380503+00
1504	2025-11-11	135	100000	bank	ARMTECH	BALAJEE INTERLOKING	2026-04-07 21:28:42.382809+00
1505	2025-11-12	135	100000	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.383749+00
1506	2025-11-13	135	30000	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.384934+00
1507	2025-11-14	135	30000	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.386148+00
1508	2025-11-15	135	96000	bank	ARMTECH	VINOD PUNB0823300	2026-04-07 21:28:42.387315+00
1509	2025-11-15	135	11220	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.388464+00
1510	2025-11-17	135	186000	bank	ARMTECH	KASHI TRADERS	2026-04-07 21:28:42.38948+00
1511	2025-11-17	135	150000	bank	ARMTECH	RAMASHANKAR	2026-04-07 21:28:42.390635+00
1512	2025-11-20	135	100	bank	ARMTECH	MANISH TRADING COMPANY	2026-04-07 21:28:42.391483+00
1513	2025-11-20	135	500	bank	ARMTECH	anurag	2026-04-07 21:28:42.392621+00
1514	2025-11-20	135	99500	bank	ARMTECH	anurag	2026-04-07 21:28:42.393825+00
1515	2025-11-21	135	100000	bank	ARMTECH	MANISH TRADING COMPANY	2026-04-07 21:28:42.394935+00
1516	2025-11-21	135	100000	bank	ARMTECH	GIRJESH	2026-04-07 21:28:42.396078+00
1521	2025-12-02	135	50000	bank	KOTAK	HIMANSHU	2026-04-07 21:28:42.401919+00
1523	2025-12-05	135	100000	bank	ARMTECH	BALAJEE INTERLOKING	2026-04-07 21:28:42.404214+00
1536	2026-03-18	135	26000	bank	ARMTECH	\N	2026-04-07 21:28:42.417103+00
1537	2026-03-18	135	2500	bank	\N	\N	2026-04-07 21:28:42.418299+00
1538	2026-03-23	135	20000	bank	ARMTECH	\N	2026-04-07 21:28:42.419496+00
1539	2026-03-25	135	26000	cash	\N	CASH RECEIVED	2026-04-07 21:28:42.420655+00
1540	2026-03-27	135	27000	cash	\N	CASH RECEIVED	2026-04-07 21:28:42.421768+00
1571	2025-11-05	27	8000	bank	\N	\N	2026-04-07 21:28:42.454994+00
1572	2025-11-05	27	2000	bank	\N	\N	2026-04-07 21:28:42.456187+00
1573	2025-11-05	27	8000	bank	\N	\N	2026-04-07 21:28:42.457276+00
1574	2025-11-05	27	2000	bank	\N	\N	2026-04-07 21:28:42.45839+00
1575	2025-11-29	27	10000	bank	\N	\N	2026-04-07 21:28:42.459241+00
1577	2025-09-23	73	85000	cash	\N	cash received	2026-04-07 21:28:42.4614+00
1876	2025-09-02	3	29600	bank	\N	\N	2026-04-07 21:28:42.808857+00
1517	2025-11-22	135	40000	bank	ARMTECH	\N	2026-04-07 21:28:42.397224+00
1518	2025-11-24	135	70000	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.398413+00
1503	2025-11-10	135	30000	bank	ARMTECH	vijay laxmi	2026-04-07 21:28:42.381705+00
1528	2026-01-09	135	65000	bank	KOTAK	MADHURI SINGH	2026-04-07 21:28:42.409829+00
1570	2025-11-05	27	5000	cash	\N	CASH	2026-04-07 21:28:42.453894+00
1541	2025-10-11	60	20000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.423048+00
1542	2025-10-15	60	12000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.424027+00
1543	2025-10-26	60	12000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.425106+00
1544	2025-10-29	60	30000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.426081+00
1545	2025-11-04	60	12000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.427104+00
1546	2025-11-07	60	14000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.428167+00
1547	2025-11-11	60	15000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.429575+00
1548	2025-11-16	60	20000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.430693+00
1591	2025-08-12	124	217000	bank	\N	\N	2026-04-07 21:28:42.476864+00
1592	2025-08-26	124	150000	bank	\N	\N	2026-04-07 21:28:42.477974+00
1593	2025-08-27	124	60000	bank	\N	\N	2026-04-07 21:28:42.479318+00
1594	2025-09-01	124	100000	bank	\N	\N	2026-04-07 21:28:42.480752+00
1595	2025-09-04	124	100000	bank	\N	\N	2026-04-07 21:28:42.482165+00
1596	2025-09-20	124	150000	bank	\N	\N	2026-04-07 21:28:42.483299+00
1601	2025-02-16	97	230	bank	\N	\N	2026-04-07 21:28:42.489803+00
1602	2025-02-16	97	138000	cash	\N	\N	2026-04-07 21:28:42.490696+00
1628	2025-10-16	15	50000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.521359+00
1610	2025-09-15	15	150000	bank	ARMTECH	KESARWANI STEEL AND SANITAR	2026-04-07 21:28:42.50167+00
1611	2025-09-15	15	50000	bank	ARMTECH	SANDEEP KUMAR	2026-04-07 21:28:42.502884+00
1612	2025-09-15	15	215600	bank	BOB	SHIV ENTERPRISES	2026-04-07 21:28:42.504069+00
1615	2025-09-26	15	65000	bank	ARMTECH	SHRI SHYAM UDYOG	2026-04-07 21:28:42.507244+00
1616	2025-09-26	15	5000	bank	KOTAK	RAM PRAKASH	2026-04-07 21:28:42.508392+00
1617	2025-09-29	15	191180	bank	BOB	HANUMAN SHARAN SINGH	2026-04-07 21:28:42.50925+00
1618	2025-09-30	15	30000	bank	ARMTECH	ASHUTOSH	2026-04-07 21:28:42.510093+00
1619	2025-10-07	15	203000	bank	BOB	CHAUHAN TRADERS	2026-04-07 21:28:42.510903+00
1620	2025-10-08	15	40000	bank	ARMTECH	ASHUTOSH MISHRA	2026-04-07 21:28:42.512026+00
1621	2025-10-08	15	20000	bank	BOB	\N	2026-04-07 21:28:42.513189+00
1622	2025-10-08	15	10000	bank	BOB	\N	2026-04-07 21:28:42.514362+00
1623	2025-10-08	15	10000	bank	BOB	\N	2026-04-07 21:28:42.515546+00
1624	2025-10-08	15	10000	bank	BOB	\N	2026-04-07 21:28:42.516611+00
1625	2025-10-08	15	32500	bank	ARMTECH	SWATI ENTERPRISES	2026-04-07 21:28:42.517819+00
1626	2025-10-11	15	75000	bank	ARMTECH	Dinesh Kumar	2026-04-07 21:28:42.519089+00
1627	2025-10-15	15	15000	bank	ARMTECH	ASHUTOSH MISHRA	2026-04-07 21:28:42.520219+00
1629	2025-10-18	15	50000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.522259+00
1630	2025-10-18	15	200000	bank	BOB	cement	2026-04-07 21:28:42.523444+00
1631	2025-10-27	15	171000	bank	ARMTECH	ADARSH TRADING COMPANY	2026-04-07 21:28:42.524344+00
1635	2025-10-29	15	179000	bank	BOB	HANUMAN SHARAN SINGH	2026-04-07 21:28:42.528673+00
1637	2025-11-03	15	15000	bank	BOB	\N	2026-04-07 21:28:42.530626+00
1638	2025-11-03	15	20000	bank	BOB	\N	2026-04-07 21:28:42.531403+00
1639	2025-11-04	15	30000	bank	BOB	\N	2026-04-07 21:28:42.532548+00
1640	2025-11-05	15	44000	bank	BOB	\N	2026-04-07 21:28:42.534045+00
1641	2025-11-05	15	800	bank	BOB	\N	2026-04-07 21:28:42.535753+00
1650	2025-11-19	15	30600	bank	ARMTECH	Mr ASHUTOSH	2026-04-07 21:28:42.545552+00
1651	2025-11-19	15	19000	bank	BOB	\N	2026-04-07 21:28:42.546504+00
1652	2025-11-19	15	140000	bank	BOB	PRAMOD KUMAR	2026-04-07 21:28:42.547375+00
1655	2025-11-25	15	20000	bank	BOB	\N	2026-04-07 21:28:42.550459+00
1656	2025-11-25	15	7000	bank	BOB	\N	2026-04-07 21:28:42.551675+00
1661	2025-12-02	15	50000	bank	AXIS	INDIA CEMENT PIPE INDUSTRIES	2026-04-07 21:28:42.556927+00
1663	2025-12-03	15	50000	bank	AXIS	INDIA CEMENT PIPE INDUSTRIES	2026-04-07 21:28:42.559171+00
1666	2025-12-04	15	50000	bank	KOTAK	SANDEEP KUMAR	2026-04-07 21:28:42.561914+00
1668	2025-12-06	15	205200	bank	BOB	SHRI SHYAM ITT	2026-04-07 21:28:42.564122+00
1669	2025-12-07	15	30000	bank	BOB	\N	2026-04-07 21:28:42.564939+00
1670	2025-12-08	15	195000	bank	BOB	CHAUHAN TRADERS	2026-04-07 21:28:42.566081+00
1671	2025-12-08	15	4500	bank	KOTAK	\N	2026-04-07 21:28:42.567378+00
1672	2025-12-10	15	99750	bank	AXIS	RISHABH ENTERPRISES	2026-04-07 21:28:42.568398+00
1674	2025-12-12	15	14000	bank	BOB	\N	2026-04-07 21:28:42.570713+00
1676	2025-12-15	15	34300	bank	BOB	\N	2026-04-07 21:28:42.572696+00
1636	2025-10-30	15	30000	bank	ARMTECH	sandeep kumar	2026-04-07 21:28:42.529508+00
1642	2025-11-06	15	29000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.537086+00
1643	2025-11-07	15	30000	bank	ARMTECH	SANDEEP KUMAR	2026-04-07 21:28:42.538475+00
1646	2025-11-12	15	10000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.541831+00
1647	2025-11-17	15	25500	bank	ARMTECH	SANDEEP KUMAR	2026-04-07 21:28:42.542611+00
1653	2025-11-20	15	50000	bank	ARMTECH	Dinesh Kum	2026-04-07 21:28:42.548245+00
1654	2025-11-25	15	55000	bank	ARMTECH	Dinesh Kum	2026-04-07 21:28:42.549397+00
1657	2025-11-27	15	17000	bank	ARMTECH	\N	2026-04-07 21:28:42.552878+00
1660	2025-11-29	15	30000	bank	ARMTECH	SANDEEP KUMAR	2026-04-07 21:28:42.556156+00
1662	2025-12-02	15	26700	bank	ARMTECH	Dinesh Kum	2026-04-07 21:28:42.558058+00
1673	2025-12-11	15	50000	bank	ARMTECH	Dinesh Kum	2026-04-07 21:28:42.569607+00
1584	2025-11-08	73	102000	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.469607+00
1585	2025-11-12	73	54000	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.470801+00
1586	2025-11-25	73	175000	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.471761+00
1587	2025-11-28	73	243000	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.472885+00
1588	2025-12-01	73	242100	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.473991+00
1589	2026-03-20	73	300000	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.47513+00
1590	2026-03-30	73	250000	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.475929+00
1677	2025-12-15	15	75000	bank	AXIS	PANDEY BRICKS	2026-04-07 21:28:42.573912+00
1681	2025-12-19	15	29800	bank	BOB	\N	2026-04-07 21:28:42.578317+00
1685	2025-12-24	15	31000	bank	BOB	\N	2026-04-07 21:28:42.582589+00
1688	2025-12-29	15	35000	bank	BOB	\N	2026-04-07 21:28:42.586414+00
1691	2026-01-05	15	196000	bank	AXIS	CHAUHAN ENTERPRISES	2026-04-07 21:28:42.590176+00
1700	2026-01-14	15	20000	bank	BOB	\N	2026-04-07 21:28:42.600177+00
1701	2026-01-16	15	10000	bank	BOB	\N	2026-04-07 21:28:42.601399+00
1702	2026-01-16	15	10000	bank	BOB	\N	2026-04-07 21:28:42.602429+00
1706	2026-01-28	15	206500	bank	BOB	SHRI SHYAM ITT UDYOG	2026-04-07 21:28:42.606947+00
1715	2026-02-16	15	20000	bank	BOB	ANUBHAV	2026-04-07 21:28:42.616871+00
1720	2026-02-25	15	30000	bank	BOB	\N	2026-04-07 21:28:42.622559+00
1726	2026-03-12	15	50000	bank	BOB	\N	2026-04-07 21:28:42.628358+00
1729	2026-03-17	15	92600	bank	BOB	\N	2026-04-07 21:28:42.631431+00
1732	2026-03-23	15	20000	bank	BOB	\N	2026-04-07 21:28:42.633693+00
1733	2026-03-24	15	111000	bank	BOB	\N	2026-04-07 21:28:42.634466+00
1737	2026-04-01	15	8000	bank	BOB	\N	2026-04-07 21:28:42.639244+00
1738	2026-04-01	15	2000	bank	BOB	\N	2026-04-07 21:28:42.640652+00
1743	2025-02-23	57	102765	cash	\N	CASH RECEIVED	2026-04-07 21:28:42.645258+00
1744	2025-08-31	110	100000	bank	\N	\N	2026-04-07 21:28:42.648378+00
1746	2025-09-15	110	37600	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.650477+00
1747	2025-10-14	110	100000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.651693+00
1748	2025-10-27	110	44600	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.652935+00
1749	2025-11-08	110	50000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.654044+00
1750	2025-11-14	110	100000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.655086+00
1751	2025-11-20	110	157200	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.656188+00
1752	2025-11-28	110	100000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.657369+00
1753	2025-12-06	110	100000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.658577+00
1754	2025-12-12	110	100000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.659658+00
1755	2025-12-18	110	27483	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.660803+00
1756	2025-12-25	110	100000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.661899+00
1757	2025-12-30	110	82986	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.663107+00
1758	2026-01-09	110	100000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.66399+00
1759	2026-01-16	110	50000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.665121+00
1760	2026-01-28	110	100000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.666201+00
1761	2026-02-07	110	50000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.667384+00
1762	2026-02-18	110	50000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.668623+00
1763	2026-03-16	110	70000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.669758+00
1764	2026-03-26	110	50000	bank	ARMTECH	SS INDUSTRIES	2026-04-07 21:28:42.670941+00
1679	2025-12-17	15	50000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.575902+00
1684	2025-12-23	15	70000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.581607+00
1687	2025-12-27	15	50000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.584961+00
1696	2026-01-09	15	28000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.595873+00
1697	2026-01-13	15	50000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.596662+00
1703	2026-01-19	15	50000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.603549+00
1707	2026-01-28	15	30000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.608073+00
1708	2026-02-02	15	20000	bank	ARMTECH	DINESH KUMAR	2026-04-07 21:28:42.609175+00
1692	2026-01-06	15	25000	bank	KOTAK	anubhav	2026-04-07 21:28:42.591467+00
1695	2026-01-09	15	550	bank	KOTAK	anubhav singh	2026-04-07 21:28:42.594776+00
1727	2026-03-13	15	19504.4	bank	AXIS	\N	2026-04-07 21:28:42.62924+00
1731	2026-03-18	15	74000	bank	AXIS	\N	2026-04-07 21:28:42.632948+00
1735	2026-03-25	15	153500	bank	AXIS	\N	2026-04-07 21:28:42.636563+00
1718	2026-02-24	15	100000	bank	HDFC	\N	2026-04-07 21:28:42.620383+00
1712	2026-02-11	15	20000	bank	\N	rahul sir saving | Sender: rahul sir saving	2026-04-07 21:28:42.613716+00
1713	2026-02-11	15	20000	bank	\N	rahul sir saving | Sender: rahul sir saving	2026-04-07 21:28:42.614915+00
1741	2025-09-23	57	100000	bank	\N	HP CONSTRUCTION | Sender: HP CONSTRUCTION	2026-04-07 21:28:42.643545+00
1742	2025-10-25	57	100000	bank	\N	CEMENT | Sender: CEMENT	2026-04-07 21:28:42.644464+00
1745	2025-09-06	110	100000	bank	\N	SS INDUSTRIES | Sender: SS INDUSTRIES	2026-04-07 21:28:42.649457+00
1765	2025-09-02	71	25000	bank	\N	NIKHIL SINGH BUDDESHWER A/C | Sender: NIKHIL SINGH BUDDESHWER A/C	2026-04-07 21:28:42.674213+00
1766	2025-09-02	71	25000	bank	\N	NIKHIL SINGH BUDDESHWER A/C | Sender: NIKHIL SINGH BUDDESHWER A/C	2026-04-07 21:28:42.675194+00
1767	2025-09-02	71	15000	bank	\N	NIKHIL SINGH BUDDESHWER A/C | Sender: NIKHIL SINGH BUDDESHWER A/C	2026-04-07 21:28:42.676279+00
1768	2025-09-02	71	173000	bank	\N	CHAUDHARY BRICKS FIELD | Sender: CHAUDHARY BRICKS FIELD	2026-04-07 21:28:42.677386+00
1774	2025-09-30	71	61000	bank	\N	\N	2026-04-07 21:28:42.682908+00
1777	2025-10-28	71	100000	bank	\N	\N	2026-04-07 21:28:42.686471+00
1778	2025-11-07	71	189000	bank	\N	\N	2026-04-07 21:28:42.687645+00
1779	2025-11-08	71	70000	bank	\N	\N	2026-04-07 21:28:42.688632+00
1780	2025-11-11	71	30000	bank	\N	\N	2026-04-07 21:28:42.689449+00
1781	2025-11-13	71	50000	bank	\N	\N	2026-04-07 21:28:42.690619+00
1782	2025-11-17	71	27000	bank	\N	\N	2026-04-07 21:28:42.691791+00
1783	2025-11-20	71	30000	bank	\N	\N	2026-04-07 21:28:42.692905+00
1787	2025-11-24	71	30000	bank	\N	\N	2026-04-07 21:28:42.698558+00
1788	2025-12-04	71	69000	bank	\N	\N	2026-04-07 21:28:42.699606+00
1790	2025-12-09	71	45000	bank	\N	\N	2026-04-07 21:28:42.701951+00
1791	2025-12-11	71	30000	bank	\N	\N	2026-04-07 21:28:42.703149+00
1793	2025-12-15	71	35000	bank	\N	\N	2026-04-07 21:28:42.70525+00
1794	2025-12-15	71	13000	bank	\N	\N	2026-04-07 21:28:42.706381+00
1795	2025-12-19	71	34900	bank	\N	\N	2026-04-07 21:28:42.707428+00
1796	2025-12-20	71	235000	bank	\N	\N	2026-04-07 21:28:42.708581+00
1797	2025-12-22	71	60000	cash	\N	received from himanshu singh	2026-04-07 21:28:42.709748+00
1798	2025-12-22	71	50000	bank	\N	\N	2026-04-07 21:28:42.710882+00
1799	2025-12-23	71	60000	bank	\N	\N	2026-04-07 21:28:42.712085+00
1800	2025-12-26	71	20000	bank	\N	\N	2026-04-07 21:28:42.713158+00
1801	2025-12-26	71	10000	bank	\N	\N	2026-04-07 21:28:42.713941+00
1802	2025-12-29	71	16100	bank	\N	\N	2026-04-07 21:28:42.715161+00
1803	2025-12-29	71	45000	bank	\N	\N	2026-04-07 21:28:42.71624+00
1805	2025-01-07	71	40000	bank	\N	\N	2026-04-07 21:28:42.718608+00
1807	2025-01-29	71	17500	bank	\N	\N	2026-04-07 21:28:42.720956+00
1808	2026-01-30	71	14800	bank	\N	\N	2026-04-07 21:28:42.722043+00
1809	2026-02-03	71	37000	bank	\N	\N	2026-04-07 21:28:42.723138+00
1810	2026-02-05	71	50000	bank	\N	\N	2026-04-07 21:28:42.723954+00
1811	2026-02-09	71	41000	bank	\N	\N	2026-04-07 21:28:42.725155+00
1812	2026-02-11	71	50000	bank	\N	\N	2026-04-07 21:28:42.726213+00
1813	2026-02-16	71	80000	bank	\N	\N	2026-04-07 21:28:42.727419+00
1814	2026-02-25	71	24000	bank	\N	\N	2026-04-07 21:28:42.728664+00
1815	2026-02-26	71	25000	bank	\N	\N	2026-04-07 21:28:42.729566+00
1816	2026-03-02	71	50000	bank	\N	\N	2026-04-07 21:28:42.730676+00
1817	2026-03-06	71	36000	bank	\N	\N	2026-04-07 21:28:42.731912+00
1818	2026-03-06	71	55000	bank	\N	\N	2026-04-07 21:28:42.732735+00
1819	2026-03-06	71	25000	bank	\N	\N	2026-04-07 21:28:42.733899+00
1820	2026-03-09	71	213500	bank	\N	\N	2026-04-07 21:28:42.735096+00
1821	2026-03-10	71	38500	bank	\N	\N	2026-04-07 21:28:42.736064+00
1822	2026-03-16	71	35000	bank	\N	\N	2026-04-07 21:28:42.737168+00
1823	2026-03-18	71	59000	bank	\N	\N	2026-04-07 21:28:42.738282+00
1824	2026-03-18	71	20000	bank	\N	\N	2026-04-07 21:28:42.739078+00
1825	2026-03-19	71	10000	bank	\N	\N	2026-04-07 21:28:42.740247+00
1826	2026-03-25	71	50000	bank	\N	\N	2026-04-07 21:28:42.741375+00
1827	2026-03-26	71	40000	bank	\N	\N	2026-04-07 21:28:42.742096+00
1828	2026-03-28	71	50000	bank	\N	\N	2026-04-07 21:28:42.742887+00
1829	2026-03-29	71	10000	bank	\N	\N	2026-04-07 21:28:42.744137+00
1830	2026-04-02	71	12800	bank	\N	\N	2026-04-07 21:28:42.745227+00
1831	2026-04-03	71	32500	bank	\N	\N	2026-04-07 21:28:42.746382+00
1832	1900-10-08	102	336000	cash	\N	\N	2026-04-07 21:28:42.750657+00
1833	1930-08-30	102	189000	bank	\N	\N	2026-04-07 21:28:42.752049+00
1836	1900-03-15	106	19500	bank	\N	\N	2026-04-07 21:28:42.759033+00
1837	2026-03-16	99	1	bank	ARMTECH	SONI ENTERPRISES	2026-04-07 21:28:42.760408+00
1838	2026-03-16	99	300000	bank	ARMTECH	SONI ENTERPRISES	2026-04-07 21:28:42.761497+00
1839	2026-03-18	99	100000	bank	ARMTECH	SONI ENTERPRISES	2026-04-07 21:28:42.762321+00
1840	2026-03-25	99	146800	bank	ARMTECH	SONI ENTERPRISES	2026-04-07 21:28:42.763463+00
1841	2026-03-28	99	100000	bank	ARMTECH	SONI ENTERPRISES	2026-04-07 21:28:42.764797+00
1842	2026-04-05	99	100000	bank	ARMTECH	SONI ENTERPRISES	2026-04-07 21:28:42.765804+00
1843	2025-08-20	176	100000	bank	\N	\N	2026-04-07 21:28:42.770717+00
1844	2025-08-27	176	40000	bank	\N	\N	2026-04-07 21:28:42.771813+00
1845	2025-08-20	176	29400	cash	\N	freight	2026-04-07 21:28:42.772831+00
1846	2025-08-05	176	50000	bank	\N	\N	2026-04-07 21:28:42.773952+00
1848	2025-09-27	176	100000	cash	\N	CASH RECEIVED	2026-04-07 21:28:42.77592+00
1849	2025-09-27	176	29750	cash	\N	TANSEN FREIGHT	2026-04-07 21:28:42.777036+00
1850	2025-09-27	176	50000	cash	\N	SANJAY SINGH	2026-04-07 21:28:42.778151+00
1851	2025-10-02	176	77000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.77928+00
1852	2025-10-04	176	29750	cash	\N	tansen freight	2026-04-07 21:28:42.780478+00
1853	2025-10-06	176	66500	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.781801+00
1854	2025-11-07	176	50000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.782748+00
1855	2025-11-08	176	40000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.783973+00
1856	2025-11-09	176	40000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.78494+00
1857	2025-11-11	176	70000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.786183+00
1858	2025-11-13	176	29400	cash	\N	tansen freight	2026-04-07 21:28:42.787334+00
1859	2025-11-20	176	50000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.788453+00
1860	2025-11-28	176	50000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.789476+00
1861	2025-12-11	176	40000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.790387+00
1862	2025-12-23	176	24100	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.791499+00
1863	2025-12-25	176	50000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.792617+00
1864	2025-12-30	176	50000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.793772+00
1865	2026-01-17	176	50000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.794834+00
1866	2026-01-27	176	26000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.796014+00
1867	2026-01-30	176	20000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.797133+00
1870	2026-02-27	176	50000	cash	\N	received in rahul sir a/c	2026-04-07 21:28:42.800506+00
1847	2025-09-20	176	50000	bank	KOTAK	SANJAY SINGH	2026-04-07 21:28:42.77476+00
1770	2025-09-15	71	25000	bank	\N	UPI/525822716906/17:52:11/UPI/ns1640346@okaxis/UP | Sender: UPI/525822716906/17:52:11/UPI/ns1640346@okaxis/UP	2026-04-07 21:28:42.679036+00
1878	2025-09-21	63	30000	cash	\N	CASH RECEIVED	2026-04-07 21:28:42.813689+00
1886	2026-02-05	63	100000	cash	\N	cash received	2026-04-07 21:28:42.823555+00
1887	2026-02-08	63	100000	cash	\N	cash received	2026-04-07 21:28:42.824442+00
1888	2026-02-11	63	50000	cash	\N	cash received	2026-04-07 21:28:42.825562+00
1889	2026-02-18	63	50000	cash	\N	cash received	2026-04-07 21:28:42.826624+00
1890	2026-02-22	63	33000	cash	\N	cash received	2026-04-07 21:28:42.827936+00
1891	2026-02-26	63	20000	cash	\N	cash received	2026-04-07 21:28:42.828912+00
1892	2026-03-11	63	5000	cash	\N	cash received	2026-04-07 21:28:42.830047+00
1893	2026-03-18	63	48100	cash	\N	cash received	2026-04-07 21:28:42.83126+00
1894	2026-03-18	63	28900	bank	\N	\N	2026-04-07 21:28:42.83233+00
1895	2025-09-11	35	138000	cash	\N	CASH RECEIVED IN MAHATEJAS	2026-04-07 21:28:42.833598+00
1896	2025-10-13	35	48600	cash	\N	CASH RECEIVED	2026-04-07 21:28:42.83446+00
1898	2025-06-27	30	50000	bank	\N	\N	2026-04-07 21:28:42.839658+00
1899	2025-06-28	30	150000	bank	\N	\N	2026-04-07 21:28:42.840674+00
1900	2025-07-05	30	37900	bank	\N	\N	2026-04-07 21:28:42.841691+00
1901	2025-08-11	30	95000	bank	\N	\N	2026-04-07 21:28:42.842792+00
1902	2025-08-15	30	50000	bank	\N	\N	2026-04-07 21:28:42.844009+00
1903	2025-08-20	30	50000	bank	\N	\N	2026-04-07 21:28:42.845113+00
1913	2025-10-01	30	2800	cash	\N	cash received	2026-04-07 21:28:42.856426+00
1916	2025-11-09	30	3500	cash	\N	cash received	2026-04-07 21:28:42.859984+00
1938	2026-03-22	30	100000	bank	\N	\N	2026-04-07 21:28:42.884084+00
1941	2024-04-10	131	50000	bank	ARMTECH	ARMTECH	2026-04-07 21:28:42.887998+00
1942	2024-04-10	131	160700	bank	ARMTECH	ARMTECH	2026-04-07 21:28:42.889002+00
1943	2024-04-19	131	230999	bank	ARMTECH	ARMTECH	2026-04-07 21:28:42.890091+00
1944	2024-04-29	131	231000	bank	ARMTECH	ARMTECH	2026-04-07 21:28:42.891264+00
1945	2024-05-01	131	255200	bank	ARMTECH	ARMTECH	2026-04-07 21:28:42.89238+00
1946	2024-05-12	131	277200	bank	ARMTECH	ARMTECH	2026-04-07 21:28:42.893534+00
1947	2024-06-03	131	100000	bank	ICICI	ICICI	2026-04-07 21:28:42.894663+00
1948	2024-04-10	51	214500	bank	\N	\N	2026-04-07 21:28:42.895968+00
1949	2024-06-11	51	224000	bank	\N	\N	2026-04-07 21:28:42.897079+00
1950	2024-06-28	51	300000	bank	\N	\N	2026-04-07 21:28:42.898187+00
1951	2023-03-28	104	150000	bank	\N	\N	2026-04-07 21:28:42.901131+00
1952	2023-03-31	104	100000	bank	\N	\N	2026-04-07 21:28:42.902379+00
1953	2024-04-03	104	150000	bank	\N	\N	2026-04-07 21:28:42.903566+00
1954	2024-04-04	104	40000	bank	\N	\N	2026-04-07 21:28:42.904718+00
1955	2024-04-06	104	100000	bank	\N	\N	2026-04-07 21:28:42.90586+00
1956	2024-04-08	104	100000	bank	\N	\N	2026-04-07 21:28:42.906834+00
1957	2024-04-11	104	50000	bank	\N	\N	2026-04-07 21:28:42.908016+00
1958	2024-04-12	104	100000	bank	\N	\N	2026-04-07 21:28:42.909121+00
1959	2024-04-12	104	200000	bank	\N	\N	2026-04-07 21:28:42.910248+00
1960	2024-04-15	104	50000	bank	\N	\N	2026-04-07 21:28:42.911377+00
1961	2024-04-18	104	100000	bank	\N	\N	2026-04-07 21:28:42.9125+00
1962	2024-04-18	104	100000	bank	\N	\N	2026-04-07 21:28:42.913644+00
1963	2024-04-19	104	200000	bank	\N	\N	2026-04-07 21:28:42.914919+00
1964	2024-04-22	104	50000	bank	\N	\N	2026-04-07 21:28:42.915946+00
1965	2024-04-23	104	150000	bank	\N	\N	2026-04-07 21:28:42.917043+00
1966	2024-04-23	104	100000	bank	\N	\N	2026-04-07 21:28:42.917806+00
1967	2024-04-24	104	50000	bank	\N	\N	2026-04-07 21:28:42.919033+00
1968	2024-04-27	104	100000	bank	\N	\N	2026-04-07 21:28:42.92024+00
1877	2025-09-02	63	157800	bank	\N	ADITYA ENTERPRISES | Sender: ADITYA ENTERPRISES	2026-04-07 21:28:42.812515+00
1969	2024-05-06	104	50000	bank	\N	\N	2026-04-07 21:28:42.921353+00
1970	2024-05-07	104	70000	bank	\N	\N	2026-04-07 21:28:42.922456+00
1971	2024-05-08	104	50000	bank	\N	\N	2026-04-07 21:28:42.923602+00
1972	2024-05-10	104	50000	bank	\N	\N	2026-04-07 21:28:42.924722+00
1973	2024-05-11	104	50000	bank	\N	\N	2026-04-07 21:28:42.92594+00
1974	2024-05-14	104	100000	bank	\N	\N	2026-04-07 21:28:42.927119+00
1975	2024-05-15	104	100000	bank	\N	\N	2026-04-07 21:28:42.928575+00
1976	2024-05-18	104	50000	bank	\N	\N	2026-04-07 21:28:42.92988+00
1977	2024-05-21	104	50000	bank	\N	\N	2026-04-07 21:28:42.931028+00
1978	2024-05-22	104	50000	bank	\N	\N	2026-04-07 21:28:42.93241+00
1979	2024-05-22	104	30000	bank	\N	\N	2026-04-07 21:28:42.933256+00
1980	2024-05-28	104	50000	bank	\N	\N	2026-04-07 21:28:42.93458+00
1981	2024-06-01	104	100000	bank	\N	\N	2026-04-07 21:28:42.935667+00
1982	2024-06-16	104	200000	bank	\N	\N	2026-04-07 21:28:42.936914+00
1983	2024-06-24	104	100000	bank	\N	\N	2026-04-07 21:28:42.938069+00
1984	2024-06-27	104	100000	bank	\N	\N	2026-04-07 21:28:42.938984+00
1985	2024-07-01	104	100000	bank	\N	\N	2026-04-07 21:28:42.940121+00
1986	2024-07-03	104	100000	bank	\N	\N	2026-04-07 21:28:42.941289+00
1987	2024-07-05	104	50000	bank	\N	\N	2026-04-07 21:28:42.942136+00
1988	2024-08-31	104	80000	bank	\N	\N	2026-04-07 21:28:42.942932+00
1989	2024-10-18	104	50000	bank	\N	\N	2026-04-07 21:28:42.944128+00
1990	2024-12-09	104	30000	bank	\N	\N	2026-04-07 21:28:42.945239+00
1991	2025-08-27	104	40000	bank	\N	\N	2026-04-07 21:28:42.946069+00
1992	2025-09-27	104	25000	bank	\N	\N	2026-04-07 21:28:42.947205+00
1994	2025-04-01	18	30000	cash	\N	\N	2026-04-07 21:28:42.949392+00
1995	2025-06-18	18	100000	cash	\N	\N	2026-04-07 21:28:42.950398+00
1996	2025-06-21	18	62000	cash	\N	\N	2026-04-07 21:28:42.951578+00
1997	2025-07-04	18	38000	bank	\N	\N	2026-04-07 21:28:42.952779+00
1998	2025-07-10	18	62000	bank	\N	\N	2026-04-07 21:28:42.95388+00
1999	2025-08-08	18	20000	bank	\N	\N	2026-04-07 21:28:42.955025+00
2000	2025-08-08	18	20000	bank	\N	\N	2026-04-07 21:28:42.956068+00
2002	2025-12-01	18	40000	bank	\N	\N	2026-04-07 21:28:42.95833+00
2003	2025-12-01	18	10000	cash	\N	paid to kamlesh	2026-04-07 21:28:42.959457+00
2012	2025-04-08	136	80000	cash	\N	ok	2026-04-07 21:28:42.970744+00
2019	2025-04-12	136	4388	cash	\N	ok	2026-04-07 21:28:42.978666+00
2027	2025-04-16	136	100000	bank	\N	\N	2026-04-07 21:28:42.988138+00
2030	2025-04-21	136	150000	bank	\N	\N	2026-04-07 21:28:42.991135+00
2031	2025-04-23	136	10000	cash	\N	ok	2026-04-07 21:28:42.992312+00
2032	2025-04-24	136	75000	cash	\N	ok	2026-04-07 21:28:42.993475+00
2033	2025-05-09	136	50000	bank	\N	\N	2026-04-07 21:28:42.994566+00
2034	2025-05-09	136	100000	bank	\N	\N	2026-04-07 21:28:42.995767+00
2035	2025-05-09	136	90000	bank	\N	\N	2026-04-07 21:28:42.996895+00
2036	2025-05-20	136	48672	bank	\N	\N	2026-04-07 21:28:42.99811+00
2037	2025-05-27	136	50000	bank	\N	\N	2026-04-07 21:28:42.999294+00
2038	2025-05-29	136	15000	cash	\N	\N	2026-04-07 21:28:43.000307+00
2039	2025-05-29	136	35000	bank	\N	\N	2026-04-07 21:28:43.001505+00
2040	2025-05-29	136	30000	bank	\N	\N	2026-04-07 21:28:43.002761+00
2041	2025-05-30	136	70000	bank	\N	\N	2026-04-07 21:28:43.004291+00
2042	2025-05-30	136	5000	cash	\N	\N	2026-04-07 21:28:43.005408+00
2043	2025-05-31	136	48000	cash	\N	\N	2026-04-07 21:28:43.006557+00
2044	2025-05-31	136	35000	cash	\N	\N	2026-04-07 21:28:43.007798+00
2048	2025-06-13	136	80000	cash	\N	ok	2026-04-07 21:28:43.012257+00
2051	2025-06-18	136	320000	cash	\N	ok	2026-04-07 21:28:43.015619+00
2053	2025-06-19	136	30000	cash	\N	ok	2026-04-07 21:28:43.017997+00
2056	2025-06-25	136	15000	cash	\N	ok	2026-04-07 21:28:43.02161+00
2057	2025-06-25	136	265000	cash	\N	\N	2026-04-07 21:28:43.022646+00
2061	2025-06-30	136	100000	cash	\N	ok	2026-04-07 21:28:43.027393+00
2063	2025-07-02	136	40000	cash	\N	ok	2026-04-07 21:28:43.029527+00
2065	2025-07-03	136	50000	cash	\N	ok	2026-04-07 21:28:43.031854+00
2066	2025-07-03	136	10000	cash	\N	ok	2026-04-07 21:28:43.032885+00
2067	2025-07-03	136	50000	cash	\N	ok	2026-04-07 21:28:43.033993+00
2068	2025-07-04	136	45000	cash	\N	ok	2026-04-07 21:28:43.035312+00
2069	2025-07-04	136	15000	cash	\N	ok	2026-04-07 21:28:43.036505+00
2071	2025-07-05	136	40000	cash	\N	ok	2026-04-07 21:28:43.039384+00
2074	2025-07-08	136	25000	cash	\N	\N	2026-04-07 21:28:43.043502+00
2077	2025-07-09	136	3500	cash	\N	ok	2026-04-07 21:28:43.046849+00
2078	2025-07-10	136	40000	cash	\N	ok	2026-04-07 21:28:43.048654+00
2079	2025-07-10	136	30000	cash	\N	ok	2026-04-07 21:28:43.049592+00
2080	2025-07-10	136	38000	cash	\N	ok	2026-04-07 21:28:43.05068+00
2081	2025-07-13	136	40000	cash	\N	\N	2026-04-07 21:28:43.051992+00
2082	2025-07-14	136	45000	cash	\N	ok	2026-04-07 21:28:43.053097+00
2005	2025-04-01	136	120000	bank	OK	Ok	2026-04-07 21:28:42.963043+00
2006	2025-04-03	136	400000	bank	OK	Ok	2026-04-07 21:28:42.964085+00
1993	2025-12-14	104	25000	bank	\N	SHREE KHATU | Sender: SHREE KHATU	2026-04-07 21:28:42.948085+00
2001	2025-09-11	18	25000	bank	\N	PAWAN KUMAR | Sender: PAWAN KUMAR	2026-04-07 21:28:42.957193+00
2004	2026-02-10	18	26000	bank	\N	arpita | Sender: arpita	2026-04-07 21:28:42.960188+00
2084	2025-07-15	136	30000	cash	\N	ok	2026-04-07 21:28:43.055422+00
2086	2025-07-18	136	5000	cash	\N	\N	2026-04-07 21:28:43.057564+00
2088	2025-07-19	136	100000	bank	\N	\N	2026-04-07 21:28:43.059772+00
2095	2025-07-22	136	20000	cash	\N	ok	2026-04-07 21:28:43.067346+00
2096	2025-07-22	136	20000	cash	\N	ok	2026-04-07 21:28:43.068558+00
2097	2025-07-22	136	30000	cash	\N	ok	2026-04-07 21:28:43.069756+00
2098	2025-07-23	136	42000	cash	\N	ok	2026-04-07 21:28:43.070912+00
2103	2025-07-26	136	25000	cash	\N	\N	2026-04-07 21:28:43.076065+00
2107	2025-07-29	136	62000	cash	\N	ok	2026-04-07 21:28:43.079842+00
2108	2025-07-29	136	42000	cash	\N	ok	2026-04-07 21:28:43.080675+00
2109	2025-07-30	136	20000	cash	\N	ok	2026-04-07 21:28:43.081648+00
2110	2025-07-30	136	20000	cash	\N	\N	2026-04-07 21:28:43.082447+00
2112	2025-07-31	136	40000	cash	\N	\N	2026-04-07 21:28:43.084747+00
2113	2025-07-31	136	76700	cash	\N	\N	2026-04-07 21:28:43.086007+00
2114	2025-08-04	136	2450	cash	\N	\N	2026-04-07 21:28:43.087117+00
2118	2025-08-05	136	50000	cash	\N	ok	2026-04-07 21:28:43.091166+00
2121	2025-08-08	136	54000	cash	\N	ok	2026-04-07 21:28:43.094586+00
2125	2025-08-15	136	31160	cash	\N	Tansen Freight	2026-04-07 21:28:43.099324+00
2126	2025-08-17	136	50000	bank	\N	\N	2026-04-07 21:28:43.10042+00
2127	2025-08-18	136	100000	bank	\N	\N	2026-04-07 21:28:43.1016+00
2128	2025-08-18	136	95000	bank	\N	\N	2026-04-07 21:28:43.10281+00
2129	2025-08-19	136	15400	bank	\N	\N	2026-04-07 21:28:43.103969+00
2130	2025-08-20	136	75000	bank	\N	\N	2026-04-07 21:28:43.105181+00
2131	2025-08-20	136	30000	bank	\N	\N	2026-04-07 21:28:43.106093+00
2132	2025-08-21	136	52000	bank	\N	\N	2026-04-07 21:28:43.107196+00
2133	2025-08-23	136	95000	bank	\N	\N	2026-04-07 21:28:43.108305+00
2134	2025-08-23	136	33000	bank	\N	\N	2026-04-07 21:28:43.109421+00
2135	2025-08-26	136	44000	bank	\N	\N	2026-04-07 21:28:43.110534+00
2136	2025-08-28	136	180000	bank	\N	\N	2026-04-07 21:28:43.111344+00
2137	2025-08-29	136	50000	bank	\N	\N	2026-04-07 21:28:43.112443+00
2138	2025-08-29	136	20000	bank	\N	\N	2026-04-07 21:28:43.113689+00
2139	2025-08-29	136	60000	bank	\N	\N	2026-04-07 21:28:43.114872+00
2140	2025-08-31	136	20000	bank	\N	\N	2026-04-07 21:28:43.115893+00
2141	2025-09-02	136	100000	bank	\N	\N	2026-04-07 21:28:43.117007+00
2142	2025-09-03	136	100000	bank	\N	\N	2026-04-07 21:28:43.118163+00
2143	2025-09-04	136	95000	bank	\N	\N	2026-04-07 21:28:43.119382+00
2144	2025-09-04	136	100000	bank	\N	\N	2026-04-07 21:28:43.120587+00
2145	2025-09-05	136	43000	bank	\N	\N	2026-04-07 21:28:43.121601+00
2146	2025-09-05	136	60000	bank	\N	\N	2026-04-07 21:28:43.122748+00
2156	2025-09-21	136	54600	cash	\N	YADAV FUELS	2026-04-07 21:28:43.13139+00
2160	2025-09-25	136	40000	cash	\N	YADAV FUELS	2026-04-07 21:28:43.135594+00
2165	2025-10-02	136	54600	cash	\N	YADAV FUELS	2026-04-07 21:28:43.140679+00
2169	2025-10-08	136	10000	cash	\N	YADAV FUELS	2026-04-07 21:28:43.144758+00
2172	2025-10-14	136	50000	bank	\N	\N	2026-04-07 21:28:43.14809+00
2176	2025-11-15	136	12000	cash	\N	PAID TO AAC TRANSPORT	2026-04-07 21:28:43.152224+00
2179	2025-12-15	136	50000	cash	\N	PAID TO RAKESH	2026-04-07 21:28:43.155611+00
2124	2025-08-14	136	35000	bank	\N	Vikash | Sender: Vikash	2026-04-07 21:28:43.098235+00
2147	2025-09-08	136	22000	bank	\N	Anurag Singh | Sender: Anurag Singh	2026-04-07 21:28:43.123989+00
2148	2025-09-12	136	20000	bank	\N	Anurag Singh | Sender: Anurag Singh	2026-04-07 21:28:43.124857+00
2149	2025-09-15	136	200000	bank	\N	/Restaurant Expenses | Sender: /Restaurant Expenses	2026-04-07 21:28:43.125585+00
2150	2025-09-15	136	50000	bank	\N	SCHOOL FEE | Sender: SCHOOL FEE	2026-04-07 21:28:43.126294+00
2151	2025-09-15	136	105000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.12719+00
2152	2025-09-16	136	50000	bank	\N	VIKASH IND | Sender: VIKASH IND	2026-04-07 21:28:43.128123+00
2153	2025-09-16	136	50000	bank	\N	ANURAG SINGH | Sender: ANURAG SINGH	2026-04-07 21:28:43.129092+00
2154	2025-09-19	136	150000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.129843+00
2155	2025-09-19	136	60000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.130618+00
2157	2025-09-22	136	200000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.132213+00
2158	2025-09-24	136	100000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.133326+00
2159	2025-09-24	136	130000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.134446+00
2161	2025-09-25	136	50000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.13683+00
2162	2025-09-25	136	20000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.13789+00
2163	2025-09-27	136	170000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.138964+00
2164	2025-09-27	136	36000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.139992+00
2220	2026-03-16	136	25000	bank	\N	\N	2026-04-07 21:28:43.196561+00
2222	2026-03-19	136	35000	bank	\N	\N	2026-04-07 21:28:43.198567+00
2223	2026-03-21	136	250000	bank	\N	\N	2026-04-07 21:28:43.199647+00
2224	2026-03-25	136	200000	bank	\N	\N	2026-04-07 21:28:43.200405+00
2226	2026-04-02	136	5000	bank	\N	\N	2026-04-07 21:28:43.201949+00
2227	2026-04-04	136	10000	bank	\N	\N	2026-04-07 21:28:43.20282+00
2230	2025-08-13	100	80000	bank	\N	\N	2026-04-07 21:28:43.206403+00
2231	2025-08-14	100	20000	bank	\N	\N	2026-04-07 21:28:43.207358+00
2232	2025-08-23	100	29400	cash	\N	TANSEN FREIGHT	2026-04-07 21:28:43.208116+00
2233	2025-08-24	100	62800	bank	\N	\N	2026-04-07 21:28:43.208827+00
2242	1900-05-29	139	51200	bank	\N	\N	2026-04-07 21:28:43.220149+00
2243	1901-11-30	139	205200	bank	\N	\N	2026-04-07 21:28:43.221397+00
2244	2025-10-07	39	78000	cash	\N	\N	2026-04-07 21:28:43.222822+00
2248	2025-11-05	39	183400	bank	\N	\N	2026-04-07 21:28:43.22705+00
2249	2025-12-06	39	334000	bank	\N	\N	2026-04-07 21:28:43.228325+00
2250	2025-12-19	39	148800	bank	\N	\N	2026-04-07 21:28:43.229428+00
2251	2025-12-29	39	131000	bank	\N	\N	2026-04-07 21:28:43.230278+00
2252	2026-01-01	39	342400	bank	\N	\N	2026-04-07 21:28:43.231179+00
2253	2026-01-28	39	413000	bank	\N	\N	2026-04-07 21:28:43.232249+00
2254	2026-01-28	39	383500	bank	\N	\N	2026-04-07 21:28:43.233445+00
2255	2026-01-28	39	155900	bank	\N	\N	2026-04-07 21:28:43.234321+00
2256	2026-01-30	39	162000	bank	\N	\N	2026-04-07 21:28:43.235598+00
2262	2026-03-11	39	246360	bank	\N	\N	2026-04-07 21:28:43.241533+00
2263	2026-03-17	39	131500	bank	ARMTECH	\N	2026-04-07 21:28:43.242549+00
2264	2026-03-23	39	52600	bank	ARMTECH	\N	2026-04-07 21:28:43.243712+00
2272	2025-12-17	177	35000	bank	\N	\N	2026-04-07 21:28:43.253766+00
2273	2025-12-17	177	35000	bank	\N	\N	2026-04-07 21:28:43.254896+00
2275	2026-01-19	177	30000	bank	\N	\N	2026-04-07 21:28:43.256782+00
2278	2026-03-07	177	50000	bank	\N	\N	2026-04-07 21:28:43.259535+00
2192	2026-01-20	136	98000	cash	\N	cash deposit	2026-04-07 21:28:43.166627+00
2186	2025-12-29	136	27000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.161295+00
2187	2025-12-29	136	500	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.162399+00
2188	2025-12-30	136	30000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.163229+00
2189	2026-01-06	136	231000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.163932+00
2190	2026-01-07	136	4200	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.164763+00
2294	2025-10-09	79	7875	bank	\N	\N	2026-04-07 21:28:43.276122+00
2297	2025-11-09	113	41250	cash	\N	\N	2026-04-07 21:28:43.279184+00
2298	2025-10-15	119	48000	cash	\N	CASH RECEIVED BY KAMLESH	2026-04-07 21:28:43.280102+00
2299	2025-11-26	119	7500	bank	\N	\N	2026-04-07 21:28:43.281229+00
2300	2025-12-08	119	2000	bank	\N	\N	2026-04-07 21:28:43.282254+00
2301	2025-12-08	119	5500	bank	\N	\N	2026-04-07 21:28:43.283447+00
2302	2025-12-09	119	7500	bank	\N	\N	2026-04-07 21:28:43.284502+00
2303	2025-12-11	119	7500	bank	\N	\N	2026-04-07 21:28:43.285336+00
2304	2025-10-15	114	34000	cash	\N	paid to jawed alam	2026-04-07 21:28:43.28669+00
2305	2025-10-15	114	34000	cash	\N	paid to jawed alam	2026-04-07 21:28:43.287787+00
2310	2025-10-29	49	30000	bank	BOB	\N	2026-04-07 21:28:43.292814+00
2311	2025-10-30	49	20000	bank	BOB	\N	2026-04-07 21:28:43.293964+00
2314	2025-12-13	49	20000	bank	BOB	\N	2026-04-07 21:28:43.297613+00
2316	2025-12-30	49	100000	bank	AXIS	\N	2026-04-07 21:28:43.29987+00
2319	2026-01-16	49	50000	bank	AXIS	\N	2026-04-07 21:28:43.302962+00
2340	2025-11-18	66	20500	bank	\N	\N	2026-04-07 21:28:43.326825+00
2341	2025-11-27	66	20000	bank	\N	\N	2026-04-07 21:28:43.327846+00
2343	2025-10-28	56	20000	cash	\N	received by akash	2026-04-07 21:28:43.32986+00
2346	2025-11-20	56	40000	cash	\N	cash received	2026-04-07 21:28:43.332744+00
2349	2026-01-25	89	20250	cash	\N	cash received	2026-04-07 21:28:43.335822+00
2362	1900-10-26	78	280	bank	\N	\N	2026-04-07 21:28:43.351609+00
2363	1900-10-26	78	235200	cash	\N	\N	2026-04-07 21:28:43.352643+00
2368	2025-12-06	26	50000	bank	BOB	\N	2026-04-07 21:28:43.358395+00
2369	2025-12-07	26	35000	bank	BOB	\N	2026-04-07 21:28:43.359276+00
2370	2025-12-07	26	1000	bank	BOB	\N	2026-04-07 21:28:43.360446+00
2371	2025-12-12	122	159600	bank	\N	\N	2026-04-07 21:28:43.361773+00
2372	2026-01-31	122	200000	bank	\N	\N	2026-04-07 21:28:43.362795+00
2373	2026-02-15	122	126200	bank	\N	\N	2026-04-07 21:28:43.363772+00
2331	2025-10-26	66	49999	bank	BOB	BOB NEW	2026-04-07 21:28:43.316394+00
2332	2025-10-26	66	1	bank	BOB	BOB NEW	2026-04-07 21:28:43.317603+00
2333	2025-10-28	66	50000	bank	BOB	BOB NEW	2026-04-07 21:28:43.318864+00
2334	2025-11-01	66	20300	bank	BOB	BOB NEW	2026-04-07 21:28:43.319965+00
2335	2025-11-01	66	38000	bank	BOB	BOB NEW	2026-04-07 21:28:43.321111+00
2374	2025-12-12	178	53000	bank	ARMTECH	\N	2026-04-07 21:28:43.366384+00
2313	2025-12-03	49	100000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.296704+00
2315	2025-12-17	49	65000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.298809+00
2317	2026-01-07	49	50000	bank	AXIS	\N	2026-04-07 21:28:43.300676+00
2318	2026-01-09	49	30000	bank	AXIS	\N	2026-04-07 21:28:43.301792+00
2320	2026-01-29	49	50000	bank	AXIS	\N	2026-04-07 21:28:43.303743+00
2364	2025-12-02	123	1000	bank	AXIS	\N	2026-04-07 21:28:43.354017+00
2348	2025-10-28	89	2500	cash	\N	CASH RECEIVED	2026-04-07 21:28:43.334777+00
2282	2025-10-07	132	84000	bank	\N	MK CEMENT | Sender: MK CEMENT	2026-04-07 21:28:43.264015+00
2283	2025-10-07	132	168000	bank	\N	SANGAM CEMENT ARTICLE | Sender: SANGAM CEMENT ARTICLE	2026-04-07 21:28:43.265024+00
2284	2025-10-16	132	112000	bank	\N	SANGAM CEMENT ARTICLE | Sender: SANGAM CEMENT ARTICLE	2026-04-07 21:28:43.265888+00
2285	2025-10-16	132	28000	bank	\N	SANGAM CEMENT WALL COMPANY | Sender: SANGAM CEMENT WALL COMPANY	2026-04-07 21:28:43.267825+00
2286	2025-10-16	132	56000	bank	\N	MK CEMENT | Sender: MK CEMENT	2026-04-07 21:28:43.26887+00
2287	2025-10-28	132	28000	bank	\N	SANGAM CEMENT ARTICLE | Sender: SANGAM CEMENT ARTICLE	2026-04-07 21:28:43.269956+00
2288	2025-11-13	132	140000	bank	\N	M S SANGAM CEMENT ARTICLE | Sender: M S SANGAM CEMENT ARTICLE	2026-04-07 21:28:43.271094+00
2289	2025-12-12	132	100000	bank	\N	M S SANGAM CEMENT ARTICLE | Sender: M S SANGAM CEMENT ARTICLE	2026-04-07 21:28:43.272173+00
2290	2025-12-16	132	80880	bank	\N	M S SANGAM CEMENT ARTICLE | Sender: M S SANGAM CEMENT ARTICLE	2026-04-07 21:28:43.272908+00
2295	2025-10-16	113	100	bank	\N	KRISHNA TR | Sender: KRISHNA TR	2026-04-07 21:28:43.277006+00
2377	2026-01-27	178	4876.1	bank	AXIS	\N	2026-04-07 21:28:43.370014+00
2379	2025-12-15	48	52400	cash	\N	\N	2026-04-07 21:28:43.372379+00
2380	2026-01-04	48	1000	bank	BOB	\N	2026-04-07 21:28:43.37335+00
2381	2026-01-04	48	50000	bank	BOB	\N	2026-04-07 21:28:43.374274+00
2383	2026-02-14	48	32000	cash	\N	\N	2026-04-07 21:28:43.376484+00
2386	2025-12-19	47	75000	bank	HDFC	\N	2026-04-07 21:28:43.379723+00
2387	2025-12-19	47	20000	bank	HDFC	\N	2026-04-07 21:28:43.380897+00
2388	2025-12-24	47	50000	bank	HDFC	\N	2026-04-07 21:28:43.381779+00
2389	2025-12-29	47	1500	cash	\N	\N	2026-04-07 21:28:43.382937+00
2390	2025-12-29	47	6500	cash	\N	\N	2026-04-07 21:28:43.383997+00
2392	2025-12-22	38	212000	bank	ARMTECH	\N	2026-04-07 21:28:43.386613+00
2393	2026-01-03	38	199800	bank	ARMTECH	\N	2026-04-07 21:28:43.387762+00
2394	2025-12-23	85	29500	bank	\N	\N	2026-04-07 21:28:43.389076+00
2395	2025-12-27	179	106000	bank	ARMTECH	\N	2026-04-07 21:28:43.391433+00
2396	2025-12-27	179	53000	bank	BOB	\N	2026-04-07 21:28:43.392667+00
2397	2025-12-26	180	30000	cash	\N	\N	2026-04-07 21:28:43.395185+00
2398	2025-12-30	181	300000	bank	AXIS	\N	2026-04-07 21:28:43.397286+00
2399	2026-01-28	181	4876.1	bank	AXIS	\N	2026-04-07 21:28:43.398423+00
2400	2026-01-28	181	68968.32	bank	AXIS	\N	2026-04-07 21:28:43.399672+00
2401	2026-02-19	181	300000	bank	AXIS	\N	2026-04-07 21:28:43.400661+00
2402	2026-03-14	181	339437	bank	AXIS	\N	2026-04-07 21:28:43.402136+00
2403	2026-04-06	181	500000	bank	AXIS	\N	2026-04-07 21:28:43.403527+00
2404	2026-01-06	20	117200	cash	\N	\N	2026-04-07 21:28:43.404955+00
2405	2025-12-30	126	200000	bank	BOB	\N	2026-04-07 21:28:43.40633+00
2406	2026-01-12	126	20000	bank	BOB	\N	2026-04-07 21:28:43.407348+00
2407	2026-03-22	126	200000	bank	BOB	\N	2026-04-07 21:28:43.408481+00
2408	2026-02-03	126	5500	bank	BOB	\N	2026-04-07 21:28:43.409566+00
2409	2026-01-10	182	25000	bank	\N	\N	2026-04-07 21:28:43.411921+00
2410	2026-01-11	182	85000	bank	\N	\N	2026-04-07 21:28:43.412731+00
2411	2026-01-12	182	65000	bank	\N	\N	2026-04-07 21:28:43.413898+00
2412	2026-01-25	182	166400	bank	\N	\N	2026-04-07 21:28:43.415136+00
2413	2026-01-27	182	200000	bank	\N	\N	2026-04-07 21:28:43.416159+00
2414	2026-01-31	182	100000	bank	\N	\N	2026-04-07 21:28:43.417285+00
2415	2026-02-07	182	45000	bank	\N	\N	2026-04-07 21:28:43.418463+00
2416	2026-02-19	182	42500	bank	\N	\N	2026-04-07 21:28:43.419704+00
2417	2026-02-20	182	100000	bank	\N	\N	2026-04-07 21:28:43.420865+00
2418	2026-02-21	182	217000	bank	\N	\N	2026-04-07 21:28:43.421821+00
2419	2026-02-23	182	50000	bank	\N	\N	2026-04-07 21:28:43.422642+00
2420	2026-02-28	182	193900	bank	\N	\N	2026-04-07 21:28:43.423799+00
2421	2026-03-12	182	132100	bank	\N	\N	2026-04-07 21:28:43.424556+00
2422	2026-03-19	182	223200	bank	\N	\N	2026-04-07 21:28:43.42535+00
2423	2026-04-06	182	183200	bank	\N	\N	2026-04-07 21:28:43.426469+00
2424	2026-01-13	92	100000	bank	\N	\N	2026-04-07 21:28:43.427403+00
2425	2026-01-21	92	81040	bank	\N	\N	2026-04-07 21:28:43.428402+00
2426	2026-01-22	92	190800	bank	\N	\N	2026-04-07 21:28:43.429576+00
2427	2026-03-19	92	30000	bank	\N	\N	2026-04-07 21:28:43.430433+00
2428	2026-03-20	92	30000	bank	\N	\N	2026-04-07 21:28:43.431543+00
2429	2026-03-28	92	25000	bank	\N	\N	2026-04-07 21:28:43.432709+00
2430	2026-01-13	22	30000	bank	\N	\N	2026-04-07 21:28:43.433996+00
2431	2026-01-15	22	63000	bank	\N	\N	2026-04-07 21:28:43.43508+00
2432	2026-01-18	22	60000	bank	\N	\N	2026-04-07 21:28:43.436293+00
2434	2026-02-17	117	150000	bank	\N	\N	2026-04-07 21:28:43.43866+00
2435	2026-03-12	117	200000	bank	\N	\N	2026-04-07 21:28:43.439708+00
2436	2026-01-18	5	180000	cash	\N	\N	2026-04-07 21:28:43.441014+00
2437	2026-01-18	5	99000	bank	\N	\N	2026-04-07 21:28:43.441949+00
2438	2026-01-28	5	50000	bank	\N	\N	2026-04-07 21:28:43.442899+00
2439	2026-01-28	5	40000	bank	\N	\N	2026-04-07 21:28:43.444035+00
2440	2026-01-29	5	24670	bank	\N	\N	2026-04-07 21:28:43.445216+00
2441	2026-01-29	5	25000	bank	\N	\N	2026-04-07 21:28:43.44628+00
2442	2026-01-29	5	50330	bank	\N	\N	2026-04-07 21:28:43.447321+00
2443	2026-01-31	5	200000	cash	\N	\N	2026-04-07 21:28:43.448131+00
2444	2026-01-31	5	100000	bank	\N	\N	2026-04-07 21:28:43.449351+00
2445	2026-02-09	5	75000	bank	\N	\N	2026-04-07 21:28:43.450404+00
2446	2026-02-08	5	500000	bank	\N	\N	2026-04-07 21:28:43.451545+00
2447	2026-02-11	5	500000	bank	\N	\N	2026-04-07 21:28:43.452873+00
2448	2026-02-18	5	500000	cash	\N	\N	2026-04-07 21:28:43.453964+00
2449	2026-03-19	5	500000	bank	\N	\N	2026-04-07 21:28:43.455378+00
2450	2026-03-24	5	500000	bank	\N	\N	2026-04-07 21:28:43.456545+00
2451	2026-03-24	5	98000	bank	\N	\N	2026-04-07 21:28:43.457962+00
2452	2026-03-24	5	2000	bank	\N	\N	2026-04-07 21:28:43.459315+00
2453	2026-03-28	5	600000	bank	\N	\N	2026-04-07 21:28:43.46044+00
2454	2026-03-29	5	250000	bank	\N	\N	2026-04-07 21:28:43.461567+00
2455	2026-04-04	5	500000	bank	\N	\N	2026-04-07 21:28:43.46275+00
2456	2026-04-05	5	350000	bank	\N	\N	2026-04-07 21:28:43.463915+00
2457	2026-02-08	5	500000	bank	\N	\N	2026-04-07 21:28:43.464718+00
2458	2026-02-11	5	500000	bank	\N	\N	2026-04-07 21:28:43.465925+00
2459	2026-02-18	5	500000	cash	\N	\N	2026-04-07 21:28:43.467009+00
2460	2026-01-19	183	50000	bank	\N	\N	2026-04-07 21:28:43.470249+00
2461	2026-01-22	183	30000	bank	\N	\N	2026-04-07 21:28:43.471443+00
2462	2026-03-10	183	50000	bank	\N	\N	2026-04-07 21:28:43.472516+00
2463	2026-02-09	69	189000	bank	\N	\N	2026-04-07 21:28:43.473752+00
2464	2026-02-21	69	196000	bank	\N	\N	2026-04-07 21:28:43.474725+00
2465	2026-02-27	69	199500	bank	\N	\N	2026-04-07 21:28:43.475527+00
2466	2026-02-27	69	203000	bank	\N	\N	2026-04-07 21:28:43.476651+00
2467	2026-02-27	69	205200	bank	\N	\N	2026-04-07 21:28:43.477738+00
2468	2026-03-20	69	166800	bank	\N	\N	2026-04-07 21:28:43.478555+00
2469	2026-03-31	69	235200	bank	\N	\N	2026-04-07 21:28:43.479737+00
2470	2026-01-27	93	1	bank	\N	\N	2026-04-07 21:28:43.481031+00
2471	2026-01-27	93	140000	bank	\N	\N	2026-04-07 21:28:43.481841+00
2472	2026-01-27	93	30000	bank	\N	\N	2026-04-07 21:28:43.482953+00
2473	2026-01-28	93	2000	bank	\N	\N	2026-04-07 21:28:43.483707+00
2474	2026-01-28	93	48000	bank	\N	\N	2026-04-07 21:28:43.484916+00
2475	2026-01-31	93	50500	bank	\N	\N	2026-04-07 21:28:43.486379+00
2476	2026-02-01	93	60000	bank	\N	\N	2026-04-07 21:28:43.487445+00
2477	2026-02-01	93	20000	bank	\N	\N	2026-04-07 21:28:43.488589+00
2478	2026-02-02	93	20000	bank	\N	\N	2026-04-07 21:28:43.489575+00
2479	2026-02-03	93	2000	bank	\N	\N	2026-04-07 21:28:43.490633+00
2480	2026-02-03	93	18000	bank	\N	\N	2026-04-07 21:28:43.491818+00
2481	2026-02-11	93	100000	bank	\N	\N	2026-04-07 21:28:43.492922+00
2482	2026-02-14	93	50000	bank	\N	\N	2026-04-07 21:28:43.493781+00
2483	2026-02-14	93	39000	bank	\N	\N	2026-04-07 21:28:43.494888+00
2484	2026-02-16	93	133000	bank	\N	\N	2026-04-07 21:28:43.496006+00
2485	2026-02-17	93	40000	bank	\N	\N	2026-04-07 21:28:43.497108+00
2486	2026-02-24	93	100000	bank	\N	\N	2026-04-07 21:28:43.498279+00
2487	2026-02-27	93	45220	bank	\N	\N	2026-04-07 21:28:43.499461+00
2488	2026-03-06	93	85000	bank	\N	\N	2026-04-07 21:28:43.500559+00
2489	2026-03-13	93	63500	bank	\N	\N	2026-04-07 21:28:43.501812+00
2490	2026-03-16	93	40500	bank	\N	\N	2026-04-07 21:28:43.502988+00
2375	2025-12-29	178	53000	bank	ARMTECH	\N	2026-04-07 21:28:43.367401+00
2378	2026-02-16	178	26500	bank	ARMTECH	\N	2026-04-07 21:28:43.371145+00
2391	2026-03-10	45	114500	bank	KOTAK	\N	2026-04-07 21:28:43.385337+00
2376	2026-01-24	178	25000	bank	AXIS	\N	2026-04-07 21:28:43.36875+00
2491	2026-03-16	93	25000	bank	\N	\N	2026-04-07 21:28:43.504098+00
2492	2026-03-25	93	50000	bank	\N	\N	2026-04-07 21:28:43.505245+00
2493	2026-01-28	82	178500	bank	\N	\N	2026-04-07 21:28:43.506523+00
2494	2026-03-11	82	182000	bank	\N	\N	2026-04-07 21:28:43.507521+00
2495	2026-01-27	25	100000	bank	\N	\N	2026-04-07 21:28:43.508364+00
2496	2026-01-31	25	80000	bank	\N	\N	2026-04-07 21:28:43.509388+00
2497	1900-09-11	96	182000	bank	\N	\N	2026-04-07 21:28:43.510528+00
2498	2025-12-23	80	29500	bank	\N	\N	2026-04-07 21:28:43.511725+00
2499	2026-01-19	80	30000	bank	\N	\N	2026-04-07 21:28:43.512938+00
2500	2026-01-19	80	31000	bank	\N	\N	2026-04-07 21:28:43.514012+00
2501	2026-03-12	80	44250	bank	\N	\N	2026-04-07 21:28:43.515229+00
2502	2026-02-02	77	50000	bank	\N	\N	2026-04-07 21:28:43.51652+00
2503	2026-02-02	77	100000	bank	\N	\N	2026-04-07 21:28:43.517406+00
2504	2026-02-07	77	52200	bank	\N	\N	2026-04-07 21:28:43.518385+00
2505	2026-03-18	77	15000	bank	\N	\N	2026-04-07 21:28:43.519624+00
2506	2026-03-19	77	19000	bank	\N	\N	2026-04-07 21:28:43.520774+00
2507	2026-03-31	77	25000	bank	\N	\N	2026-04-07 21:28:43.521851+00
2508	2026-03-17	40	516000	bank	\N	\N	2026-04-07 21:28:43.522922+00
2509	2026-03-25	40	600000	bank	\N	\N	2026-04-07 21:28:43.523828+00
2510	2026-04-06	40	1.089512e+06	bank	\N	\N	2026-04-07 21:28:43.52473+00
2511	2026-02-13	40	208000	bank	\N	\N	2026-04-07 21:28:43.525696+00
2512	2026-02-21	40	1.14077e+06	bank	\N	\N	2026-04-07 21:28:43.526438+00
2513	2026-02-24	40	489360	bank	\N	\N	2026-04-07 21:28:43.527168+00
2514	2026-02-27	40	300000	bank	\N	\N	2026-04-07 21:28:43.527925+00
2515	2026-02-28	40	156000	bank	\N	\N	2026-04-07 21:28:43.528573+00
2516	2026-03-27	40	1.5e+06	bank	\N	\N	2026-04-07 21:28:43.529389+00
2517	2026-03-30	40	508656	bank	\N	\N	2026-04-07 21:28:43.530102+00
2519	2026-02-11	41	2000	bank	\N	\N	2026-04-07 21:28:43.532062+00
2520	2026-02-11	41	50000	bank	\N	\N	2026-04-07 21:28:43.533139+00
2521	2026-02-11	41	20000	bank	\N	\N	2026-04-07 21:28:43.533902+00
2522	2026-02-11	41	30000	bank	\N	\N	2026-04-07 21:28:43.53467+00
2523	2026-02-11	41	25000	bank	\N	\N	2026-04-07 21:28:43.535619+00
2524	2026-02-12	41	23000	bank	\N	\N	2026-04-07 21:28:43.53681+00
2525	2026-02-13	41	50000	bank	\N	\N	2026-04-07 21:28:43.537871+00
2526	2026-02-14	41	80000	bank	\N	\N	2026-04-07 21:28:43.5388+00
2527	2026-02-17	41	33000	bank	\N	\N	2026-04-07 21:28:43.539844+00
2528	2026-02-19	41	12000	bank	\N	\N	2026-04-07 21:28:43.540601+00
2530	2026-03-05	41	80000	bank	\N	\N	2026-04-07 21:28:43.542225+00
2532	2026-03-19	41	50000	bank	\N	\N	2026-04-07 21:28:43.544427+00
2533	2026-01-30	148	139500	bank	\N	\N	2026-04-07 21:28:43.545313+00
2534	2026-02-19	55	192500	bank	\N	\N	2026-04-07 21:28:43.546419+00
2535	2026-02-21	76	370500	bank	\N	\N	2026-04-07 21:28:43.547532+00
2536	2026-03-13	76	205200	bank	\N	\N	2026-04-07 21:28:43.548636+00
2537	2026-03-17	76	276000	bank	\N	\N	2026-04-07 21:28:43.549788+00
2538	2026-03-24	76	369600	bank	\N	\N	2026-04-07 21:28:43.550869+00
2539	2026-02-21	6	27500	bank	\N	\N	2026-04-07 21:28:43.551761+00
2540	2026-02-22	6	27000	bank	\N	\N	2026-04-07 21:28:43.553067+00
2541	2026-03-16	6	27000	cash	\N	\N	2026-04-07 21:28:43.55409+00
2542	2026-03-18	6	185500	bank	\N	\N	2026-04-07 21:28:43.555195+00
2543	2026-03-19	6	14100	bank	\N	\N	2026-04-07 21:28:43.55626+00
2544	2026-02-15	90	35000	bank	\N	\N	2026-04-07 21:28:43.557767+00
2545	2026-02-23	90	1000	bank	\N	\N	2026-04-07 21:28:43.559064+00
2546	2026-02-25	90	30000	bank	\N	\N	2026-04-07 21:28:43.560666+00
2547	2026-02-26	23	183600	bank	ARMTECH	SHREE ANNAPURNA INDUSTRIES	2026-04-07 21:28:43.562269+00
2549	2026-03-16	83	27000	cash	\N	CASH RECEIVED	2026-04-07 21:28:43.564009+00
2552	2026-03-16	184	27500	cash	\N	CASH RECEIVED	2026-04-07 21:28:43.568148+00
2553	2026-01-23	121	29500	bank	BOB	\N	2026-04-07 21:28:43.569665+00
2554	2026-02-02	121	28000	bank	BOB	\N	2026-04-07 21:28:43.570774+00
2555	2026-02-26	121	14000	bank	BOB	\N	2026-04-07 21:28:43.571822+00
2556	2026-03-12	121	28600	bank	BOB	\N	2026-04-07 21:28:43.572858+00
2558	2026-03-16	94	62500	bank	BOB	\N	2026-04-07 21:28:43.574532+00
2559	2026-03-16	94	100000	bank	BOB	\N	2026-04-07 21:28:43.575561+00
2560	2026-03-23	32	56000	bank	ARMTECH	SWASTIK INFRA	2026-04-07 21:28:43.576437+00
2563	2026-03-28	120	40000	bank	BOB	\N	2026-04-07 21:28:43.579394+00
2564	2026-03-25	185	1	bank	BOB	\N	2026-04-07 21:28:43.581583+00
2565	2026-03-25	185	30000	bank	BOB	\N	2026-04-07 21:28:43.582672+00
2566	2026-03-26	185	500	bank	BOB	\N	2026-04-07 21:28:43.583404+00
2567	2026-03-26	185	2700	bank	BOB	\N	2026-04-07 21:28:43.584164+00
2568	2026-03-26	185	7300	cash	\N	CASH RECEIVED	2026-04-07 21:28:43.585019+00
2569	2026-03-28	185	27000	cash	\N	CASH RECEIVED	2026-04-07 21:28:43.586272+00
2570	2026-03-29	185	25500	cash	\N	CASH RECEIVED	2026-04-07 21:28:43.587398+00
2572	2026-04-08	205	220	cash	\N	\N	2026-04-08 05:24:51.061279+00
90	2025-12-02	165	154200	bank	BOB	\N	2026-04-07 21:28:40.703885+00
109	2026-01-17	165	90000	bank	BOB	\N	2026-04-07 21:28:40.725158+00
110	2026-01-18	165	90000	bank	BOB	\N	2026-04-07 21:28:40.726349+00
111	2026-01-19	165	17000	bank	BOB	\N	2026-04-07 21:28:40.727237+00
112	2026-01-20	165	30000	bank	BOB	\N	2026-04-07 21:28:40.728461+00
113	2026-01-22	165	45000	bank	BOB	\N	2026-04-07 21:28:40.729462+00
114	2026-01-23	165	25000	bank	BOB	\N	2026-04-07 21:28:40.730585+00
115	2026-01-23	165	10000	bank	BOB	\N	2026-04-07 21:28:40.731811+00
116	2026-01-31	165	30000	bank	BOB	\N	2026-04-07 21:28:40.732834+00
117	2026-02-05	165	20000	bank	BOB	\N	2026-04-07 21:28:40.734046+00
118	2026-02-05	165	30000	bank	BOB	\N	2026-04-07 21:28:40.735311+00
119	2026-02-06	165	50000	bank	BOB	\N	2026-04-07 21:28:40.736581+00
120	2026-02-09	165	50000	bank	BOB	\N	2026-04-07 21:28:40.737872+00
121	2026-02-09	165	30000	bank	BOB	\N	2026-04-07 21:28:40.738954+00
122	2026-02-11	165	20000	bank	BOB	\N	2026-04-07 21:28:40.740126+00
123	2026-02-18	165	205800	bank	BOB	\N	2026-04-07 21:28:40.741047+00
124	2026-02-20	165	40000	bank	BOB	\N	2026-04-07 21:28:40.74247+00
125	2026-02-22	165	11000	bank	BOB	\N	2026-04-07 21:28:40.743901+00
126	2026-02-23	165	10000	bank	BOB	\N	2026-04-07 21:28:40.745307+00
128	2026-02-27	165	50000	bank	BOB	\N	2026-04-07 21:28:40.747378+00
129	2026-02-27	165	40000	bank	BOB	\N	2026-04-07 21:28:40.74831+00
130	2026-02-28	165	30000	bank	BOB	\N	2026-04-07 21:28:40.749528+00
131	2026-03-10	165	10000	bank	BOB	\N	2026-04-07 21:28:40.750935+00
132	2026-03-11	165	20000	bank	BOB	\N	2026-04-07 21:28:40.752284+00
133	2026-03-13	165	6000	bank	BOB	\N	2026-04-07 21:28:40.753528+00
134	2026-03-13	165	4000	bank	BOB	\N	2026-04-07 21:28:40.754585+00
137	2026-03-19	165	210000	bank	BOB	\N	2026-04-07 21:28:40.757627+00
143	2026-04-01	165	80000	bank	BOB	\N	2026-04-07 21:28:40.764461+00
2548	2026-03-07	95	448000	bank	ARMTECH	SKYLINE CONSTRUCTIO	2026-04-07 21:28:43.563207+00
2561	2026-03-30	42	800	bank	KOTAK	B Y G INFRA	2026-04-07 21:28:43.577537+00
2562	2026-03-30	42	394000	bank	KOTAK	B Y G INFRA	2026-04-07 21:28:43.578555+00
2518	2026-02-08	41	50000	bank	\N	Sender: M S ENTERPRISES	2026-04-07 21:28:43.530979+00
2529	2026-02-23	41	128500	bank	\N	Sender: M S ENTERPRISES	2026-04-07 21:28:43.541417+00
2531	2026-03-13	41	192500	bank	\N	Sender: M S ENTERPRISES	2026-04-07 21:28:43.543331+00
144	2026-04-01	165	90000	bank	BOB	\N	2026-04-07 21:28:40.765659+00
145	2026-03-05	165	50000	bank	BOB	\N	2026-04-07 21:28:40.766786+00
146	2026-03-06	165	60000	bank	BOB	\N	2026-04-07 21:28:40.768107+00
169	2026-01-23	64	50000	bank	BOB	RKYENTERPRRISES	2026-04-07 21:28:40.796539+00
170	2026-01-24	64	50000	bank	BOB	RKYENTERPRRISES	2026-04-07 21:28:40.797651+00
171	2026-01-24	64	65000	bank	BOB	RKYENTERPRRISES	2026-04-07 21:28:40.79884+00
172	2026-01-28	64	60000	bank	BOB	RKYENTERPRRISES	2026-04-07 21:28:40.800227+00
173	2026-01-31	64	50000	bank	BOB	RKYENTERPRRISES	2026-04-07 21:28:40.801788+00
182	2025-11-04	125	80000	bank	BOB	\N	2026-04-07 21:28:40.812576+00
183	2025-11-04	125	10000	bank	BOB	\N	2026-04-07 21:28:40.813882+00
184	2025-11-06	125	90000	bank	BOB	\N	2026-04-07 21:28:40.815124+00
186	2025-11-13	125	90000	bank	BOB	\N	2026-04-07 21:28:40.81697+00
187	2025-11-13	125	1000	bank	BOB	\N	2026-04-07 21:28:40.818261+00
188	2025-11-19	125	50000	bank	BOB	\N	2026-04-07 21:28:40.819414+00
189	2025-11-19	125	45000	bank	BOB	\N	2026-04-07 21:28:40.820519+00
191	2025-12-01	125	80000	bank	BOB	\N	2026-04-07 21:28:40.822577+00
192	2025-12-05	125	98000	bank	BOB	\N	2026-04-07 21:28:40.823719+00
193	2025-12-10	125	89000	bank	BOB	\N	2026-04-07 21:28:40.824646+00
196	2025-12-26	125	95000	bank	BOB	\N	2026-04-07 21:28:40.827965+00
200	2026-01-09	125	94000	bank	BOB	\N	2026-04-07 21:28:40.832539+00
201	2026-01-14	125	96000	bank	BOB	\N	2026-04-07 21:28:40.833699+00
202	2026-01-15	125	80000	bank	BOB	\N	2026-04-07 21:28:40.834981+00
203	2026-01-17	125	90000	bank	BOB	\N	2026-04-07 21:28:40.836121+00
204	2026-01-19	125	80000	bank	BOB	\N	2026-04-07 21:28:40.837239+00
205	2026-01-21	125	50000	bank	BOB	\N	2026-04-07 21:28:40.83828+00
206	2026-01-22	125	90000	bank	BOB	\N	2026-04-07 21:28:40.839397+00
207	2026-01-24	125	89000	bank	BOB	\N	2026-04-07 21:28:40.840573+00
208	2026-01-27	125	90000	bank	BOB	\N	2026-04-07 21:28:40.841504+00
209	2026-01-30	125	79000	bank	BOB	\N	2026-04-07 21:28:40.842806+00
218	2026-02-07	125	90000	bank	BOB	\N	2026-04-07 21:28:40.853312+00
224	2026-02-08	125	90000	bank	BOB	\N	2026-04-07 21:28:40.860794+00
229	2026-02-12	125	91000	bank	BOB	\N	2026-04-07 21:28:40.86633+00
234	2026-02-18	125	95000	bank	BOB	\N	2026-04-07 21:28:40.872196+00
235	2026-02-20	125	90000	bank	BOB	\N	2026-04-07 21:28:40.873367+00
236	2026-02-25	125	91000	bank	BOB	\N	2026-04-07 21:28:40.874496+00
242	2026-02-28	125	94000	bank	BOB	\N	2026-04-07 21:28:40.880909+00
243	2026-02-14	125	92000	bank	BOB	\N	2026-04-07 21:28:40.882007+00
246	2026-03-12	125	49000	bank	BOB	\N	2026-04-07 21:28:40.885622+00
247	2026-03-13	125	98400	bank	BOB	\N	2026-04-07 21:28:40.886884+00
274	2025-11-01	17	2000	bank	BOB	\N	2026-04-07 21:28:40.917824+00
275	2025-11-01	17	13000	bank	BOB	\N	2026-04-07 21:28:40.919057+00
283	2025-11-09	17	2000	bank	BOB	\N	2026-04-07 21:28:40.92813+00
284	2025-11-09	17	48000	bank	BOB	\N	2026-04-07 21:28:40.929354+00
286	2025-11-10	17	30000	bank	BOB	\N	2026-04-07 21:28:40.931567+00
287	2025-11-10	17	1500	bank	BOB	\N	2026-04-07 21:28:40.93265+00
290	2025-11-10	17	52700	bank	BOB	\N	2026-04-07 21:28:40.93629+00
300	2025-11-25	17	50500	bank	BOB	\N	2026-04-07 21:28:40.94759+00
305	2025-12-02	17	20000	bank	BOB	manoj	2026-04-07 21:28:40.953725+00
306	2025-12-02	17	23000	bank	BOB	manoj	2026-04-07 21:28:40.954777+00
307	2025-12-05	17	50000	bank	BOB	manoj	2026-04-07 21:28:40.955765+00
308	2025-12-08	17	31000	bank	BOB	\N	2026-04-07 21:28:40.95695+00
331	2026-01-06	17	31500	bank	BOB	\N	2026-04-07 21:28:40.98384+00
332	2026-01-07	17	2000	bank	BOB	\N	2026-04-07 21:28:40.985332+00
333	2026-01-07	17	44600	bank	BOB	\N	2026-04-07 21:28:40.986601+00
334	2026-01-07	17	44600	bank	BOB	\N	2026-04-07 21:28:40.98777+00
335	2026-01-08	17	50000	bank	BOB	\N	2026-04-07 21:28:40.988892+00
336	2026-01-12	17	31500	bank	BOB	\N	2026-04-07 21:28:40.989956+00
342	2026-01-19	17	18900	bank	BOB	\N	2026-04-07 21:28:40.996635+00
346	2026-02-04	17	50000	bank	BOB	\N	2026-04-07 21:28:41.001563+00
349	2026-02-07	17	50000	bank	BOB	ASHUTOSH  CONSTRUCTION	2026-04-07 21:28:41.0052+00
350	2026-02-07	17	70000	bank	BOB	\N	2026-04-07 21:28:41.00633+00
351	2026-02-08	17	47500	bank	BOB	ASHUTOSH  CONSTRUCTION	2026-04-07 21:28:41.007393+00
354	2026-02-11	17	11000	bank	BOB	ratneshkumarmishra	2026-04-07 21:28:41.010834+00
357	2026-02-21	17	60000	bank	BOB	\N	2026-04-07 21:28:41.014293+00
358	2026-02-25	17	50000	bank	BOB	\N	2026-04-07 21:28:41.015595+00
361	2026-03-20	17	66000	bank	BOB	\N	2026-04-07 21:28:41.019643+00
868	2025-11-14	167	49000	bank	BOB	MASHITAL	2026-04-07 21:28:41.612085+00
869	2025-11-14	167	49000	bank	BOB	MASHITAL	2026-04-07 21:28:41.612801+00
878	2025-12-02	167	60900	bank	BOB	\N	2026-04-07 21:28:41.622082+00
887	2025-12-25	167	74200	bank	BOB	\N	2026-04-07 21:28:41.630469+00
893	2026-01-07	167	95200	bank	BOB	\N	2026-04-07 21:28:41.638238+00
894	2026-01-11	167	97000	bank	BOB	\N	2026-04-07 21:28:41.639106+00
1165	2025-11-20	16	37000	bank	BOB	bob	2026-04-07 21:28:41.988696+00
1522	2025-12-02	135	20000	bank	BOB	\N	2026-04-07 21:28:42.403148+00
1533	2026-03-09	135	57000	bank	BOB	\N	2026-04-07 21:28:42.414828+00
1535	2026-03-16	135	32000	bank	BOB	\N	2026-04-07 21:28:42.416373+00
1632	2025-10-27	15	1900	bank	BOB	\N	2026-04-07 21:28:42.525454+00
1633	2025-10-27	15	10000	bank	BOB	\N	2026-04-07 21:28:42.526662+00
1634	2025-10-27	15	10000	bank	BOB	\N	2026-04-07 21:28:42.527689+00
1644	2025-11-10	15	15000	bank	BOB	\N	2026-04-07 21:28:42.539535+00
1645	2025-11-12	15	30000	bank	BOB	\N	2026-04-07 21:28:42.54067+00
1648	2025-11-17	15	9000	bank	BOB	\N	2026-04-07 21:28:42.543399+00
1649	2025-11-17	15	150000	bank	BOB	ADARSH TRADING COMPANY	2026-04-07 21:28:42.544592+00
1658	2025-11-27	15	15000	bank	BOB	\N	2026-04-07 21:28:42.553982+00
1659	2025-11-28	15	124000	bank	BOB	ADARSH TRADING COMPANY	2026-04-07 21:28:42.555094+00
1664	2025-12-03	15	30000	bank	BOB	\N	2026-04-07 21:28:42.559933+00
1665	2025-12-03	15	5000	bank	BOB	\N	2026-04-07 21:28:42.561053+00
1667	2025-12-05	15	5000	bank	BOB	\N	2026-04-07 21:28:42.562956+00
1675	2025-12-15	15	50000	bank	BOB	\N	2026-04-07 21:28:42.571862+00
1678	2025-12-16	15	30000	bank	BOB	\N	2026-04-07 21:28:42.574757+00
1680	2025-12-18	15	20000	bank	BOB	\N	2026-04-07 21:28:42.577041+00
1682	2025-12-22	15	9000	bank	BOB	\N	2026-04-07 21:28:42.579277+00
1683	2025-12-22	15	10000	bank	BOB	\N	2026-04-07 21:28:42.580373+00
1686	2025-12-24	15	50000	bank	BOB	\N	2026-04-07 21:28:42.583679+00
1689	2026-01-01	15	73600	bank	BOB	\N	2026-04-07 21:28:42.587804+00
1690	2026-01-01	15	9500	bank	BOB	\N	2026-04-07 21:28:42.589056+00
1693	2026-01-06	15	2000	bank	BOB	\N	2026-04-07 21:28:42.592407+00
1694	2026-01-06	15	48000	bank	BOB	\N	2026-04-07 21:28:42.593576+00
1698	2026-01-13	15	100000	bank	BOB	SHRI HANUMAN SHARAN SINGH EN	2026-04-07 21:28:42.597853+00
1699	2026-01-13	15	25000	bank	BOB	\N	2026-04-07 21:28:42.599023+00
1704	2026-01-20	15	15000	bank	BOB	\N	2026-04-07 21:28:42.604668+00
1705	2026-01-21	15	14500	bank	BOB	\N	2026-04-07 21:28:42.605762+00
1709	2026-02-03	15	21000	bank	BOB	\N	2026-04-07 21:28:42.610393+00
1710	2026-02-03	15	161200	bank	BOB	\N	2026-04-07 21:28:42.611493+00
1711	2026-02-11	15	89100	bank	BOB	SHRI HANUMAN SHARAN SINGH EN	2026-04-07 21:28:42.612577+00
1714	2026-02-14	15	50000	bank	BOB	\N	2026-04-07 21:28:42.61598+00
1716	2026-02-17	15	20000	bank	BOB	\N	2026-04-07 21:28:42.618137+00
1717	2026-02-20	15	50000	bank	BOB	\N	2026-04-07 21:28:42.619221+00
1719	2026-02-24	15	16500	bank	BOB	\N	2026-04-07 21:28:42.621451+00
1721	2026-02-28	15	35000	bank	BOB	\N	2026-04-07 21:28:42.623647+00
1722	2026-03-05	15	20000	bank	BOB	\N	2026-04-07 21:28:42.624576+00
1723	2026-03-06	15	95200	bank	BOB	\N	2026-04-07 21:28:42.625699+00
1724	2026-03-07	15	20000	bank	BOB	\N	2026-04-07 21:28:42.62653+00
1725	2026-03-11	15	42000	bank	BOB	\N	2026-04-07 21:28:42.627637+00
1728	2026-03-16	15	75000	bank	BOB	\N	2026-04-07 21:28:42.630342+00
1730	2026-03-18	15	10000	bank	BOB	\N	2026-04-07 21:28:42.632137+00
1734	2026-03-25	15	180000	bank	BOB	\N	2026-04-07 21:28:42.635328+00
1736	2026-03-26	15	20000	bank	BOB	\N	2026-04-07 21:28:42.637912+00
1739	2026-04-02	15	25000	bank	BOB	\N	2026-04-07 21:28:42.641682+00
1740	2026-04-04	15	50000	bank	BOB	\N	2026-04-07 21:28:42.642536+00
1871	2026-03-08	176	50000	bank	BOB	\N	2026-04-07 21:28:42.801506+00
1872	2026-03-11	176	50000	bank	BOB	\N	2026-04-07 21:28:42.802594+00
1868	2026-02-07	176	50000	bank	BOB	SANJAY SINGH	2026-04-07 21:28:42.798385+00
1869	2026-02-10	176	50000	bank	BOB	SANJAY SINGH	2026-04-07 21:28:42.79937+00
2312	2025-11-06	49	61600	bank	BOB	\N	2026-04-07 21:28:43.29525+00
2329	2025-10-17	66	49999	bank	BOB	bob	2026-04-07 21:28:43.314314+00
2330	2025-10-17	66	1	bank	BOB	bob	2026-04-07 21:28:43.315361+00
2344	2025-11-01	56	2000	bank	BOB	bob	2026-04-07 21:28:43.330696+00
2345	2025-11-01	56	38000	bank	BOB	bob	2026-04-07 21:28:43.331874+00
2382	2026-01-31	48	45999	bank	BOB	\N	2026-04-07 21:28:43.375386+00
2384	2025-12-16	21	27500	bank	BOB	\N	2026-04-07 21:28:43.377628+00
2385	2025-12-16	21	2000	bank	BOB	\N	2026-04-07 21:28:43.378496+00
2433	2026-01-29	117	120000	bank	BOB	\N	2026-04-07 21:28:43.437647+00
2557	2026-03-30	121	27500	bank	BOB	\N	2026-04-07 21:28:43.573588+00
2336	2025-11-01	66	50000	bank	BOB	BOB NEW	2026-04-07 21:28:43.322181+00
4	2026-01-29	74	280000	bank	ARMTECH	SHUBHAM BUILDERS	2026-04-07 21:28:40.593796+00
5	2026-02-09	74	200000	bank	ARMTECH	SHUBHAM BUILDERS	2026-04-07 21:28:40.595044+00
6	2026-02-10	74	304000	bank	ARMTECH	SHUBHAM BUILDERS	2026-04-07 21:28:40.59626+00
8	2026-03-10	74	10000	bank	ARMTECH	SHUBHAM BUILDERS	2026-04-07 21:28:40.598567+00
11	2026-04-06	74	280000	bank	ARMTECH	SHUBHAM BUILDERS	2026-04-07 21:28:40.601683+00
363	2026-03-25	17	49000	bank	ARMTECH	\N	2026-04-07 21:28:41.021945+00
367	2026-04-03	17	30000	bank	ARMTECH	\N	2026-04-07 21:28:41.027365+00
827	2026-02-25	36	354740	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.566123+00
828	2026-02-28	36	496850	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.56726+00
829	2026-03-07	36	439200	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.568589+00
830	2026-03-13	36	400000	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.569713+00
831	2026-03-16	36	300000	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.570779+00
832	2026-03-17	36	400000	bank	ARMTECH	\N	2026-04-07 21:28:41.571644+00
833	2026-03-19	36	400000	bank	ARMTECH	\N	2026-04-07 21:28:41.572858+00
834	2026-03-23	36	400000	bank	ARMTECH	\N	2026-04-07 21:28:41.574001+00
835	2026-03-27	36	200000	bank	ARMTECH	OM CORPORATION	2026-04-07 21:28:41.574932+00
836	2026-04-03	36	190000	bank	ARMTECH	\N	2026-04-07 21:28:41.576003+00
838	2026-03-09	108	10	bank	ARMTECH	BALAJI ASS	2026-04-07 21:28:41.578041+00
839	2026-03-09	108	151200	bank	ARMTECH	BALAJI ASS	2026-04-07 21:28:41.579021+00
902	2026-02-03	167	290000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.647486+00
903	2026-02-05	167	46000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.648698+00
904	2026-02-12	167	80000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.649809+00
905	2026-02-14	167	88000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.650954+00
906	2026-02-17	167	37800	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.652173+00
907	2026-02-19	167	175000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.653307+00
908	2026-02-24	167	210000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.654497+00
910	2026-03-12	167	50000	bank	ARMTECH	MASHITAL	2026-04-07 21:28:41.656649+00
911	2026-03-22	167	168000	bank	ARMTECH	\N	2026-04-07 21:28:41.657584+00
1274	2026-03-02	33	249612	bank	ARMTECH	\N	2026-04-07 21:28:42.113383+00
1519	2025-11-26	135	86000	bank	ARMTECH	Anurag Pac	2026-04-07 21:28:42.399474+00
1520	2025-12-02	135	1	bank	ARMTECH	HIMANSHU	2026-04-07 21:28:42.400613+00
1524	2025-12-13	135	85000	bank	ARMTECH	RISHABHA TRADERS	2026-04-07 21:28:42.405343+00
1525	2025-12-16	135	50000	bank	ARMTECH	VIJAY LAKSHMI TRADERS	2026-04-07 21:28:42.406455+00
1526	2025-12-19	135	100000	bank	ARMTECH	BALAJEE INTERLOKING	2026-04-07 21:28:42.407662+00
1527	2025-12-22	135	189000	bank	ARMTECH	SAKSHI ENTERPRISE	2026-04-07 21:28:42.408966+00
1529	2026-02-09	135	20000	bank	ARMTECH	VIJAY LAKSHMI TRADERS	2026-04-07 21:28:42.410596+00
1530	2026-02-10	135	100000	bank	ARMTECH	SAKSHI ENTERPRISE	2026-04-07 21:28:42.411353+00
1531	2026-02-19	135	106000	bank	ARMTECH	VIRENDRA	2026-04-07 21:28:42.412497+00
1532	2026-03-09	135	100000	bank	ARMTECH	VIJAY LAKSHMI TRADERS	2026-04-07 21:28:42.413718+00
1534	2026-03-13	135	100000	bank	ARMTECH	VIRENDRA	2026-04-07 21:28:42.41558+00
2257	2026-02-10	39	200000	bank	ARMTECH	\N	2026-04-07 21:28:43.236653+00
2258	2026-02-20	39	166145	bank	ARMTECH	\N	2026-04-07 21:28:43.237874+00
2259	2026-02-24	39	250000	bank	ARMTECH	\N	2026-04-07 21:28:43.238879+00
2260	2026-03-09	39	245640	bank	ARMTECH	\N	2026-04-07 21:28:43.239662+00
2261	2026-03-11	39	198100	bank	ARMTECH	\N	2026-04-07 21:28:43.240422+00
2265	2026-03-27	39	200000	bank	ARMTECH	\N	2026-04-07 21:28:43.244833+00
2266	2026-04-01	39	192500	bank	ARMTECH	\N	2026-04-07 21:28:43.245889+00
2550	2026-03-19	103	29000	bank	ARMTECH	\N	2026-04-07 21:28:43.564836+00
2551	2026-03-23	103	29000	bank	ARMTECH	BUSINESS WORLD	2026-04-07 21:28:43.565911+00
2571	2026-04-06	31	300000	bank	ARMTECH	BABA CONSTRUCTION	2026-04-07 21:28:43.588573+00
1287	2025-08-13	24	235000	bank	ARMTECH	Armtech	2026-04-07 21:28:42.133169+00
1488	2025-10-06	135	96000	bank	ARMTECH	vinod	2026-04-07 21:28:42.364415+00
1224	2025-08-13	54	200000	bank	ARMTECH	Armtech A/C	2026-04-07 21:28:42.055139+00
1181	2025-04-18	171	50000	bank	ARMTECH	Armtech A/c	2026-04-07 21:28:42.008484+00
1182	2025-04-23	171	40130	bank	ARMTECH	Armtech A/c	2026-04-07 21:28:42.009317+00
238	2026-02-28	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.876835+00
239	2026-02-28	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.877907+00
240	2026-02-28	125	20000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.878799+00
241	2026-02-28	125	15000	bank	KOTAK	AMIT YADAV	2026-04-07 21:28:40.879649+00
511	2025-09-11	166	40000	bank	KOTAK	PRANUSHA TILE	2026-04-07 21:28:41.205895+00
512	2025-09-12	166	50000	bank	KOTAK	SAURABH SINGH	2026-04-07 21:28:41.206815+00
513	2025-09-12	166	30000	bank	KOTAK	VIVEK KUMAR	2026-04-07 21:28:41.208029+00
617	2025-09-11	166	40000	bank	KOTAK	PRANUSHA TILE	2026-04-07 21:28:41.324928+00
618	2025-09-12	166	50000	bank	KOTAK	SAURABH SINGH	2026-04-07 21:28:41.326075+00
619	2025-09-12	166	30000	bank	KOTAK	VIVEK KUMAR	2026-04-07 21:28:41.32728+00
2321	2026-02-05	49	100000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.304945+00
2322	2026-02-14	49	100000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.306016+00
2323	2026-02-17	49	50000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.307162+00
2324	2026-02-24	49	500000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.308333+00
2325	2026-03-02	49	50000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.309432+00
2326	2026-03-09	49	100000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.310633+00
2327	2026-03-14	49	100000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.311873+00
2328	2026-03-24	49	200000	bank	AXIS	SNINDUST	2026-04-07 21:28:43.312946+00
2365	2025-12-02	123	29000	bank	AXIS	\N	2026-04-07 21:28:43.354871+00
2366	2025-12-11	123	91000	bank	AXIS	\N	2026-04-07 21:28:43.356102+00
2367	2025-12-12	123	35000	bank	AXIS	\N	2026-04-07 21:28:43.357028+00
1897	2025-11-11	35	115000	bank	HDFC	hdfc	2026-04-07 21:28:42.835773+00
2007	2025-04-03	136	50000	bank	OK	ok	2026-04-07 21:28:42.964933+00
2008	2025-04-04	136	180000	bank	OK	ok	2026-04-07 21:28:42.966107+00
2009	2025-04-04	136	60000	bank	OK	ok	2026-04-07 21:28:42.967197+00
2010	2025-04-06	136	22000	bank	OK	ok	2026-04-07 21:28:42.968453+00
2011	2025-04-08	136	130000	bank	OK	ok	2026-04-07 21:28:42.969652+00
2013	2025-04-09	136	50000	bank	OK	ok	2026-04-07 21:28:42.97191+00
2014	2025-04-10	136	40000	bank	OK	ok	2026-04-07 21:28:42.972983+00
2015	2025-04-10	136	15000	bank	OK	ok	2026-04-07 21:28:42.974102+00
2016	2025-04-10	136	54000	bank	OK	ok	2026-04-07 21:28:42.975223+00
2017	2025-04-11	136	120000	bank	OK	ok	2026-04-07 21:28:42.976365+00
2018	2025-04-12	136	50000	bank	OK	ok	2026-04-07 21:28:42.977529+00
2020	2025-04-14	136	70000	bank	OK	ok	2026-04-07 21:28:42.979473+00
2021	2025-04-14	136	30000	bank	OK	ok	2026-04-07 21:28:42.98072+00
2022	2025-04-15	136	19989	bank	OK	ok	2026-04-07 21:28:42.9818+00
2023	2025-04-15	136	45000	bank	OK	ok	2026-04-07 21:28:42.982929+00
2024	2025-04-15	136	50000	bank	OK	ok	2026-04-07 21:28:42.984381+00
2025	2025-04-16	136	15000	bank	OK	ok	2026-04-07 21:28:42.985595+00
2026	2025-04-16	136	11000	bank	OK	ok	2026-04-07 21:28:42.987065+00
2028	2025-04-17	136	140000	bank	OK	ok	2026-04-07 21:28:42.989199+00
2029	2025-04-18	136	50000	bank	OK	ok	2026-04-07 21:28:42.990029+00
2045	2025-06-02	136	56000	bank	OK	ok	2026-04-07 21:28:43.008863+00
2046	2025-06-07	136	35000	bank	OK	ok	2026-04-07 21:28:43.009995+00
2047	2025-06-10	136	180000	bank	OK	ok	2026-04-07 21:28:43.011086+00
2049	2025-06-16	136	35000	bank	OK	ok	2026-04-07 21:28:43.01337+00
2050	2025-06-18	136	150000	bank	OK	ok	2026-04-07 21:28:43.014464+00
2052	2025-06-19	136	55000	bank	OK	ok	2026-04-07 21:28:43.0168+00
2054	2025-06-21	136	55000	bank	OK	ok	2026-04-07 21:28:43.019233+00
2055	2025-06-24	136	90000	bank	OK	ok	2026-04-07 21:28:43.02048+00
2058	2025-06-25	136	50000	bank	OK	ok	2026-04-07 21:28:43.0238+00
2059	2025-06-27	136	95000	bank	OK	ok	2026-04-07 21:28:43.024946+00
2060	2025-06-28	136	120000	bank	OK	ok	2026-04-07 21:28:43.026079+00
2062	2025-07-01	136	60000	bank	OK	ok	2026-04-07 21:28:43.028485+00
2064	2025-07-02	136	110000	bank	OK	ok	2026-04-07 21:28:43.030701+00
2070	2025-07-04	136	25000	bank	OK	ok	2026-04-07 21:28:43.037971+00
2072	2025-07-08	136	50000	bank	OK	ok	2026-04-07 21:28:43.040739+00
2073	2025-07-08	136	200000	bank	OK	ok	2026-04-07 21:28:43.042084+00
2075	2025-07-09	136	95000	bank	OK	ok	2026-04-07 21:28:43.04452+00
2076	2025-07-09	136	25000	bank	OK	ok	2026-04-07 21:28:43.045752+00
2083	2025-07-14	136	200000	bank	OK	ok	2026-04-07 21:28:43.054255+00
2085	2025-07-18	136	50000	bank	OK	ok	2026-04-07 21:28:43.056443+00
2087	2025-07-19	136	90000	bank	OK	ok	2026-04-07 21:28:43.058823+00
2089	2025-07-20	136	110000	bank	OK	ok	2026-04-07 21:28:43.060867+00
2090	2025-07-21	136	186000	bank	OK	ok	2026-04-07 21:28:43.061973+00
2091	2025-07-21	136	80000	bank	OK	ok	2026-04-07 21:28:43.062858+00
2092	2025-07-21	136	90000	bank	OK	ok	2026-04-07 21:28:43.063933+00
2093	2025-07-22	136	120000	bank	OK	ok	2026-04-07 21:28:43.065144+00
2094	2025-07-22	136	100000	bank	OK	ok	2026-04-07 21:28:43.066141+00
2099	2025-07-24	136	115000	bank	OK	ok	2026-04-07 21:28:43.072052+00
2100	2025-07-25	136	50000	bank	OK	ok	2026-04-07 21:28:43.073155+00
2101	2025-07-25	136	165000	bank	OK	ok	2026-04-07 21:28:43.074143+00
2102	2025-07-25	136	50000	bank	OK	ok	2026-04-07 21:28:43.074934+00
2104	2025-07-27	136	42000	bank	OK	ok	2026-04-07 21:28:43.077174+00
2105	2025-07-27	136	250000	bank	OK	ok	2026-04-07 21:28:43.077939+00
2106	2025-07-28	136	100000	bank	OK	ok	2026-04-07 21:28:43.078646+00
2111	2025-07-31	136	40000	bank	OK	ok	2026-04-07 21:28:43.083613+00
2115	2025-08-04	136	260000	bank	OK	ok	2026-04-07 21:28:43.088128+00
2116	2025-08-04	136	138000	bank	OK	ok	2026-04-07 21:28:43.08922+00
2117	2025-08-05	136	73000	bank	OK	ok	2026-04-07 21:28:43.090393+00
2119	2025-08-06	136	240000	bank	OK	ok	2026-04-07 21:28:43.092129+00
2120	2025-08-08	136	105000	bank	OK	ok	2026-04-07 21:28:43.093433+00
2122	2025-08-08	136	82000	bank	OK	ok	2026-04-07 21:28:43.095948+00
2123	2025-08-11	136	110000	bank	OK	ok	2026-04-07 21:28:43.097057+00
934	2025-09-23	141	28400	cash	\N	CASH PAID	2026-04-07 21:28:41.682627+00
1399	2025-09-19	111	100000	cash	\N	CASH	2026-04-07 21:28:42.262336+00
1400	2025-09-24	111	87775	cash	\N	by cash	2026-04-07 21:28:42.26309+00
39	2025-08-23	165	20000	bank	\N	PRIYANSHU | Sender: PRIYANSHU	2026-04-07 21:28:40.644934+00
40	2025-08-23	165	20000	bank	\N	AJAY KUMAR | Sender: AJAY KUMAR	2026-04-07 21:28:40.645924+00
41	2025-08-23	165	20000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:40.647161+00
42	2025-08-23	165	2000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:40.648344+00
44	2025-08-25	165	25000	bank	\N	NITIN KUMAR | Sender: NITIN KUMAR	2026-04-07 21:28:40.65062+00
45	2025-08-25	165	30000	bank	\N	AJAY KUMAR | Sender: AJAY KUMAR	2026-04-07 21:28:40.65175+00
46	2025-08-25	165	75000	bank	\N	PRIYANSHU SINGH | Sender: PRIYANSHU SINGH	2026-04-07 21:28:40.652813+00
49	2025-08-26	165	70000	bank	\N	PRIYANSHU | Sender: PRIYANSHU	2026-04-07 21:28:40.656371+00
50	2025-08-27	165	27000	bank	\N	PRIYANSHU | Sender: PRIYANSHU	2026-04-07 21:28:40.657488+00
51	2025-08-28	165	19000	bank	\N	SHIV GANESH TIWARI | Sender: SHIV GANESH TIWARI	2026-04-07 21:28:40.658524+00
52	2025-08-28	165	1000	bank	\N	SHIV GANESH TIWARI | Sender: SHIV GANESH TIWARI	2026-04-07 21:28:40.65967+00
53	2025-08-28	165	10000	bank	\N	DILEEP KUMAR | Sender: DILEEP KUMAR	2026-04-07 21:28:40.660809+00
54	2025-08-28	165	20000	bank	\N	AJAY KUMAR | Sender: AJAY KUMAR	2026-04-07 21:28:40.661941+00
55	2025-08-28	165	30000	bank	\N	PRIYANSHU | Sender: PRIYANSHU	2026-04-07 21:28:40.662796+00
56	2025-08-27	165	45500	bank	\N	YADAV FUELS | Sender: YADAV FUELS	2026-04-07 21:28:40.663977+00
57	2025-08-29	165	12000	bank	\N	PRIYANSHU | Sender: PRIYANSHU	2026-04-07 21:28:40.665141+00
58	2025-08-29	165	274680	bank	\N	PRIYANSHU | Sender: PRIYANSHU	2026-04-07 21:28:40.666226+00
61	2025-09-09	165	64300	bank	\N	MAHATEJAS | Sender: MAHATEJAS	2026-04-07 21:28:40.669348+00
62	2025-09-10	165	50000	bank	\N	Priyanshu Singh | Sender: Priyanshu Singh	2026-04-07 21:28:40.670495+00
70	2025-09-20	165	70000	bank	\N	PRIYANSHU SINGH | Sender: PRIYANSHU SINGH	2026-04-07 21:28:40.680112+00
71	2025-09-23	165	40000	bank	\N	AJAY KUMAR | Sender: AJAY KUMAR	2026-04-07 21:28:40.681438+00
72	2025-09-26	165	50000	bank	\N	PRIYANSHU SINGH | Sender: PRIYANSHU SINGH	2026-04-07 21:28:40.682502+00
77	2025-09-29	165	56000	bank	\N	PRIYANSHU SINGH | Sender: PRIYANSHU SINGH	2026-04-07 21:28:40.68891+00
78	2025-09-28	165	274700	bank	\N	PRIYANSHU SINGH | Sender: PRIYANSHU SINGH	2026-04-07 21:28:40.690215+00
80	2025-10-03	165	275000	bank	\N	RANJEET KUMAR | Sender: RANJEET KUMAR	2026-04-07 21:28:40.692457+00
86	2025-11-19	165	50000	bank	\N	priyanshu singh | Sender: priyanshu singh	2026-04-07 21:28:40.699082+00
411	2025-07-31	138	200000	bank	\N	538 | Sender: 538	2026-04-07 21:28:41.081126+00
412	2025-08-02	138	102175	bank	\N	562 | Sender: 562	2026-04-07 21:28:41.082612+00
478	2025-08-07	166	207000	bank	\N	Laxmi Cemented | Sender: Laxmi Cemented	2026-04-07 21:28:41.167972+00
492	2025-08-27	166	50000	bank	\N	SAURABH SINGH | Sender: SAURABH SINGH	2026-04-07 21:28:41.18299+00
493	2025-08-28	166	50000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.18432+00
494	2025-08-29	166	37000	bank	\N	SAURABH SINGH | Sender: SAURABH SINGH	2026-04-07 21:28:41.185532+00
495	2025-08-29	166	20000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.186795+00
496	2025-08-31	166	50000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.187766+00
497	2025-09-01	166	90000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.189+00
498	2025-09-02	166	69800	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.189937+00
499	2025-09-02	166	172500	bank	\N	UJJWAL TILES | Sender: UJJWAL TILES	2026-04-07 21:28:41.191275+00
519	2025-09-19	166	50000	bank	\N	AWADHESH KUMAR | Sender: AWADHESH KUMAR	2026-04-07 21:28:41.214552+00
520	2025-09-23	166	183000	bank	\N	EVEREST NIRMAN PRIVATE | Sender: EVEREST NIRMAN PRIVATE	2026-04-07 21:28:41.215614+00
521	2025-09-24	166	30400	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.216614+00
522	2025-09-27	166	61500	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.217904+00
523	2025-09-28	166	50000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.219163+00
524	2025-09-28	166	1	bank	\N	ATISHYA | Sender: ATISHYA	2026-04-07 21:28:41.220312+00
525	2025-09-28	166	30000	bank	\N	ATISHYA | Sender: ATISHYA	2026-04-07 21:28:41.221293+00
566	2025-08-07	166	207000	bank	\N	Laxmi Cemented | Sender: Laxmi Cemented	2026-04-07 21:28:41.268681+00
578	2025-08-22	166	100000	bank	\N	RAM ROOP | Sender: RAM ROOP	2026-04-07 21:28:41.280921+00
579	2025-08-22	166	10000	bank	\N	PRADHAN entp | Sender: PRADHAN entp	2026-04-07 21:28:41.282047+00
580	2025-08-22	166	90000	bank	\N	PRADHAN entp | Sender: PRADHAN entp	2026-04-07 21:28:41.283164+00
581	2025-08-22	166	80000	bank	\N	PRADHAN AGRO | Sender: PRADHAN AGRO	2026-04-07 21:28:41.284358+00
582	2025-08-23	166	40000	bank	\N	NEW BALAJI | Sender: NEW BALAJI	2026-04-07 21:28:41.285567+00
583	2025-08-23	166	14600	bank	\N	MAA VAISHNO | Sender: MAA VAISHNO	2026-04-07 21:28:41.286763+00
585	2025-08-23	166	20000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.288878+00
588	2025-08-25	166	100000	bank	\N	AKSHAR | Sender: AKSHAR	2026-04-07 21:28:41.292294+00
589	2025-08-25	166	105900	bank	\N	HIMGIRI PIPES | Sender: HIMGIRI PIPES	2026-04-07 21:28:41.293061+00
591	2025-08-26	166	78700	bank	\N	SARITA | Sender: SARITA	2026-04-07 21:28:41.294989+00
592	2025-08-27	166	8500	bank	\N	PRANUSHA | Sender: PRANUSHA	2026-04-07 21:28:41.29618+00
593	2025-08-27	166	50000	bank	\N	SAURABH SINGH | Sender: SAURABH SINGH	2026-04-07 21:28:41.297305+00
596	2025-08-28	166	30000	bank	\N	AJAY KUMAR | Sender: AJAY KUMAR	2026-04-07 21:28:41.300748+00
597	2025-08-28	166	50000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.302101+00
598	2025-08-29	166	37000	bank	\N	SAURABH SINGH | Sender: SAURABH SINGH	2026-04-07 21:28:41.303256+00
599	2025-08-29	166	20000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.304337+00
600	2025-08-30	166	104000	bank	\N	AKSHAR | Sender: AKSHAR	2026-04-07 21:28:41.3054+00
601	2025-08-31	166	50000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.306566+00
602	2025-09-01	166	90000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.30772+00
603	2025-09-02	166	69800	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.309201+00
604	2025-09-02	166	172500	bank	\N	UJJWAL TILES | Sender: UJJWAL TILES	2026-04-07 21:28:41.310527+00
625	2025-09-23	166	183000	bank	\N	EVEREST NIRMAN PRIVATE | Sender: EVEREST NIRMAN PRIVATE	2026-04-07 21:28:41.334075+00
627	2025-09-27	166	61500	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.336321+00
628	2025-09-28	166	50000	bank	\N	VIVEK KUMAR | Sender: VIVEK KUMAR	2026-04-07 21:28:41.33747+00
629	2025-09-28	166	1	bank	\N	ATISHYA | Sender: ATISHYA	2026-04-07 21:28:41.338469+00
630	2025-09-28	166	30000	bank	\N	ATISHYA | Sender: ATISHYA	2026-04-07 21:28:41.339579+00
631	2025-09-29	166	155000	bank	\N	ISHWARDEEN MISHRA TRADERS | Sender: ISHWARDEEN MISHRA TRADERS	2026-04-07 21:28:41.340712+00
632	2025-10-01	166	200000	bank	\N	AWADHESH KUMAR | Sender: 860	2026-04-07 21:28:41.342032+00
633	2025-10-03	166	103500	bank	\N	SARITA | Sender: SARITA	2026-04-07 21:28:41.342998+00
634	2025-10-03	166	80000	bank	\N	PRASHANT SINGH | Sender: PRASHANT SINGH	2026-04-07 21:28:41.343891+00
635	2025-10-03	166	100000	bank	\N	Gudiya Suneeta | Sender: Gudiya Suneeta	2026-04-07 21:28:41.344759+00
636	2025-10-04	166	207900	bank	\N	lalit kumar pandey | Sender: lalit kumar pandey	2026-04-07 21:28:41.345901+00
637	2025-10-04	166	212000	bank	\N	AKSHAR INF | Sender: AKSHAR INF	2026-04-07 21:28:41.347022+00
641	2025-10-11	166	50000	bank	\N	vivek kumar | Sender: vivek kumar	2026-04-07 21:28:41.351748+00
642	2025-10-11	166	3250	bank	\N	vivek kumar | Sender: vivek kumar	2026-04-07 21:28:41.352915+00
643	2025-10-14	166	20000	bank	\N	vivek kumar | Sender: vivek kumar	2026-04-07 21:28:41.354005+00
644	2025-10-17	166	44700	bank	\N	LUCKNOW | Sender: LUCKNOW	2026-04-07 21:28:41.35498+00
645	2025-10-18	166	26000	bank	\N	ayushman | Sender: ayushman	2026-04-07 21:28:41.356113+00
646	2025-10-24	166	20000	bank	\N	ayushman | Sender: ayushman	2026-04-07 21:28:41.356988+00
647	2025-10-28	166	180000	bank	\N	EVEREST NIRMAN | Sender: EVEREST NIRMAN	2026-04-07 21:28:41.358111+00
654	2025-11-02	166	16000	bank	\N	ayushman | Sender: ayushman	2026-04-07 21:28:41.366847+00
668	2025-11-20	166	155000	bank	\N	SARITA CEMENT | Sender: SARITA CEMENT	2026-04-07 21:28:41.382744+00
674	2025-11-26	166	50000	bank	\N	MUKESH RAWAT | Sender: MUKESH RAWAT	2026-04-07 21:28:41.389368+00
680	2025-12-02	166	100000	bank	\N	Awadhesh Kumar | Sender: Awadhesh Kumar	2026-04-07 21:28:41.396+00
689	2025-12-09	166	1	bank	\N	mishrama | Sender: mishrama	2026-04-07 21:28:41.407737+00
690	2025-12-09	166	10000	bank	\N	mishrama | Sender: mishrama	2026-04-07 21:28:41.408833+00
692	2025-12-09	166	30000	bank	\N	ayushman | Sender: ayushman	2026-04-07 21:28:41.411144+00
694	2025-12-10	166	20000	bank	\N	ayushman | Sender: ayushman	2026-04-07 21:28:41.413113+00
702	2025-12-17	166	20000	bank	\N	ayushman | Sender: ayushman	2026-04-07 21:28:41.422631+00
705	2025-12-18	166	50000	bank	\N	MUKESH RAWAT | Sender: MUKESH RAWAT	2026-04-07 21:28:41.42527+00
721	2026-01-06	166	20000	bank	\N	AYUSHMA | Sender: AYUSHMA	2026-04-07 21:28:41.442206+00
736	2026-01-13	166	20000	bank	\N	AYUSHMAN | Sender: AYUSHMAN	2026-04-07 21:28:41.45853+00
755	2026-01-29	166	21100	bank	\N	AYUSHMAN | Sender: AYUSHMAN	2026-04-07 21:28:41.480499+00
759	2026-02-01	166	30000	bank	\N	AYUSHMAN | Sender: AYUSHMAN	2026-04-07 21:28:41.485031+00
766	2026-02-04	166	20000	bank	\N	AYUSHMAN | Sender: AYUSHMAN	2026-04-07 21:28:41.492579+00
772	2026-02-09	166	124000	bank	\N	MAHADEV ENTERPRISES | Sender: MAHADEV ENTERPRISES	2026-04-07 21:28:41.49959+00
773	2026-02-09	166	150000	bank	\N	SHANTI TRADERS | Sender: SHANTI TRADERS	2026-04-07 21:28:41.500694+00
774	2026-02-09	166	35000	bank	\N	SARITA CEMENT | Sender: SARITA CEMENT	2026-04-07 21:28:41.502048+00
776	2026-02-17	166	20000	bank	\N	AYUSHMAN | Sender: AYUSHMAN	2026-04-07 21:28:41.504472+00
781	2026-02-23	166	31000	bank	\N	BALAJI ENTERPRISES | Sender: BALAJI ENTERPRISES	2026-04-07 21:28:41.509966+00
783	2026-02-23	166	100000	bank	\N	SARITA CEMENT TILES | Sender: SARITA CEMENT TILES	2026-04-07 21:28:41.512398+00
788	2026-02-27	166	30000	bank	\N	AYUSHMAN | Sender: AYUSHMAN	2026-04-07 21:28:41.518128+00
792	2026-03-13	166	30000	bank	\N	AYUSHMAN | Sender: AYUSHMAN	2026-04-07 21:28:41.52257+00
803	2026-03-25	166	50000	bank	\N	shri shyam enterprises | Sender: shri shyam enterprises	2026-04-07 21:28:41.535937+00
810	2025-09-07	70	30000	bank	\N	NEW BHARAT | Sender: NEW BHARAT	2026-04-07 21:28:41.544949+00
811	2025-09-07	70	10000	bank	\N	Abdullah Shaik | Sender: Abdullah Shaik	2026-04-07 21:28:41.54595+00
812	2025-09-07	70	30000	bank	\N	ANUP PRAJAPATI | Sender: ANUP PRAJAPATI	2026-04-07 21:28:41.546918+00
813	2025-09-26	70	50000	bank	\N	NEW BHARAT | Sender: NEW BHARAT	2026-04-07 21:28:41.54833+00
814	2025-09-27	70	19500	bank	\N	NEW BHARAT | Sender: NEW BHARAT	2026-04-07 21:28:41.549665+00
955	2025-09-06	19	200000	bank	\N	K N TRADERS | Sender: K N TRADERS	2026-04-07 21:28:41.708465+00
956	2025-09-30	19	161000	bank	\N	K N TRADERS | Sender: K N TRADERS	2026-04-07 21:28:41.709646+00
957	2025-10-10	19	53000	bank	\N	K N TRADERS | Sender: K N TRADERS	2026-04-07 21:28:41.710825+00
963	2025-08-11	169	45000	bank	\N	Buddeshwar | Sender: Buddeshwar	2026-04-07 21:28:41.723032+00
964	2025-08-12	169	30000	bank	\N	Buddeshwar | Sender: Buddeshwar	2026-04-07 21:28:41.724233+00
965	2025-08-14	169	15000	bank	\N	Buddeshwar | Sender: Buddeshwar	2026-04-07 21:28:41.72514+00
966	2025-08-16	169	52000	bank	\N	Buddeshwar | Sender: Buddeshwar	2026-04-07 21:28:41.72607+00
967	2025-08-16	169	23000	bank	\N	Buddeshwar | Sender: Buddeshwar	2026-04-07 21:28:41.726841+00
973	2025-09-01	169	36500	bank	\N	Abhishek singh | Sender: Abhishek singh	2026-04-07 21:28:41.734256+00
974	2025-09-03	169	30000	bank	\N	ABHISHEK SINGH | Sender: ABHISHEK SINGH	2026-04-07 21:28:41.735465+00
975	2025-09-16	169	38000	bank	\N	ABHISHEK SINGH | Sender: ABHISHEK SINGH	2026-04-07 21:28:41.736563+00
976	2025-09-16	169	2000	bank	\N	ABHISHEK SINGH | Sender: ABHISHEK SINGH	2026-04-07 21:28:41.737573+00
977	2025-09-22	169	30000	bank	\N	ABHISHEK SINGH | Sender: ABHISHEK SINGH	2026-04-07 21:28:41.738665+00
978	2025-09-22	169	20000	bank	\N	ABHISHEK SINGH | Sender: ABHISHEK SINGH	2026-04-07 21:28:41.739773+00
979	2025-09-29	169	20000	bank	\N	ABHISHEK SINGH | Sender: ABHISHEK SINGH	2026-04-07 21:28:41.740901+00
1013	2025-11-10	170	150000	bank	\N	PARI ENTERPRISES | Sender: PARI ENTERPRISES	2026-04-07 21:28:41.784409+00
1014	2025-12-01	170	30000	bank	\N	PARI ENTERPRISES | Sender: PARI ENTERPRISES	2026-04-07 21:28:41.786496+00
1035	2025-08-29	43	30000	bank	\N	DHARMENDRA TREDERS | Sender: DHARMENDRA TREDERS	2026-04-07 21:28:41.816594+00
1082	2025-08-11	134	150000	bank	\N	Santosh Kumar | Sender: Santosh Kumar	2026-04-07 21:28:41.882368+00
1090	2025-08-23	134	80000	bank	\N	MAA GYAN PRABHA ENTERPRISES | Sender: MAA GYAN PRABHA ENTERPRISES	2026-04-07 21:28:41.891955+00
1091	2025-08-25	134	100000	bank	\N	MAA GYAN PRABHA ENTERPRISES | Sender: MAA GYAN PRABHA ENTERPRISES	2026-04-07 21:28:41.893118+00
1092	2025-08-25	134	74000	bank	\N	MAA GYAN PRABHA ENTERPRISES | Sender: MAA GYAN PRABHA ENTERPRISES	2026-04-07 21:28:41.894172+00
1094	2025-08-28	134	145000	bank	\N	MAA GYAN PRABHA ENTERPRISES | Sender: MAA GYAN PRABHA ENTERPRISES	2026-04-07 21:28:41.897096+00
1095	2025-08-28	134	50000	bank	\N	SANTOSH KUMAR | Sender: SANTOSH KUMAR	2026-04-07 21:28:41.898691+00
1096	2025-08-29	134	50000	bank	\N	SANTOSH KUMAR | Sender: SANTOSH KUMAR	2026-04-07 21:28:41.90022+00
1097	2025-08-29	134	30000	bank	\N	SANTOSH KUMAR | Sender: SANTOSH KUMAR	2026-04-07 21:28:41.902086+00
1098	2025-09-01	134	40000	bank	\N	SANTOSH KUMAR | Sender: SANTOSH KUMAR	2026-04-07 21:28:41.904029+00
1099	2025-09-04	134	50000	bank	\N	SANTOSH KUMAR | Sender: SANTOSH KUMAR	2026-04-07 21:28:41.905936+00
1100	2025-09-08	134	100000	bank	\N	MAA GYAN PRABHA ENTERPRISES | Sender: MAA GYAN PRABHA ENTERPRISES	2026-04-07 21:28:41.907633+00
1101	2025-09-09	134	75000	bank	\N	SANTOSH KUMAR | Sender: SANTOSH KUMAR	2026-04-07 21:28:41.909488+00
1102	2025-09-11	134	54600	bank	\N	FREIGHT BIRLA | Sender: FREIGHT BIRLA	2026-04-07 21:28:41.911244+00
1104	2025-09-13	134	100000	bank	\N	SANTOSH KUMAR | Sender: SANTOSH KUMAR	2026-04-07 21:28:41.915052+00
1173	2025-12-16	16	72000	bank	\N	anurag singh | Sender: anurag singh	2026-04-07 21:28:41.997215+00
1175	2025-09-02	101	20000	bank	\N	MISHRA TRADERS | Sender: MISHRA TRADERS	2026-04-07 21:28:41.999464+00
1176	2025-10-10	101	20000	bank	\N	mishra traders | Sender: mishra traders	2026-04-07 21:28:42.000847+00
1177	2025-11-10	101	20000	bank	\N	mishra traders | Sender: mishra traders	2026-04-07 21:28:42.002074+00
1185	2025-05-21	171	50000	bank	\N	Bhuddheswar | Sender: Bhuddheswar	2026-04-07 21:28:42.012764+00
1188	2025-05-28	171	50000	bank	\N	Bhuddheswar | Sender: Bhuddheswar	2026-04-07 21:28:42.01626+00
1189	2025-06-02	171	65830	bank	\N	Bhuddheswar | Sender: Bhuddheswar	2026-04-07 21:28:42.017369+00
1192	2025-06-18	171	10000	bank	\N	Bhuddheswar | Sender: Bhuddheswar	2026-04-07 21:28:42.021044+00
1193	2025-06-19	171	30000	bank	\N	Bhuddheswar | Sender: Bhuddheswar	2026-04-07 21:28:42.022218+00
1194	2025-06-25	171	50000	bank	\N	Bhuddheswar | Sender: Bhuddheswar	2026-04-07 21:28:42.02315+00
1197	2025-07-08	171	50000	bank	\N	Bhuddheswar | Sender: Bhuddheswar	2026-04-07 21:28:42.026275+00
1204	2025-08-26	171	50000	bank	\N	DEO ANURAG SINGH | Sender: DEO ANURAG SINGH	2026-04-07 21:28:42.033102+00
1205	2025-08-30	171	50000	bank	\N	DEO ANURAG SINGH | Sender: DEO ANURAG SINGH	2026-04-07 21:28:42.034238+00
1206	2025-09-04	171	50000	bank	\N	DEO ANURAG SINGH | Sender: DEO ANURAG SINGH	2026-04-07 21:28:42.035562+00
1208	2025-09-17	171	35580	bank	\N	RAM ANUGRAH SINGH | Sender: RAM ANUGRAH SINGH	2026-04-07 21:28:42.03806+00
1209	2025-09-29	171	50000	bank	\N	DEO ANURAG SINGH | Sender: DEO ANURAG SINGH	2026-04-07 21:28:42.039172+00
1210	2025-10-07	171	50000	bank	\N	DEO ANURAG SINGH | Sender: DEO ANURAG SINGH	2026-04-07 21:28:42.040232+00
1212	2025-10-19	171	40000	bank	\N	AMIT SINGH | Sender: AMIT SINGH	2026-04-07 21:28:42.042083+00
1214	2025-11-06	171	30000	bank	\N	amit singh | Sender: amit singh	2026-04-07 21:28:42.043664+00
1215	2025-11-11	171	50000	bank	\N	amit singh | Sender: amit singh	2026-04-07 21:28:42.044907+00
1216	2025-11-18	171	50000	bank	\N	AMIT SINGH | Sender: AMIT SINGH	2026-04-07 21:28:42.04585+00
1219	2025-12-04	171	50000	bank	\N	AMIT SINGH | Sender: AMIT SINGH	2026-04-07 21:28:42.048891+00
1220	2025-12-10	171	50000	bank	\N	AMIT SINGH | Sender: AMIT SINGH	2026-04-07 21:28:42.050009+00
1222	2025-12-25	171	47500	bank	\N	AMIT SINGH | Sender: AMIT SINGH	2026-04-07 21:28:42.052279+00
1244	2025-08-30	33	234000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.078597+00
1245	2025-09-13	33	227000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.079712+00
1246	2025-10-01	33	230000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.080922+00
1247	2025-10-04	33	252100	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.081807+00
1248	2025-10-09	33	101280	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.082933+00
1249	2025-10-15	33	200000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.084073+00
1250	2025-10-17	33	92500	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.085301+00
1251	2025-11-07	33	125000	bank	\N	CARE CONCRETE PRIVATE | Sender: CARE CONCRETE PRIVATE	2026-04-07 21:28:42.086463+00
1252	2025-11-14	33	200000	bank	\N	CARE CONCRETE PRIVATE | Sender: CARE CONCRETE PRIVATE	2026-04-07 21:28:42.087574+00
1253	2025-11-22	33	200000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.088712+00
1254	2025-12-04	33	200000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.089791+00
1255	2025-12-15	33	400000	bank	\N	ATHARVA ENTERPRISES | Sender: ATHARVA ENTERPRISES	2026-04-07 21:28:42.090945+00
1256	2025-12-18	33	200000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.092074+00
1257	2025-12-23	33	300000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.093195+00
1258	2025-12-31	33	170000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.093959+00
1259	2026-01-08	33	150000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.095153+00
1260	2026-01-14	33	200000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.096314+00
1261	2026-01-17	33	150000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.097509+00
1262	2026-01-20	33	100000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.098617+00
1263	2026-01-21	33	100000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.099767+00
1264	2026-01-27	33	500000	bank	\N	ATHARVA ENTERPRISES | Sender: ATHARVA ENTERPRISES	2026-04-07 21:28:42.100904+00
1265	2026-02-07	33	150000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.102189+00
1266	2026-02-12	33	150000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.103343+00
1267	2026-02-22	33	200000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.104494+00
1268	2026-02-24	33	334500	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.105442+00
1269	2026-03-01	33	200000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.106898+00
1270	2026-03-09	33	200000	bank	\N	CARE CONCRETE PRIVA | Sender: CARE CONCRETE PRIVA	2026-04-07 21:28:42.108421+00
1271	2026-03-14	33	200000	bank	\N	ATHARVA ENTERPRISES | Sender: ATHARVA ENTERPRISES	2026-04-07 21:28:42.109685+00
1272	2026-03-20	33	200000	bank	\N	ATHARVA ENTERPRISES | Sender: ATHARVA ENTERPRISES	2026-04-07 21:28:42.110876+00
1273	2026-03-31	33	400000	bank	\N	ATHARVA ENTERPRISES | Sender: ATHARVA ENTERPRISES	2026-04-07 21:28:42.111845+00
1279	2025-11-10	33	400000	bank	\N	ATHARVA ENTERPRISES | Sender: ATHARVA ENTERPRISES	2026-04-07 21:28:42.119467+00
1280	2025-11-17	33	200000	bank	\N	ATHARVA ENTERPRISES | Sender: ATHARVA ENTERPRISES	2026-04-07 21:28:42.120657+00
1281	2025-11-20	33	52800	bank	\N	ATHARVA ENTERPRISES | Sender: ATHARVA ENTERPRISES	2026-04-07 21:28:42.12175+00
1282	2025-09-20	58	100000	bank	\N	krishna enterprise | Sender: krishna enterprise	2026-04-07 21:28:42.127068+00
1284	2025-09-22	58	37500	bank	\N	KRISHNA ENTERPRISES | Sender: KRISHNA ENTERPRISES	2026-04-07 21:28:42.129238+00
1285	2025-10-01	58	27000	bank	\N	KRISHNA ENTERPRISES | Sender: KRISHNA ENTERPRISES	2026-04-07 21:28:42.130298+00
1286	2025-10-02	58	49000	bank	\N	KRISHNA ENTERPRISES | Sender: KRISHNA ENTERPRISES	2026-04-07 21:28:42.131506+00
1297	2025-09-16	24	256200	bank	\N	SHRI BAJALI ENTERPRISES | Sender: SHRI BAJALI ENTERPRISES	2026-04-07 21:28:42.144085+00
1298	2025-09-19	24	213500	bank	\N	SHRI BAJALI ENTERPRISES | Sender: SHRI BAJALI ENTERPRISES	2026-04-07 21:28:42.145126+00
1299	2025-09-23	24	213500	bank	\N	SHRI BAJALI ENTERPRISES | Sender: SHRI BAJALI ENTERPRISES	2026-04-07 21:28:42.146383+00
1301	2025-09-29	24	228000	bank	\N	SHRI BALAJI ENTERPR | Sender: SHRI BALAJI ENTERPR	2026-04-07 21:28:42.148498+00
1302	2025-09-29	24	164000	bank	\N	SHRI BALAJI ENTERPR | Sender: SHRI BALAJI ENTERPR	2026-04-07 21:28:42.14954+00
1305	2025-10-04	24	250000	bank	\N	SHRI BALAJI ENTERPR | Sender: SHRI BALAJI ENTERPR	2026-04-07 21:28:42.153106+00
1306	2025-10-06	24	125200	bank	\N	SHRI BALAJI ENTERPR | Sender: SHRI BALAJI ENTERPR	2026-04-07 21:28:42.154263+00
1308	2025-10-09	24	201600	bank	\N	SHRI BALAJI ENTERPR | Sender: SHRI BALAJI ENTERPR	2026-04-07 21:28:42.156923+00
1314	2025-10-18	24	80000	bank	\N	SHRI BALAJI ENTERPR | Sender: SHRI BALAJI ENTERPR	2026-04-07 21:28:42.163962+00
1315	2025-10-27	24	200000	bank	\N	SHRI BALAJI ENTERPR | Sender: SHRI BALAJI ENTERPR	2026-04-07 21:28:42.165162+00
1316	2025-11-03	24	100000	bank	\N	PARAS ASSOCIATES | Sender: PARAS ASSOCIATES	2026-04-07 21:28:42.166253+00
1317	2025-11-07	24	95000	bank	\N	PARAS ASSOCIATES | Sender: PARAS ASSOCIATES	2026-04-07 21:28:42.167133+00
1318	2025-11-20	24	168000	bank	\N	PARAS ASSOCIATES | Sender: PARAS ASSOCIATES	2026-04-07 21:28:42.168064+00
1321	2025-12-19	24	250000	bank	\N	SHRI BALAJI ENTERPR | Sender: SHRI BALAJI ENTERPR	2026-04-07 21:28:42.171474+00
1323	2025-12-30	24	190000	bank	\N	PARAS ASSOCIATES | Sender: PARAS ASSOCIATES	2026-04-07 21:28:42.173574+00
1332	2026-02-27	24	150000	bank	\N	SHRI BALAJI ENTERPRISES | Sender: SHRI BALAJI ENTERPRISES	2026-04-07 21:28:42.183413+00
1339	2026-03-14	24	1000	bank	\N	yadav.sneha | Sender: yadav.sneha	2026-04-07 21:28:42.191316+00
1340	2026-03-14	24	99000	bank	\N	yadav.sneha | Sender: yadav.sneha	2026-04-07 21:28:42.192191+00
1354	2026-04-06	24	109080	bank	\N	shri balaji hospitality | Sender: shri balaji hospitality	2026-04-07 21:28:42.207259+00
1374	2025-08-23	53	130400	bank	\N	JAISWAL BUILDING MATERIAL | Sender: JAISWAL BUILDING MATERIAL	2026-04-07 21:28:42.231912+00
1375	2025-08-29	53	250000	bank	\N	JAISWAL BUILDING MATERIAL | Sender: JAISWAL BUILDING MATERIAL	2026-04-07 21:28:42.233033+00
1376	2025-09-01	53	40000	bank	\N	JAISWAL BUILDING MATERIAL | Sender: JAISWAL BUILDING MATERIAL	2026-04-07 21:28:42.234227+00
1377	2025-09-04	53	50000	bank	\N	JAISWAL BUILDING MATERIAL | Sender: JAISWAL BUILDING MATERIAL	2026-04-07 21:28:42.235432+00
1378	2025-09-04	53	100000	bank	\N	JAISWAL BUILDING MATERIAL | Sender: JAISWAL BUILDING MATERIAL	2026-04-07 21:28:42.236696+00
1379	2025-09-05	53	100000	bank	\N	JAISWAL BUILDING MATERIA | Sender: JAISWAL BUILDING MATERIA	2026-04-07 21:28:42.23779+00
1380	2025-09-10	53	45400	bank	\N	JAISWAL BUILDING MATERIAL | Sender: JAISWAL BUILDING MATERIAL	2026-04-07 21:28:42.2388+00
1381	2025-09-10	53	90000	bank	\N	ARADHYA TRADERS | Sender: ARADHYA TRADERS	2026-04-07 21:28:42.239596+00
1387	2025-09-03	111	192560	bank	\N	TIRUPATI INTERPRISE | Sender: TIRUPATI INTERPRISE	2026-04-07 21:28:42.249398+00
1388	2025-09-04	111	200000	bank	\N	TIRUPATI INTERPRISE | Sender: TIRUPATI INTERPRISE	2026-04-07 21:28:42.250598+00
1390	2025-09-10	111	50000	bank	\N	shubhas | Sender: shubhas	2026-04-07 21:28:42.253077+00
1391	2025-09-11	111	106500	bank	\N	MAA SHITLA ENTERPRISES | Sender: MAA SHITLA ENTERPRISES	2026-04-07 21:28:42.254152+00
1392	2025-09-11	111	69000	bank	\N	TRANFER | Sender: TRANFER	2026-04-07 21:28:42.255229+00
1394	2025-09-14	111	10000	bank	\N	TRTR/525712136621 | Sender: TRTR/525712136621	2026-04-07 21:28:42.257022+00
1395	2025-09-15	111	35500	bank	\N	MAA SHITLA ENTERPRISES | Sender: MAA SHITLA ENTERPRISES	2026-04-07 21:28:42.257857+00
1396	2025-09-15	111	33000	bank	\N	ANCHAL SONKAR | Sender: ANCHAL SONKAR	2026-04-07 21:28:42.258976+00
1397	2025-09-16	111	50000	bank	\N	AADYA ENTERPRISES | Sender: AADYA ENTERPRISES	2026-04-07 21:28:42.260056+00
1398	2025-09-18	111	81600	bank	\N	RIRIDDHI SIDDHI ENTERPRISES | Sender: RIRIDDHI SIDDHI ENTERPRISES	2026-04-07 21:28:42.261196+00
1402	2025-09-29	111	92300	bank	\N	MAA SHITLA ENTERPRISES | Sender: MAA SHITLA ENTERPRISES	2026-04-07 21:28:42.265698+00
1403	2025-10-03	111	150000	bank	\N	ASHISH BUILDERS | Sender: ASHISH BUILDERS	2026-04-07 21:28:42.267155+00
1404	2025-10-03	111	31000	bank	\N	TO TRANSFER | Sender: TO TRANSFER	2026-04-07 21:28:42.268333+00
1405	2025-10-04	111	50000	bank	\N	Vinod Kumar | Sender: Vinod Kumar	2026-04-07 21:28:42.269837+00
1408	2025-10-06	111	155000	bank	\N	RIRIDDHI SIDDHI ENTERPRISES | Sender: RIRIDDHI SIDDHI ENTERPRISES	2026-04-07 21:28:42.273024+00
1414	2025-10-16	111	25000	bank	\N	Mukesh Kumar | Sender: Mukesh Kumar	2026-04-07 21:28:42.277945+00
1422	2025-11-03	111	59000	bank	\N	ASTHA ENTERLOCKING | Sender: ASTHA ENTERLOCKING	2026-04-07 21:28:42.286253+00
1430	2025-12-21	111	25000	bank	\N	mukesh | Sender: mukesh	2026-04-07 21:28:42.29534+00
1450	2026-03-16	111	230400	bank	\N	AASTHA CONSTRUCTION CO | Sender: AASTHA CONSTRUCTION CO	2026-04-07 21:28:42.318723+00
1451	2026-03-16	111	171000	bank	\N	ASTHA TRADERS | Sender: ASTHA TRADERS	2026-04-07 21:28:42.320173+00
1454	2025-09-16	174	49000	bank	\N	AS ENT | Sender: AS ENT	2026-04-07 21:28:42.325211+00
1460	2025-09-06	135	1	bank	\N	ANKIT ENTERPRIS | Sender: ANKIT ENTERPRIS	2026-04-07 21:28:42.333709+00
1461	2025-09-06	135	1	bank	\N	MADHURI SINGH | Sender: MADHURI SINGH	2026-04-07 21:28:42.334901+00
1462	2025-09-07	135	4200	bank	\N	VIRENDRA K | Sender: VIRENDRA K	2026-04-07 21:28:42.336142+00
1463	2025-09-07	135	209320	bank	\N	VIRENDRA K | Sender: VIRENDRA K	2026-04-07 21:28:42.337338+00
1464	2025-09-07	135	1	bank	\N	HIMANSHU | Sender: HIMANSHU	2026-04-07 21:28:42.338538+00
1465	2025-09-10	135	50000	bank	\N	ANUBHAV | Sender: ANUBHAV	2026-04-07 21:28:42.33961+00
1466	2025-09-10	135	46000	bank	\N	ANUBHAV | Sender: ANUBHAV	2026-04-07 21:28:42.340713+00
1467	2025-09-11	135	1	bank	\N	HIMANSHU | Sender: HIMANSHU	2026-04-07 21:28:42.341966+00
1468	2025-09-11	135	1	bank	\N	MADHURI SINGH | Sender: MADHURI SINGH	2026-04-07 21:28:42.343004+00
1469	2025-09-11	135	1	bank	\N	MADHURI SINGH | Sender: MADHURI SINGH	2026-04-07 21:28:42.344117+00
1470	2025-09-11	135	1	bank	\N	MADHURI SINGH | Sender: MADHURI SINGH	2026-04-07 21:28:42.345245+00
1471	2025-09-11	135	1	bank	\N	MADHURI SINGH | Sender: MADHURI SINGH	2026-04-07 21:28:42.346189+00
1472	2025-09-11	135	1	bank	\N	MADHURI SINGH | Sender: MADHURI SINGH	2026-04-07 21:28:42.347382+00
1473	2025-09-11	135	50000	bank	\N	MADHURI SINGH | Sender: MADHURI SINGH	2026-04-07 21:28:42.348516+00
1474	2025-09-11	135	40000	bank	\N	MADHURI SINGH | Sender: MADHURI SINGH	2026-04-07 21:28:42.349385+00
1549	2025-11-19	60	30000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.43193+00
1550	2025-11-26	60	14000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.433027+00
1551	2025-12-04	60	20000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.434172+00
1552	2025-12-11	60	10000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.435413+00
1553	2025-12-15	60	20000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.436488+00
1554	2025-12-22	60	20000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.437641+00
1555	2025-12-27	60	15000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.438542+00
1556	2026-01-02	60	15000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.439305+00
1557	2026-01-10	60	15000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.440463+00
1558	2026-01-17	60	20000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.441207+00
1559	2026-01-24	60	15000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.441952+00
1560	2026-02-05	60	15000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.44267+00
1561	2026-02-19	60	15000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.443553+00
1562	2026-03-10	60	15000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.444638+00
1563	2026-03-23	60	40000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.445848+00
1564	2026-03-27	60	30000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.446988+00
1565	2026-04-01	60	30000	bank	\N	PHOOLMATI TRADERS | Sender: PHOOLMATI TRADERS	2026-04-07 21:28:42.448257+00
1566	2025-09-11	27	60000	bank	\N	CHANDRAWAL KRIPA SERVICES | Sender: CHANDRAWAL KRIPA SERVICES	2026-04-07 21:28:42.449462+00
1567	2025-10-17	27	45000	bank	\N	CHANDRAWAL KRIPA SERVICES | Sender: CHANDRAWAL KRIPA SERVICES	2026-04-07 21:28:42.450497+00
1568	2025-10-24	27	45000	bank	\N	CHANDRAWAL KRIPA SERVICES | Sender: CHANDRAWAL KRIPA SERVICES	2026-04-07 21:28:42.451504+00
1569	2025-10-28	27	45000	bank	\N	CHANDRAWAL KRIPA SERVICES | Sender: CHANDRAWAL KRIPA SERVICES	2026-04-07 21:28:42.452759+00
1576	2025-09-13	73	167400	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.460545+00
1578	2025-09-25	73	87000	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.462552+00
1579	2025-10-08	73	110200	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.463885+00
1580	2025-10-11	73	50001	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.464939+00
1581	2025-10-14	73	150000	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.466007+00
1582	2025-10-15	73	170400	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.46716+00
1583	2025-10-24	73	160200	bank	\N	PUNJAB CEMENT AGENCY | Sender: PUNJAB CEMENT AGENCY	2026-04-07 21:28:42.468409+00
1597	2025-09-30	124	116000	bank	\N	verma cement | Sender: verma cement	2026-04-07 21:28:42.484422+00
1598	2025-10-27	124	146000	bank	\N	verma cement | Sender: verma cement	2026-04-07 21:28:42.485721+00
1599	2025-12-19	124	100000	bank	\N	verma cement | Sender: verma cement	2026-04-07 21:28:42.486856+00
1600	2026-03-30	124	250000	bank	\N	verma cement agency | Sender: verma cement agency	2026-04-07 21:28:42.487992+00
1603	2025-08-28	15	204000	bank	\N	SHYAM EAT UDYOG | Sender: SHYAM EAT UDYOG	2026-04-07 21:28:42.494299+00
1604	2025-09-02	15	201000	bank	\N	SUDHAKAR MISHRA | Sender: SUDHAKAR MISHRA	2026-04-07 21:28:42.495261+00
1605	2025-09-04	15	101100	bank	\N	SHRI HANUMAN SHARAN SINGH | Sender: SHRI HANUMAN SHARAN SINGH	2026-04-07 21:28:42.496352+00
1606	2025-09-06	15	110000	bank	\N	ASHUTOSH MISHRA | Sender: ASHUTOSH MISHRA	2026-04-07 21:28:42.497548+00
1607	2025-09-06	15	70000	bank	\N	ANKIT ENTERPRIS | Sender: ANKIT ENTERPRIS	2026-04-07 21:28:42.498506+00
1608	2025-09-08	15	101500	bank	\N	ADARSH TRADING COMPANY | Sender: ADARSH TRADING COMPANY	2026-04-07 21:28:42.499599+00
1609	2025-09-08	15	127200	bank	\N	KESARWANI STEEL AND SANITAR | Sender: KESARWANI STEEL AND SANITAR	2026-04-07 21:28:42.500749+00
1613	2025-09-18	15	40000	bank	\N	SANDEEP KUMAR | Sender: SANDEEP KUMAR	2026-04-07 21:28:42.505025+00
1614	2025-09-24	15	1500	bank	\N	SANDEEP KUMAR | Sender: SANDEEP KUMAR	2026-04-07 21:28:42.506162+00
1769	2025-09-15	71	24000	bank	\N	UPI/525822716906/17:52:11/UPI/ns1640346@okaxis/UP | Sender: UPI/525822716906/17:52:11/UPI/ns1640346@okaxis/UP	2026-04-07 21:28:42.678254+00
1771	2025-09-16	71	191100	bank	\N	-MS KASHMI ENTERPRISES | Sender: -MS KASHMI ENTERPRISES	2026-04-07 21:28:42.680175+00
1772	2025-09-19	71	53960	bank	\N	ASHWANI SRIVASTAV | Sender: ASHWANI SRIVASTAV	2026-04-07 21:28:42.681348+00
1773	2025-09-29	71	100000	bank	\N	BAJRANG TRADERS | Sender: BAJRANG TRADERS	2026-04-07 21:28:42.682155+00
1775	2025-10-15	71	60800	bank	\N	BAJRANG TRADERS | Sender: BAJRANG TRADERS	2026-04-07 21:28:42.684081+00
1776	2025-10-16	71	166200	bank	\N	SHIV ENTERPRISES | Sender: SHIV ENTERPRISES	2026-04-07 21:28:42.685292+00
1784	2025-11-24	71	70000	bank	\N	VIJAY LAKSHMI TRADERS | Sender: VIJAY LAKSHMI TRADERS	2026-04-07 21:28:42.694336+00
1785	2025-11-24	71	30000	bank	\N	HIMANSHU | Sender: HIMANSHU	2026-04-07 21:28:42.695731+00
1786	2025-11-24	71	127000	bank	\N	BHARAT ENTERPRISES | Sender: BHARAT ENTERPRISES	2026-04-07 21:28:42.697079+00
1789	2025-12-05	71	40000	bank	\N	BHARAT ENTERPRISES | Sender: BHARAT ENTERPRISES	2026-04-07 21:28:42.700792+00
1792	2025-12-12	71	60600	bank	\N	BHARAT ENTERPRISES | Sender: BHARAT ENTERPRISES	2026-04-07 21:28:42.704266+00
1804	2025-12-30	71	200000	bank	\N	MS KASHMI ENTERPRIS | Sender: MS KASHMI ENTERPRIS	2026-04-07 21:28:42.71739+00
1806	2025-01-12	71	39500	bank	\N	BHARAT ENTERPRISES | Sender: BHARAT ENTERPRISES	2026-04-07 21:28:42.719817+00
1834	2025-11-27	91	5	bank	\N	CIVILLIA ENGINEERS INDIA PRIVATE | Sender: CIVILLIA ENGINEERS INDIA PRIVATE	2026-04-07 21:28:42.753539+00
1835	2025-11-27	91	162000	bank	\N	CIVILLIA ENGINEERS INDIA PRIVATE | Sender: CIVILLIA ENGINEERS INDIA PRIVATE	2026-04-07 21:28:42.754941+00
1879	2025-09-23	63	30000	bank	\N	ADITYA ENTERPRISES | Sender: ADITYA ENTERPRISES	2026-04-07 21:28:42.815224+00
1880	2025-09-29	63	30000	bank	\N	ADITYA ENTERPRISES | Sender: ADITYA ENTERPRISES	2026-04-07 21:28:42.816418+00
1881	2025-10-29	63	50000	bank	\N	ADITYA ENTERPRISES | Sender: ADITYA ENTERPRISES	2026-04-07 21:28:42.817926+00
1882	2025-12-01	63	40000	bank	\N	ADITYA ENTERPRISES | Sender: ADITYA ENTERPRISES	2026-04-07 21:28:42.819455+00
1883	2026-01-01	63	200000	bank	\N	REETA YADAV | Sender: REETA YADAV	2026-04-07 21:28:42.820658+00
1884	2026-01-09	63	50000	bank	\N	ADITYA ENTERPRISES | Sender: ADITYA ENTERPRISES	2026-04-07 21:28:42.821719+00
1885	2026-01-16	63	144600	bank	\N	ADITYA ENTERPRISES | Sender: ADITYA ENTERPRISES	2026-04-07 21:28:42.822663+00
1904	2025-08-23	30	50000	bank	\N	BANDHU PIPE UDYOG. | Sender: BANDHU PIPE UDYOG.	2026-04-07 21:28:42.846264+00
1905	2025-08-30	30	60000	bank	\N	BANDHU PIPE UDYOG. | Sender: BANDHU PIPE UDYOG.	2026-04-07 21:28:42.847406+00
1906	2025-09-08	30	50000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.848568+00
1907	2025-09-12	30	100000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.84968+00
1908	2025-09-19	30	75000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.850663+00
1909	2025-09-26	30	100000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.851921+00
1910	2025-09-04	30	50000	bank	\N	DEEN BANDHU INDUSTRIES | Sender: DEEN BANDHU INDUSTRIES	2026-04-07 21:28:42.853038+00
1911	2025-09-11	30	100000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.85425+00
1912	2025-09-18	30	60000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.855379+00
1914	2025-11-05	30	50000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.857534+00
1915	2025-11-08	30	50000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.858654+00
1917	2025-11-10	30	50000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.861043+00
1918	2025-11-15	30	50000	bank	\N	DEEN BANDHU INDUSTRIES | Sender: DEEN BANDHU INDUSTRIES	2026-04-07 21:28:42.862+00
1919	2025-11-15	30	50000	bank	\N	BANDHU PIPE | Sender: BANDHU PIPE	2026-04-07 21:28:42.862846+00
1920	2025-11-21	30	50000	bank	\N	DEEN BANDHU INDUSTRIES | Sender: DEEN BANDHU INDUSTRIES	2026-04-07 21:28:42.863675+00
1921	2025-11-27	30	50000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.864914+00
1922	2025-12-07	30	50000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.865959+00
1923	2025-12-16	30	65000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.866786+00
1924	2025-12-24	30	50000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.868011+00
1925	2026-01-03	30	75000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.869208+00
1926	2026-01-09	30	100000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.870333+00
1927	2026-01-13	30	75000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.871738+00
1928	2026-01-20	30	100000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.873155+00
1929	2026-01-24	30	75000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.874725+00
1930	2026-01-29	30	75000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.876191+00
1931	2026-02-03	30	50000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.877301+00
1932	2026-02-10	30	50000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.878193+00
1933	2026-02-13	30	75000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.879239+00
1934	2026-02-19	30	100000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.880152+00
1935	2026-02-21	30	100000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.881079+00
1936	2026-03-02	30	100000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.881964+00
1937	2026-03-14	30	100000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.883064+00
1939	2026-03-28	30	100000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.885385+00
1940	2026-03-31	30	100000	bank	\N	BANDHU PIPE UDYOG | Sender: BANDHU PIPE UDYOG	2026-04-07 21:28:42.886587+00
2166	2025-10-03	136	90000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.141338+00
2167	2025-10-06	136	30000	bank	\N	ANURAG SINGH | Sender: ANURAG SINGH	2026-04-07 21:28:43.142382+00
2168	2025-10-06	136	35000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.143404+00
2170	2025-10-08	136	195000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.1461+00
2171	2025-10-14	136	40000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.147205+00
2173	2025-10-16	136	60000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.149165+00
2174	2025-11-10	136	10000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.15026+00
2175	2025-11-12	136	10000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.151033+00
2177	2025-11-15	136	10000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.153419+00
2178	2025-12-14	136	189000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.154466+00
2180	2025-12-23	136	100000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.156666+00
2181	2025-12-24	136	130000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.157432+00
2182	2025-12-24	136	22000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.15821+00
2183	2025-12-24	136	10000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.158976+00
2184	2025-12-27	136	14000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.159716+00
2185	2025-12-27	136	3497	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.160516+00
2191	2026-01-10	136	50000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.165923+00
2193	2026-01-27	136	162500	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.167392+00
2194	2026-01-27	136	53000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.168239+00
2195	2026-01-28	136	170000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.169087+00
2196	2026-01-28	136	99000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.170301+00
2197	2026-01-28	136	20000	bank	\N	anurag | Sender: anurag	2026-04-07 21:28:43.171532+00
2198	2026-01-29	136	20000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.172527+00
2199	2026-02-01	136	69000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.173606+00
2200	2026-02-01	136	35000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.174766+00
2201	2026-02-03	136	30000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.175902+00
2202	2026-02-03	136	10000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.177061+00
2203	2026-02-07	136	50000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.177799+00
2204	2026-02-08	136	223000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.178531+00
2205	2026-02-11	136	78000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.179326+00
2206	2026-02-20	136	59000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.18046+00
2207	2026-02-23	136	80000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.181649+00
2208	2026-02-26	136	190000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.18274+00
2209	2026-02-26	136	10000	bank	\N	paid RTO | Sender: paid RTO	2026-04-07 21:28:43.183886+00
2210	2026-03-05	136	7000	bank	\N	anurag | Sender: anurag	2026-04-07 21:28:43.185053+00
2211	2026-03-07	136	180000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.186321+00
2212	2026-03-07	136	75000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.187624+00
2213	2026-03-08	136	45000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.188752+00
2214	2026-03-10	136	25000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.189587+00
2215	2026-03-11	136	70000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.191017+00
2216	2026-03-11	136	50000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.19209+00
2217	2026-03-11	136	38000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.193136+00
2218	2026-03-13	136	21000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.194517+00
2219	2026-03-14	136	10000	bank	\N	anurag singh | Sender: anurag singh	2026-04-07 21:28:43.195359+00
2221	2026-03-18	136	100000	bank	\N	anurag singh | Sender: anurag singh	2026-04-07 21:28:43.19736+00
2225	2026-03-27	136	60000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.20121+00
2228	2026-04-04	136	165540	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.203987+00
2229	2026-04-06	136	36000	bank	\N	VIKAS IND | Sender: VIKAS IND	2026-04-07 21:28:43.205088+00
2234	2025-09-05	100	70000	bank	\N	SHIVAM INTERLOCKING | Sender: SHIVAM INTERLOCKING	2026-04-07 21:28:43.209541+00
2235	2025-09-12	100	34000	bank	\N	SHIV PRATAP | Sender: SHIV PRATAP	2026-04-07 21:28:43.210292+00
2236	2025-09-19	100	98000	bank	\N	SHIVAM INTERLOCKING | Sender: SHIVAM INTERLOCKING	2026-04-07 21:28:43.211109+00
2237	2025-09-20	100	2000	bank	\N	SHIVAM INTERLOCKING | Sender: SHIVAM INTERLOCKING	2026-04-07 21:28:43.211882+00
2238	2025-10-10	100	40000	bank	\N	SHIV PRATAP | Sender: SHIV PRATAP	2026-04-07 21:28:43.212997+00
2239	2025-11-08	100	40000	bank	\N	SANDEEP SINGH | Sender: SANDEEP SINGH	2026-04-07 21:28:43.214161+00
2240	2025-11-29	100	100000	bank	\N	SHIVAM INTERLOCKING BRICKS | Sender: SHIVAM INTERLOCKING BRICKS	2026-04-07 21:28:43.215254+00
2241	2026-03-30	100	210000	bank	\N	SHIVAM INTERLOCKING | Sender: SHIVAM INTERLOCKING	2026-04-07 21:28:43.215967+00
2245	2025-10-08	39	192960	bank	\N	Sender: satish chandra pandey	2026-04-07 21:28:43.223756+00
2246	2025-10-09	39	42000	bank	\N	Sender: vimalaconstructionc	2026-04-07 21:28:43.224842+00
2247	2025-10-10	39	194400	bank	\N	Sender: B L CONSTRUCTION	2026-04-07 21:28:43.225958+00
2267	2025-10-08	177	24000	bank	\N	VASIF ALI | Sender: VASIF ALI	2026-04-07 21:28:43.248314+00
2268	2025-10-08	177	50000	bank	\N	VASIF ALI | Sender: VASIF ALI	2026-04-07 21:28:43.249391+00
2269	2025-10-11	177	40000	bank	\N	VASIF ALI | Sender: VASIF ALI	2026-04-07 21:28:43.250161+00
2270	2025-11-01	177	150000	bank	\N	JAMEELA BANO | Sender: JAMEELA BANO	2026-04-07 21:28:43.251361+00
2271	2025-12-12	177	19950	bank	\N	JAMEELA BANO | Sender: JAMEELA BANO	2026-04-07 21:28:43.252573+00
2274	2025-12-24	177	40000	bank	\N	VASIF ALI | Sender: VASIF ALI	2026-04-07 21:28:43.255955+00
2276	2026-02-22	177	25000	bank	\N	Sender: freight 21rs	2026-04-07 21:28:43.25796+00
2277	2026-02-24	177	100000	bank	\N	JAMEELA BANO | Sender: JAMEELA BANO	2026-04-07 21:28:43.258723+00
2279	2026-03-16	177	100000	bank	\N	JAMEELA BANO | Sender: JAMEELA BANO	2026-04-07 21:28:43.260341+00
2280	2026-03-30	177	50000	bank	\N	VASIF ALI | Sender: VASIF ALI	2026-04-07 21:28:43.261647+00
2281	2025-10-07	132	84000	bank	\N	SANGAM CEMENT WALL COMPANY | Sender: SANGAM CEMENT WALL COMPANY	2026-04-07 21:28:43.262961+00
2291	2025-12-17	132	170000	bank	\N	M S SANGAM CEMENT ARTICLE | Sender: M S SANGAM CEMENT ARTICLE	2026-04-07 21:28:43.273679+00
2292	2025-12-18	132	71000	bank	\N	M S SANGAM CEMENT ARTICLE | Sender: M S SANGAM CEMENT ARTICLE	2026-04-07 21:28:43.274444+00
2293	2026-01-02	132	100000	bank	\N	M S SANGAM CEMENT ARTICLE | Sender: M S SANGAM CEMENT ARTICLE	2026-04-07 21:28:43.275198+00
2296	2025-10-16	113	38875	bank	\N	KRISHNA TR | Sender: KRISHNA TR	2026-04-07 21:28:43.278071+00
2306	2025-10-24	12	100000	bank	\N	Nirbhay singh | Sender: Nirbhay singh	2026-04-07 21:28:43.288976+00
2307	2025-10-24	12	19000	bank	\N	Nirbhay singh | Sender: Nirbhay singh	2026-04-07 21:28:43.289914+00
2308	2025-11-19	12	51000	bank	\N	Nirbhay singh | Sender: Nirbhay singh	2026-04-07 21:28:43.290668+00
2309	2025-11-25	12	51000	bank	\N	Nirbhay singh | Sender: Nirbhay singh	2026-04-07 21:28:43.291436+00
2337	2025-11-05	66	107900	bank	\N	MISHRA AND | Sender: MISHRA AND	2026-04-07 21:28:43.323227+00
2338	2025-11-06	66	83100	bank	\N	MISHRA AND | Sender: MISHRA AND	2026-04-07 21:28:43.324354+00
2339	2025-11-06	66	24800	bank	\N	MISHRA AND | Sender: MISHRA AND	2026-04-07 21:28:43.325507+00
2342	2025-10-25	56	76000	bank	\N	Sender: 175100	2026-04-07 21:28:43.328919+00
2347	2025-10-22	89	23000	bank	\N	ritesh patel | Sender: ritesh patel	2026-04-07 21:28:43.333721+00
2350	2025-11-02	75	100000	bank	\N	PRASANT SINGH | Sender: PRASANT SINGH	2026-04-07 21:28:43.337006+00
2351	2025-11-03	75	200000	bank	\N	JAI MATA D | Sender: JAI MATA D	2026-04-07 21:28:43.337805+00
2352	2025-11-05	75	78000	bank	\N	JAI MATA D | Sender: JAI MATA D	2026-04-07 21:28:43.338901+00
2353	2025-11-13	61	50000	bank	\N	BALA JI TRADERS | Sender: BALA JI TRADERS	2026-04-07 21:28:43.339911+00
2354	2025-11-15	61	150000	bank	\N	BALA JI TRADERS | Sender: BALA JI TRADERS	2026-04-07 21:28:43.340945+00
2355	2025-12-16	61	1	bank	\N	BALA JI TRADERS | Sender: BALA JI TRADERS	2026-04-07 21:28:43.341989+00
2356	2025-12-17	61	49999	bank	\N	BALA JI TRADERS | Sender: BALA JI TRADERS	2026-04-07 21:28:43.343079+00
2357	2025-12-18	61	150000	bank	\N	BALA JI TRADERS | Sender: BALA JI TRADERS	2026-04-07 21:28:43.3443+00
2358	2026-01-13	61	200000	bank	\N	BALA JI TRADERS | Sender: BALA JI TRADERS	2026-04-07 21:28:43.345713+00
2359	2026-01-21	61	150000	bank	\N	BALA JI TRADERS | Sender: BALA JI TRADERS	2026-04-07 21:28:43.347023+00
2360	2026-01-31	61	50000	bank	\N	BALA JI TRADERS | Sender: BALA JI TRADERS	2026-04-07 21:28:43.348466+00
2361	2025-11-21	62	69000	bank	\N	JAY HANUMA | Sender: JAY HANUMA	2026-04-07 21:28:43.350194+00
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchases (id, date, supplier_name, brand_id, cement_type, bags, purchase_rate, godown_id, truck_number, source_location, remarks, created_at, invoice_number) FROM stdin;
1	2025-08-31	SAGARMATHA	12	OPC	840	296	\N	\N	Nepal	\N	2026-04-07 21:28:43.699535+00	\N
2	2025-09-01	SHREE CEMENT	2	PPC	700	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.710183+00	\N
3	2025-09-01	ULTRATECH	9	DAMAGE	600	135	\N	\N	SHAHAGANJ	\N	2026-04-07 21:28:43.71403+00	\N
4	2025-09-01	SHREE CEMENT	2	PPC	720	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.71676+00	\N
5	2025-09-02	SHREE CEMENT	2	PPC	700	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.719412+00	\N
6	2025-09-02	J.K CEMNET	4	PPC	840	315	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:43.721844+00	\N
7	2025-09-02	SHREE CEMENT	2	PPC	200	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.724254+00	\N
8	2025-09-02	SHREE CEMENT	2	PPC	700	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.726873+00	\N
9	2025-09-02	ULTRATECH	9	DAMAGE	300	135	\N	\N	SULTANPUR	\N	2026-04-07 21:28:43.729033+00	\N
10	2025-09-02	SHREE CEMENT	2	PPC	700	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.733155+00	\N
11	2025-09-02	BIRLA CEMENT	6	PPC	680	305	\N	\N	SATNA	\N	2026-04-07 21:28:43.735931+00	\N
12	2025-09-02	BIRLA CEMENT	6	PPC	800	240	\N	\N	SATNA	\N	2026-04-07 21:28:43.738211+00	\N
13	2025-09-02	Sagarmatha	12	OPC	840	297	\N	\N	NEPAL	\N	2026-04-07 21:28:43.74047+00	\N
14	2025-09-02	Sagarmatha	12	OPC	840	297	\N	\N	NEPAL	\N	2026-04-07 21:28:43.742651+00	\N
15	2025-09-03	NEERAJ GUPTA	16	PPC	500	305	\N	\N	KANPUR	\N	2026-04-07 21:28:43.744529+00	\N
16	2025-09-03	NEERAJ GUPTA	16	PPC	500	310	\N	\N	KANPUR	\N	2026-04-07 21:28:43.74682+00	\N
17	2025-09-03	BIRLA CEMENT	6	PPC	840	245	\N	\N	SATNA	\N	2026-04-07 21:28:43.748978+00	\N
18	2025-09-03	BIRLA CEMENT	6	PPC	840	245	\N	\N	SATNA	\N	2026-04-07 21:28:43.751256+00	\N
19	2025-09-04	BIRLA CEMENT	6	PPC	1000	118	\N	\N	HARDOI	\N	2026-04-07 21:28:43.753708+00	\N
20	2025-09-04	SHREE CEMENT	2	PPC	500	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.756133+00	\N
21	2025-09-04	SHREE CEMENT	2	PPC	700	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.759456+00	\N
22	2025-09-04	SHREE CEMENT	2	PPC	700	285	\N	\N	ETTA	\N	2026-04-07 21:28:43.761062+00	\N
23	2025-09-04	ULTRATECH	9	DAMAGE	633	135	\N	\N	JAUNPUR ULTRATECH	\N	2026-04-07 21:28:43.763023+00	\N
24	2025-09-04	SAGARMATHA	12	OPC	640	297	\N	\N	NEPAL	\N	2026-04-07 21:28:43.764818+00	\N
25	2025-09-05	BRILA CEMENT	6	PPC	700	245	\N	\N	SATNA	\N	2026-04-07 21:28:43.766328+00	\N
26	2025-09-05	BRILA CEMENT	6	PPC	840	245	\N	\N	SATNA	\N	2026-04-07 21:28:43.769121+00	\N
27	2025-09-05	BRILA CEMENT	6	PPC	700	245	\N	\N	SATNA	\N	2026-04-07 21:28:43.771142+00	\N
28	2025-09-05	ULTRATECH	8	PPC	600	285	\N	\N	RAIBAREILLY	\N	2026-04-07 21:28:43.773141+00	\N
29	2025-09-05	ANANT SINGH	4	PPC	200	295	\N	\N	SULTANPUR	\N	2026-04-07 21:28:43.774971+00	\N
30	2025-09-06	SHREE CEMENT	2	PPC	690	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.776925+00	\N
31	2025-09-06	SHREE CEMENT	2	PPC	700	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.779176+00	\N
32	2025-09-06	PINTU	7	OPC	700	335	\N	\N	SULTANPUR	\N	2026-04-07 21:28:43.781315+00	\N
33	2025-09-06	ULTRATECH	8	PPC	600	285	\N	\N	RAIBAREILLY	\N	2026-04-07 21:28:43.783855+00	\N
34	2025-09-07	MAURYA ENTERPRISES	16	PPC	200	305	\N	\N	LUCKNOW	\N	2026-04-07 21:28:43.78624+00	\N
35	2025-09-07	KUMAR BUILDERS	18	PPC	250	275	\N	\N	LUCKNOW	\N	2026-04-07 21:28:43.7881+00	\N
36	2025-09-07	ULTRATECH	9	DAMAGE	550	145	\N	?	BANDA	\N	2026-04-07 21:28:43.790376+00	\N
37	2025-09-08	BRIJESH SINGH	22	OTHER	65	310	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:43.791988+00	\N
38	2025-09-08	KUMAR BUILDERS	18	PPC	200	275	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:43.794188+00	\N
39	2025-09-08	SHREE CEMENT	2	PPC	600	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.796441+00	\N
40	2025-09-08	SHREE CEMENT	2	PPC	600	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.798853+00	\N
41	2025-09-08	SHREE CEMENT	2	PPC	700	315	\N	\N	ETTA	\N	2026-04-07 21:28:43.800837+00	\N
42	2025-09-08	BIRLA CEMENT	6	PPC	300	245	\N	\N	SATNA	\N	2026-04-07 21:28:43.802979+00	\N
43	2025-09-08	BIRLA CEMENT	6	PPC	400	245	\N	\N	SATNA	\N	2026-04-07 21:28:43.805083+00	\N
44	2025-09-08	ULTRATECH	9	DAMAGE	540	145	\N	\N	BANDA	\N	2026-04-07 21:28:43.806927+00	\N
45	2025-09-08	ULTRATECH	9	DAMAGE	550	145	\N	\N	BANDA	\N	2026-04-07 21:28:43.808896+00	\N
46	2025-09-08	TANSEN	10	OPC	600	251	\N	\N	NEPAL	\N	2026-04-07 21:28:43.81113+00	\N
47	2025-09-09	TANSEN	10	OPC	840	277	\N	\N	NEPAL	\N	2026-04-07 21:28:43.813141+00	\N
48	2025-09-09	ULTRATECH	9	DAMAGE	800	132	\N	\N	SULTANPUR	\N	2026-04-07 21:28:43.815436+00	\N
49	2025-09-09	MAURYA ENTERPRISES	16	PPC	200	305	\N	\N	LUCKNOW	\N	2026-04-07 21:28:43.81775+00	\N
50	2025-09-10	ULTRATECH	9	DAMAGE	800	132	\N	\N	SULTANPUR	\N	2026-04-07 21:28:43.819971+00	\N
51	2025-09-10	ULTRATECH	9	DAMAGE	300	132	\N	\N	SULTANPUR	\N	2026-04-07 21:28:43.822195+00	\N
52	2025-09-10	ULTRATECH	9	DAMAGE	1000	132	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:43.82549+00	\N
53	2025-09-10	SHREE CEMENT	2	PPC	700	310	\N	\N	ETTA	\N	2026-04-07 21:28:43.827986+00	\N
54	2025-09-10	JK CEMENT	4	PPC	700	308	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:43.83107+00	\N
55	2025-09-11	GAURAV JAISWAL	4	PPC	840	325	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:43.833418+00	\N
56	2025-09-11	GAURAV JAISWAL	8	PPC	600	285	\N	\N	TANDA	\N	2026-04-07 21:28:43.836298+00	\N
57	2025-09-11	ULTRATECH	9	DAMAGE	400	132	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:43.838851+00	\N
58	2025-09-11	ULTRATECH	9	DAMAGE	300	132	\N	\N	GAURIGANJ	\N	2026-04-07 21:28:43.841113+00	\N
59	2025-09-11	ULTRATECH	8	PPC	600	285	\N	\N	RAEBARELI	\N	2026-04-07 21:28:43.842822+00	\N
60	2025-09-11	SHREE CEMENT	2	PPC	675	310	\N	\N	ETTA	\N	2026-04-07 21:28:43.844854+00	\N
61	2025-09-11	BRIJESH SINGH	2	PPC	200	295	\N	\N	LUCKNOW	\N	2026-04-07 21:28:43.846809+00	\N
62	2025-09-12	GAURAV JAISWAL	15	PPC	818	310	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:43.849134+00	\N
63	2025-09-12	GAURAV JAISWAL	4	PPC	720	325	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:43.851399+00	\N
64	2025-09-12	NEERAJ GUPTA	16	PPC	500	305	\N	\N	KANPUR	\N	2026-04-07 21:28:43.853943+00	\N
65	2025-09-12	ULTRATECH	9	DAMAGE	500	145	\N	\N	BANDA	\N	2026-04-07 21:28:43.856061+00	\N
66	2025-09-12	ULTRATECH	8	PPC	540	285	\N	\N	RAEBARELI	\N	2026-04-07 21:28:43.858336+00	\N
67	2025-09-12	ULTRATECH	8	PPC	540	285	\N	\N	RAEBARELI	\N	2026-04-07 21:28:43.860693+00	\N
68	2025-09-12	ULTRATECH	8	PPC	600	285	\N	\N	RAEBARELI	\N	2026-04-07 21:28:43.86298+00	\N
69	2025-09-12	SAGARMATHA	12	OPC	840	230	\N	\N	NEPAL	\N	2026-04-07 21:28:43.86452+00	\N
70	2025-09-12	SAGARMATHA	12	OPC	840	230	\N	\N	NEPAL	\N	2026-04-07 21:28:43.866384+00	\N
71	2025-09-13	VRINDAVAN	2	PPC	350	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.867895+00	\N
72	2025-09-13	VRINDAVAN	2	PPC	250	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.87038+00	\N
73	2025-09-13	VRINDAVAN	2	PPC	300	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.872503+00	\N
74	2025-09-13	VRINDAVAN	2	PPC	700	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.874769+00	\N
75	2025-09-13	VRINDAVAN	2	PPC	700	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.876255+00	\N
76	2025-09-13	VRINDAVAN	2	PPC	840	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.877846+00	\N
77	2025-09-13	BIRLA CEMENT	6	PPC	820	240	\N	\N	SATNA	\N	2026-04-07 21:28:43.880136+00	\N
78	2025-09-13	NEERAJ GUPTA	16	PPC	498	305	\N	\N	KANPUR	\N	2026-04-07 21:28:43.882081+00	\N
79	2025-09-15	ULTRATECH	9	DAMAGE	600	145	\N	\N	BANDA	\N	2026-04-07 21:28:43.884622+00	\N
80	2025-09-16	VRINDAVAN	2	PPC	700	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.887667+00	\N
81	2025-09-16	VRINDAVAN	2	PPC	700	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.890023+00	\N
82	2025-09-16	VRINDAVAN	2	PPC	700	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.891635+00	\N
83	2025-09-16	VRINDAVAN	2	PPC	700	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.893698+00	\N
84	2025-09-16	GAURAV JAISWAL	2	PPC	710	300	\N	400	ETTA	\N	2026-04-07 21:28:43.895989+00	\N
85	2025-09-16	GAURAV JAISWAL	2	PPC	700	305	\N	\N	ETTA	\N	2026-04-07 21:28:43.899131+00	\N
86	2025-09-16	GAURAV JAISWAL	2	PPC	600	265	\N	\N	ETTA	\N	2026-04-07 21:28:43.901557+00	\N
87	2025-09-16	TANSEN	10	OPC	840	281	\N	\N	NEPAL	\N	2026-04-07 21:28:43.903715+00	\N
88	2025-09-17	BIRLA CEMENT	6	PPC	840	240	\N	\N	SATNA	\N	2026-04-07 21:28:43.905862+00	\N
89	2025-09-17	BIRLA CEMENT	6	PPC	840	240	\N	\N	SATNA	\N	2026-04-07 21:28:43.908131+00	\N
90	2025-09-17	ULTRATECH	9	DAMAGE	700	135	\N	\N	JAUNPUR ULTRATECH	\N	2026-04-07 21:28:43.910069+00	\N
91	2025-09-17	RAJNISH MISHRA	7	OPC	600	325	\N	\N	SULTANPUR	\N	2026-04-07 21:28:43.912099+00	\N
92	2025-09-18	PINTU	8	PPC	200	280	\N	\N	SULTANPUR	\N	2026-04-07 21:28:43.914297+00	\N
93	2025-09-18	ULTRATECH	9	DAMAGE	800	132	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:43.916346+00	\N
94	2025-09-18	ULTRATECH	9	DAMAGE	800	132	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:43.918747+00	\N
95	2025-09-19	ULTRATECH	9	DAMAGE	800	132	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:43.92123+00	\N
96	2025-09-19	BIRLA CEMENT	6	PPC	700	240	\N	\N	SATNA	\N	2026-04-07 21:28:43.923204+00	\N
97	2025-09-19	BIRLA CEMENT	6	PPC	840	240	\N	\N	SATNA	\N	2026-04-07 21:28:43.925025+00	\N
98	2025-09-19	BRIJESH SINGH	2	PPC	200	290	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:43.926969+00	\N
99	2025-09-19	BRIJESH SINGH	2	PPC	200	270	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:43.929258+00	\N
100	2025-09-19	VRINDAVAN	2	PPC	700	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.931444+00	\N
101	2025-09-19	VRINDAVAN	2	PPC	700	294	\N	\N	ETTA	\N	2026-04-07 21:28:43.93355+00	\N
102	2025-09-19	GAURAV JAISWAL	4	PPC	720	275	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:43.935591+00	\N
103	2025-09-20	ULTRATECH	8	PPC	600	255	\N	\N	RAEBARELI	\N	2026-04-07 21:28:43.938715+00	\N
104	2025-09-20	ULTRATECH	8	PPC	600	255	\N	\N	RAEBARELI	\N	2026-04-07 21:28:43.941337+00	\N
105	2025-09-21	ULTRATECH	9	DAMAGE	1080	132	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:43.943599+00	\N
106	2025-09-22	BIRLA CEMENT	6	PPC	1250	118	\N	\N	HARDOI	\N	2026-04-07 21:28:43.945716+00	\N
107	2025-09-22	TANSEN	10	OPC	840	196	\N	\N	NEPAL	\N	2026-04-07 21:28:43.948059+00	\N
108	2025-09-22	SAGARMATHA	12	OPC	500	230	\N	\N	NEPAL	\N	2026-04-07 21:28:43.950211+00	\N
109	2025-09-22	SAGARMATHA	12	OPC	700	230	\N	\N	NEPAL	\N	2026-04-07 21:28:43.952218+00	\N
110	2025-09-23	ULTRATECH	9	DAMAGE	400	121	\N	\N	GAURIGANJ	\N	2026-04-07 21:28:43.954707+00	\N
111	2025-09-24	ULTRATECH	9	DAMAGE	379	121	\N	\N	SULTANPUR	\N	2026-04-07 21:28:43.956927+00	\N
112	2025-09-24	VRINDAVAN	4	PPC	700	250	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:43.95913+00	\N
113	2025-09-24	VRINDAVAN	4	PPC	700	250	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:43.961119+00	\N
114	2025-09-24	SHREE CEMENT	2	PPC	720	269	\N	\N	ETTA	\N	2026-04-07 21:28:43.963436+00	\N
115	2025-09-24	SHREE CEMENT	2	PPC	720	269	\N	\N	ETTA	\N	2026-04-07 21:28:43.965694+00	\N
116	2025-09-24	SHREE CEMENT	2	PPC	720	269	\N	\N	ETTA	\N	2026-04-07 21:28:43.967954+00	\N
117	2025-09-24	VRINDAVAN	2	PPC	700	269	\N	\N	ETTA	\N	2026-04-07 21:28:43.970313+00	\N
118	2025-09-24	VRINDAVAN	2	PPC	1000	269	\N	\N	ETTA	\N	2026-04-07 21:28:43.97249+00	\N
119	2025-09-24	VRINDAVAN	2	PPC	620	269	\N	\N	ETTA	\N	2026-04-07 21:28:43.974716+00	\N
120	2025-09-24	VRINDAVAN	2	PPC	1000	269	\N	\N	ETTA	\N	2026-04-07 21:28:43.976714+00	\N
121	2025-09-24	VRINDAVAN	2	PPC	720	269	\N	\N	ETTA	\N	2026-04-07 21:28:43.978946+00	\N
122	2025-09-24	BIRLA CEMENT	6	PPC	840	221	\N	\N	SATNA	\N	2026-04-07 21:28:43.980929+00	\N
123	2025-09-24	BIRLA CEMENT	6	PPC	840	221	\N	\N	SATNA	\N	2026-04-07 21:28:43.983284+00	\N
124	2025-09-24	BIRLA CEMENT	6	PPC	840	221	\N	\N	SATNA	\N	2026-04-07 21:28:43.985149+00	\N
125	2025-09-25	TANSEN	10	OPC	850	215	\N	\N	NEPAL	\N	2026-04-07 21:28:43.987299+00	\N
126	2025-06-25	TANSEN	10	OPC	700	196	\N	\N	NEPAL	\N	2026-04-07 21:28:43.989384+00	\N
127	2025-09-25	SAGARMATHA	12	OPC	840	230	\N	\N	NEPAL	\N	2026-04-07 21:28:43.992267+00	\N
128	2025-09-25	KUMAR BUILDERS	18	PPC	250	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:43.995538+00	\N
129	2025-09-25	VRINDAVAN	2	PPC	800	269	\N	\N	ETTA	\N	2026-04-07 21:28:43.997586+00	\N
130	2025-09-26	TANSEN	10	OPC	1000	215	\N	\N	NEPAL	\N	2026-04-07 21:28:43.999724+00	\N
131	2025-09-27	PINTU	7	OPC	500	290	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.001997+00	\N
132	2025-09-27	PINTU	8	PPC	200	270	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.004308+00	\N
133	2025-09-28	BIRLA CEMENT	6	PPC	840	221	\N	\N	SATNA	\N	2026-04-07 21:28:44.006464+00	\N
134	2025-09-28	SHREE CEMENT	2	PPC	720	249	\N	\N	ETTA	\N	2026-04-07 21:28:44.008752+00	\N
135	2025-09-28	TANSEN	10	OPC	840	190	\N	\N	NEPAL	\N	2026-04-07 21:28:44.010934+00	\N
136	2025-09-28	GAURAV JAISWAL	2	PPC	720	229	\N	\N	ETTA	\N	2026-04-07 21:28:44.012923+00	\N
137	2025-09-29	SHREE CEMENT	2	PPC	720	249	\N	\N	ETTA	\N	2026-04-07 21:28:44.015998+00	\N
138	2025-09-30	SHREE CEMENT	2	PPC	700	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.018302+00	\N
139	2025-09-30	SHREE CEMENT	2	PPC	720	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.020623+00	\N
140	2025-09-30	SHREE CEMENT	2	PPC	720	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.022776+00	\N
141	2025-09-30	VRINDAVAN	2	PPC	1200	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.024978+00	\N
142	2025-09-30	VRINDAVAN	2	PPC	600	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.026463+00	\N
143	2025-09-30	VRINDAVAN	2	PPC	720	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.028023+00	\N
144	2025-09-30	VRINDAVAN	2	PPC	640	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.029481+00	\N
145	2025-09-30	GAURAV JAISWAL	2	PPC	700	266	\N	\N	ETTA	\N	2026-04-07 21:28:44.030273+00	\N
146	2025-09-30	VRINDAVAN	2	PPC	600	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.031795+00	\N
147	2025-09-30	VRINDAVAN	2	PPC	700	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.033784+00	\N
148	2025-09-30	ULTRATECH	8	PPC	600	255	\N	\N	RAEBARELI	\N	2026-04-07 21:28:44.036242+00	\N
149	2025-09-30	VRINDAVAN	2	PPC	620	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.038756+00	\N
150	2025-09-30	VRINDAVAN	4	PPC	720	250	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:44.041178+00	\N
151	2025-09-30	TANSEN	10	OPC	840	215	\N	\N	NEPAL	\N	2026-04-07 21:28:44.043666+00	\N
152	2025-09-30	TANSEN	10	OPC	840	215	\N	\N	NEPAL	\N	2026-04-07 21:28:44.045874+00	\N
153	2025-09-30	BIRLA CEMENT	6	PPC	700	221	\N	\N	SATNA	\N	2026-04-07 21:28:44.048115+00	\N
154	2025-09-30	BIRLA CEMENT	6	PPC	700	221	\N	\N	SATNA	\N	2026-04-07 21:28:44.050463+00	\N
155	2025-09-30	BIRLA CEMENT	6	PPC	840	221	\N	\N	SATNA	\N	2026-04-07 21:28:44.05232+00	\N
156	2025-10-01	GAURAV JAISWAL	8	PPC	500	242	\N	\N	GONDA	\N	2026-04-07 21:28:44.060651+00	\N
157	2025-10-01	GAURAV JAISWAL	2	PPC	860	219	\N	\N	ETTA	\N	2026-04-07 21:28:44.063096+00	\N
158	2025-10-01	GAURAV JAISWAL	2	PPC	900	219	\N	\N	ETTA	\N	2026-04-07 21:28:44.065281+00	\N
159	2025-10-01	SHREE CEMENT	2	PPC	720	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.067558+00	\N
160	2025-10-01	SHREE CEMENT	2	PPC	620	245	\N	\N	ETTA	\N	2026-04-07 21:28:44.069909+00	\N
161	2025-10-02	VRINDAVAN	2	PPC	720	269	\N	\N	ETTA	\N	2026-04-07 21:28:44.072016+00	\N
162	2025-10-02	Gaurav jaiswal	2	PPC	720	242	\N	\N	Etta	\N	2026-04-07 21:28:44.073835+00	\N
163	2025-10-03	GAURAV JAISWAL	2	PPC	840	200	\N	\N	Etta	\N	2026-04-07 21:28:44.075847+00	\N
164	2025-10-03	GAURAV JAISWAL	4	PPC	720	240	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.078102+00	\N
165	2025-10-03	GAURAV JAISWAL	4	PPC	700	255	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.080335+00	\N
166	2025-10-03	BIRLA CEMENT	6	PPC	600	116	\N	\N	HARDOI	\N	2026-04-07 21:28:44.082662+00	\N
167	2025-10-03	GAURAV JAISWAL	4	PPC	700	240	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.084683+00	\N
168	2025-10-04	GAURAV JAISWAL	4	PPC	300	240	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.086951+00	\N
169	2025-10-04	GAURAV JAISWAL	4	PPC	420	240	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.089191+00	\N
170	2025-10-04	GAURAV JAISWAL	4	PPC	840	300	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.09026+00	\N
171	2025-10-04	SHREE CEMENT	2	PPC	640	245	\N	\N	Etta	\N	2026-04-07 21:28:44.092532+00	\N
172	2025-10-04	SHREE CEMENT	2	PPC	720	245	\N	\N	Etta	\N	2026-04-07 21:28:44.094468+00	\N
173	2025-10-04	SHREE CEMENT	2	PPC	720	245	\N	\N	Etta	\N	2026-04-07 21:28:44.09556+00	\N
174	2025-10-04	SHREE CEMENT	2	PPC	700	269	\N	\N	Etta	\N	2026-04-07 21:28:44.097468+00	\N
175	2025-10-04	SHREE CEMENT	2	PPC	700	269	\N	\N	Etta	\N	2026-04-07 21:28:44.099892+00	\N
176	2025-10-04	SHREE CEMENT	2	PPC	700	269	\N	\N	Etta	\N	2026-04-07 21:28:44.102757+00	\N
177	2025-10-04	SHREE CEMENT	2	PPC	900	263	\N	\N	Etta	\N	2026-04-07 21:28:44.105169+00	\N
178	2025-10-04	SHREE CEMENT	2	PPC	700	263	\N	\N	Etta	\N	2026-04-07 21:28:44.107005+00	\N
179	2025-10-04	SHREE CEMENT	2	PPC	700	263	\N	\N	Etta	\N	2026-04-07 21:28:44.108942+00	\N
180	2025-10-04	SHREE CEMENT	2	PPC	720	263	\N	\N	Etta	\N	2026-04-07 21:28:44.111226+00	\N
181	2025-10-04	SHREE CEMENT	2	PPC	600	263	\N	\N	Etta	\N	2026-04-07 21:28:44.113138+00	\N
182	2025-10-04	TANSEN	10	OPC	500	215	\N	\N	NEPAL	\N	2026-04-07 21:28:44.115343+00	\N
183	2025-10-04	TANSEN	10	OPC	350	190	\N	\N	NEPAL	\N	2026-04-07 21:28:44.117519+00	\N
184	2025-10-04	TANSEN	10	OPC	1000	190	\N	\N	NEPAL	\N	2026-04-07 21:28:44.119756+00	\N
185	2025-10-04	TANSEN	10	OPC	860	215	\N	\N	NEPAL	\N	2026-04-07 21:28:44.122007+00	\N
186	2025-10-04	TANSEN	10	OPC	490	196	\N	\N	NEPAL	\N	2026-04-07 21:28:44.124163+00	\N
187	2025-10-04	TANSEN	10	OPC	350	190	\N	\N	NEPAL	\N	2026-04-07 21:28:44.126119+00	\N
188	2025-10-04	GAURAV JAISWAL	2	PPC	720	240	\N	\N	Etta	\N	2026-04-07 21:28:44.128037+00	\N
189	2025-10-06	BIRLA CEMENT	6	PPC	380	116	\N	\N	HARDOI	\N	2026-04-07 21:28:44.130394+00	\N
190	2025-10-06	SHREE CEMENT	1	OPC	720	263	\N	\N	Etta	\N	2026-04-07 21:28:44.132393+00	\N
191	2025-10-06	SHREE CEMENT	1	OPC	720	263	\N	\N	Etta	\N	2026-04-07 21:28:44.134172+00	\N
192	2025-10-06	SHREE CEMENT	1	OPC	740	269	\N	\N	Etta	\N	2026-04-07 21:28:44.136052+00	\N
193	2025-10-06	SHREE CEMENT	1	OPC	600	263	\N	\N	Etta	\N	2026-04-07 21:28:44.138044+00	\N
194	2025-10-07	KUMAR BUILDERS	18	PPC	250	255	\N	\N	LUCKNOW	\N	2026-04-07 21:28:44.140255+00	\N
195	2025-10-07	SHREE CEMENT	2	PPC	500	263	\N	\N	Etta	\N	2026-04-07 21:28:44.141763+00	\N
196	2025-10-07	SHREE CEMENT	2	PPC	200	263	\N	\N	Etta	\N	2026-04-07 21:28:44.143274+00	\N
197	2025-10-07	SHREE CEMENT	2	PPC	700	245	\N	\N	Etta	\N	2026-04-07 21:28:44.143981+00	\N
198	2025-10-07	SHREE CEMENT	2	PPC	840	263	\N	\N	Etta	\N	2026-04-07 21:28:44.145951+00	\N
199	2025-10-07	TANSEN	10	OPC	840	215	\N	\N	NEPAL	\N	2026-04-07 21:28:44.148317+00	\N
200	2025-10-08	SUBHAM RAEBARELI	8	PPC	700	230	\N	\N	RAEBARELI	\N	2026-04-07 21:28:44.151063+00	\N
201	2025-10-08	SUBHAM RAEBARELI	8	PPC	700	230	\N	\N	RAEBARELI	\N	2026-04-07 21:28:44.153812+00	\N
202	2025-10-08	ULTRATECH	8	PPC	600	255	\N	\N	RAEBARELI	\N	2026-04-07 21:28:44.15607+00	\N
203	2025-10-08	SAGARMATHA	12	OPC	840	230	\N	\N	NEPAL	\N	2026-04-07 21:28:44.158286+00	\N
204	2025-10-08	SHREE CEMENT	2	PPC	700	245	\N	\N	Etta	\N	2026-04-07 21:28:44.160462+00	\N
205	2025-10-08	SHREE CEMENT	2	PPC	700	263	\N	\N	Etta	\N	2026-04-07 21:28:44.162817+00	\N
206	2025-10-08	JK CEMENT	4	PPC	700	280	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.165035+00	\N
207	2025-10-08	JK CEMENT	4	PPC	800	285	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.167374+00	\N
208	2025-10-08	SHREE CEMENT	2	PPC	720	269	\N	\N	Etta	\N	2026-04-07 21:28:44.169577+00	\N
209	2025-10-08	HV CEMENT	19	OPC	600	220	\N	\N	PHOOLPUR	\N	2026-04-07 21:28:44.171938+00	\N
210	2025-10-09	SHREE CEMENT	2	PPC	620	269	\N	\N	Etta	\N	2026-04-07 21:28:44.174095+00	\N
211	2025-10-09	SHREE CEMENT	2	PPC	620	263	\N	\N	Etta	\N	2026-04-07 21:28:44.176153+00	\N
212	2025-10-09	SHREE CEMENT	2	PPC	720	263	\N	\N	Etta	\N	2026-04-07 21:28:44.178196+00	\N
213	2025-10-10	SHREE CEMENT	2	PPC	700	263	\N	\N	Etta	\N	2026-04-07 21:28:44.1803+00	\N
214	2025-10-10	SHREE CEMENT	2	PPC	740	240	\N	\N	Etta	\N	2026-04-07 21:28:44.182178+00	\N
215	2025-10-11	SHREE CEMENT	2	PPC	700	263	\N	\N	Etta	\N	2026-04-07 21:28:44.183409+00	\N
216	2025-10-10	JK CEMENT	4	PPC	700	235	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.185629+00	\N
217	2025-10-10	JK CEMENT	4	PPC	700	235	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.186723+00	\N
218	2025-10-10	SAMARA ENTERPRISES	22	OTHER	640	275	\N	\N	AMETHI	\N	2026-04-07 21:28:44.188985+00	\N
219	2025-10-10	BIRLA CEMENT	6	PPC	700	210	\N	\N	MAIHAR	\N	2026-04-07 21:28:44.191399+00	\N
220	2025-10-10	BIRLA CEMENT	6	PPC	840	210	\N	\N	MAIHAR	\N	2026-04-07 21:28:44.193551+00	\N
221	2025-10-10	NEERAJ GUPTA	16	PPC	500	280	\N	\N	KANPUR	\N	2026-04-07 21:28:44.195914+00	\N
222	2025-10-11	TANSEN	10	OPC	200	190	\N	\N	NEPAL	\N	2026-04-07 21:28:44.197883+00	\N
223	2025-10-11	TANSEN	10	OPC	200	196	\N	\N	NEPAL	\N	2026-04-07 21:28:44.199997+00	\N
224	2025-10-11	TANSEN	10	OPC	440	215	\N	\N	NEPAL	\N	2026-04-07 21:28:44.202039+00	\N
225	2025-10-13	ULTRATECH	8	PPC	600	255	\N	\N	RAEBARELI	\N	2026-04-07 21:28:44.204759+00	\N
226	2025-10-13	SHREE CEMENT	2	PPC	680	245	\N	\N	Etta	\N	2026-04-07 21:28:44.207373+00	\N
227	2025-10-13	JK CEMENT	4	PPC	700	235	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.209639+00	\N
228	2025-10-13	JK CEMENT	4	PPC	700	250	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.211919+00	\N
229	2025-10-13	SHREE CEMENT	2	PPC	700	263	\N	\N	Etta	\N	2026-04-07 21:28:44.214232+00	\N
230	2025-10-14	ULTRATECH	8	PPC	600	254	\N	\N	RAEBARELI	\N	2026-04-07 21:28:44.215394+00	\N
231	2025-10-14	ULTRATECH	8	PPC	600	254	\N	\N	RAEBARELI	\N	2026-04-07 21:28:44.217635+00	\N
232	2025-10-14	ULTRATECH	8	PPC	600	254	\N	\N	RAEBARELI	\N	2026-04-07 21:28:44.219894+00	\N
233	2025-10-14	GAURAV JAISWAL	2	PPC	720	220	\N	\N	Etta	\N	2026-04-07 21:28:44.221893+00	\N
234	2025-10-15	SAGARMATHA	12	OPC	600	230	\N	\N	NEPAL	\N	2026-04-07 21:28:44.224145+00	\N
235	2025-10-15	SHREE CEMENT	2	PPC	700	263	\N	\N	Etta	\N	2026-04-07 21:28:44.226493+00	\N
236	2025-10-15	NEERAJ GUPTA	16	PPC	500	280	\N	\N	KANPUR	\N	2026-04-07 21:28:44.22869+00	\N
237	2025-10-15	ULTRATECH	9	DAMAGE	800	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.231127+00	\N
238	2025-10-15	ULTRATECH	9	DAMAGE	550	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.233345+00	\N
239	2025-10-15	ULTRATECH	9	DAMAGE	1400	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.235593+00	\N
240	2025-10-15	BIRLA CEMENT	6	PPC	700	215	\N	\N	SATNA	\N	2026-04-07 21:28:44.237819+00	\N
241	2025-10-15	BIRLA CEMENT	6	PPC	700	215	\N	\N	SATNA	\N	2026-04-07 21:28:44.240018+00	\N
242	2025-10-16	SHREE CEMENT	2	PPC	700	263	\N	\N	Etta	\N	2026-04-07 21:28:44.242359+00	\N
243	2025-10-16	SHREE CEMENT	2	PPC	700	245	\N	\N	Etta	\N	2026-04-07 21:28:44.244537+00	\N
244	2025-10-16	BIRLA CEMENT	6	PPC	840	215	\N	\N	SATNA	\N	2026-04-07 21:28:44.246044+00	\N
245	2025-10-16	TANSEN	10	OPC	600	196	\N	\N	NEPAL	\N	2026-04-07 21:28:44.248429+00	\N
246	2025-10-16	TANSEN	10	OPC	600	215	\N	\N	NEPAL	\N	2026-04-07 21:28:44.250584+00	\N
247	2025-10-18	BIRLA CEMENT	6	PPC	840	215	\N	\N	SATNA	\N	2026-04-07 21:28:44.252968+00	\N
248	2025-10-18	SHREE CEMENT	2	PPC	720	245	\N	\N	Etta	\N	2026-04-07 21:28:44.25513+00	\N
249	2025-10-18	SHREE CEMENT	2	PPC	700	263	\N	\N	Etta	\N	2026-04-07 21:28:44.256281+00	\N
250	2025-10-18	SHREE CEMENT	2	PPC	720	263	\N	\N	Etta	\N	2026-04-07 21:28:44.258888+00	\N
251	2025-10-18	SHREE CEMENT	2	PPC	720	245	\N	\N	Etta	\N	2026-04-07 21:28:44.261789+00	\N
252	2025-10-18	SHREE CEMENT	2	PPC	600	263	\N	\N	Etta	\N	2026-04-07 21:28:44.267254+00	\N
253	2025-10-18	SHREE CEMENT	2	PPC	600	245	\N	\N	Etta	\N	2026-04-07 21:28:44.26929+00	\N
254	2025-10-18	ULTRATECH	8	PPC	600	253	\N	\N	RAEBARELI	\N	2026-04-07 21:28:44.271621+00	\N
255	2025-10-18	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.273881+00	\N
256	2025-10-18	ULTRATECH	9	DAMAGE	530	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.276109+00	\N
257	2025-10-18	ULTRATECH	9	DAMAGE	630	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.278309+00	\N
258	2025-10-18	ULTRATECH	9	DAMAGE	500	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.28033+00	\N
259	2025-10-18	TANSEN	10	OPC	840	190	\N	\N	NEPAL	\N	2026-04-07 21:28:44.282337+00	\N
260	2025-10-24	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.284679+00	\N
261	2025-10-24	ULTRATECH	9	DAMAGE	500	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.28668+00	\N
262	2025-10-24	ULTRATECH	9	DAMAGE	700	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.289008+00	\N
263	2025-10-24	ULTRATECH	9	DAMAGE	700	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.291235+00	\N
264	2025-10-24	ULTRATECH	9	DAMAGE	700	105	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.293742+00	\N
265	2025-10-25	ULTRATECH	9	DAMAGE	660	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.295774+00	\N
266	2025-10-25	ULTRATECH	9	DAMAGE	800	105	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.297742+00	\N
267	2025-10-25	NEERAJ GUPTA	16	PPC	500	275	\N	\N	KANPUR	\N	2026-04-07 21:28:44.300121+00	\N
268	2025-10-25	SHREE CEMENT	2	PPC	700	270	\N	\N	Etta	\N	2026-04-07 21:28:44.3024+00	\N
269	2025-10-25	SHREE CEMENT	2	PPC	700	275	\N	\N	ETTA	\N	2026-04-07 21:28:44.304527+00	\N
270	2025-10-25	SHREE CEMENT	2	PPC	620	275	\N	\N	ETTA	\N	2026-04-07 21:28:44.30648+00	\N
271	2025-10-26	SAGARMATHA	12	OPC	700	230	\N	\N	NEPAL	\N	2026-04-07 21:28:44.308391+00	\N
272	2025-10-26	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.310265+00	\N
273	2025-10-26	ULTRATECH	9	DAMAGE	520	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.312647+00	\N
274	2025-10-26	RAJNISH MISHRA	7	OPC	600	285	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.315111+00	\N
275	2025-10-26	VRINDAVAN	2	PPC	640	250	\N	\N	LUCKNOW	\N	2026-04-07 21:28:44.317714+00	\N
276	2025-10-27	ULTRATECH	9	DAMAGE	700	105	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.320235+00	\N
277	2025-10-27	SHREE CEMENT	2	PPC	740	240	\N	\N	ETTA	\N	2026-04-07 21:28:44.322512+00	\N
278	2025-10-27	SHREE CEMENT	2	PPC	620	240	\N	\N	ETTA	\N	2026-04-07 21:28:44.324165+00	\N
279	2025-10-28	NEERAJ GUPTA	16	PPC	500	275	\N	\N	KANPUR	\N	2026-04-07 21:28:44.32609+00	\N
280	2025-10-28	ULTRATECH	9	DAMAGE	800	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:44.328335+00	\N
281	2025-10-28	BIRLA CEMENT	6	PPC	840	215	\N	\N	SATNA	\N	2026-04-07 21:28:44.33028+00	\N
282	2025-10-28	BIRLA CEMENT	6	PPC	840	215	\N	\N	SATNA	\N	2026-04-07 21:28:44.332654+00	\N
283	2025-10-28	BIRLA CEMENT	6	PPC	700	215	\N	\N	SATNA	\N	2026-04-07 21:28:44.334836+00	\N
284	2025-10-28	SHREE CEMENT	2	PPC	700	272	\N	\N	ETTA	\N	2026-04-07 21:28:44.337125+00	\N
285	2025-10-28	SHREE CEMENT	2	PPC	700	272	\N	\N	ETTA	\N	2026-04-07 21:28:44.339034+00	\N
286	2025-10-28	SHREE CEMENT	2	PPC	620	272	\N	\N	ETTA	\N	2026-04-07 21:28:44.341276+00	\N
287	2025-10-28	SHREE CEMENT	2	PPC	700	275	\N	\N	ETTA	\N	2026-04-07 21:28:44.343636+00	\N
288	2025-10-28	SHREE CEMENT	2	PPC	600	240	\N	\N	ETTA	\N	2026-04-07 21:28:44.3456+00	\N
289	2025-10-28	TANSEN	10	OPC	700	190	\N	\N	NEPAL	\N	2026-04-07 21:28:44.347506+00	\N
290	2025-10-28	ULTRATECH	9	DAMAGE	550	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.349566+00	\N
291	2025-10-28	ULTRATECH	9	DAMAGE	600	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:44.351547+00	\N
292	2025-10-28	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.353634+00	\N
293	2025-10-28	ULTRATECH	9	DAMAGE	520	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.355611+00	\N
294	2025-10-28	ULTRATECH	9	DAMAGE	670	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.357934+00	\N
295	2025-10-28	ULTRATECH	9	DAMAGE	700	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.360265+00	\N
296	2025-10-29	ULTRATECH	9	DAMAGE	620	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.362197+00	\N
297	2025-10-29	TANSEN	10	OPC	840	196	\N	\N	NEPAL	\N	2026-04-07 21:28:44.36419+00	\N
298	2025-10-29	TANSEN	10	OPC	840	190	\N	\N	NEPAL	\N	2026-04-07 21:28:44.366742+00	\N
299	2025-10-29	TANSEN	10	OPC	700	215	\N	\N	NEPAL	\N	2026-04-07 21:28:44.369513+00	\N
300	2025-10-29	SHREE CEMENT	2	PPC	700	267	\N	\N	ETTA	\N	2026-04-07 21:28:44.371811+00	\N
301	2025-10-29	SHREE CEMENT	2	PPC	700	272	\N	\N	ETTA	\N	2026-04-07 21:28:44.374033+00	\N
302	2025-10-29	SHREE CEMENT	2	PPC	700	272	\N	\N	ETTA	\N	2026-04-07 21:28:44.375975+00	\N
303	2025-10-29	SHREE CEMENT	2	PPC	740	240	\N	\N	ETTA	\N	2026-04-07 21:28:44.378185+00	\N
304	2025-10-30	VRINDAVAN	2	PPC	700	250	\N	\N	ETTA	\N	2026-04-07 21:28:44.380497+00	\N
305	2025-10-30	VRINDAVAN	2	PPC	400	250	\N	\N	ETTA	\N	2026-04-07 21:28:44.38281+00	\N
306	2025-10-31	SHREE CEMENT	2	PPC	700	267	\N	\N	ETTA	\N	2026-04-07 21:28:44.383915+00	\N
307	2025-10-31	SHREE CEMENT	2	PPC	900	270	\N	\N	ETTA	\N	2026-04-07 21:28:44.386171+00	\N
308	2025-10-31	ULTRATECH	9	DAMAGE	620	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.388123+00	\N
309	2025-10-31	ULTRATECH	9	DAMAGE	600	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:44.39047+00	\N
310	2025-10-31	ULTRATECH	9	DAMAGE	700	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:44.392382+00	\N
311	2025-10-31	ULTRATECH	9	DAMAGE	620	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.394573+00	\N
312	2025-12-01	MAHAKAL LLP	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.397941+00	\N
313	2025-12-01	GAURAV JAISWAL	8	PPC	600	235	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:44.399785+00	\N
314	2025-12-02	SHREE CEMENT	2	PPC	700	265	\N	\N	ETTA	\N	2026-04-07 21:28:44.402048+00	\N
315	2025-11-02	SHREE CEMENT	2	PPC	700	265	\N	\N	ETTA	\N	2026-04-07 21:28:44.404299+00	\N
316	2025-12-02	ULTRATECH	9	DAMAGE	800	105	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.406708+00	\N
317	2025-12-02	GAURAV JAISWAL	4	PPC	700	285	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.408613+00	\N
318	2025-12-03	TANSEN	10	OPC	1200	180	\N	\N	NEPAL	\N	2026-04-07 21:28:44.410586+00	\N
319	2025-12-03	SHREE CEMENT	2	PPC	720	265	\N	\N	ETTA	\N	2026-04-07 21:28:44.412957+00	\N
320	2025-12-03	GAURAV JAISWAL	2	PPC	720	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.41514+00	\N
321	2025-12-03	SHREE CEMENT	2	PPC	620	265	\N	\N	ETTA	\N	2026-04-07 21:28:44.41741+00	\N
322	2025-12-04	MAHAKAL LLP	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.41974+00	\N
323	2025-12-04	MAHAKAL LLP	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.421942+00	\N
324	2025-12-04	MAHAKAL LLP	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.423394+00	\N
325	2025-12-04	BIRLA	6	PPC	840	217	\N	\N	SATNA	\N	2026-04-07 21:28:44.425917+00	\N
326	2025-12-04	BIRLA	6	PPC	700	217	\N	\N	SATNA	\N	2026-04-07 21:28:44.428125+00	\N
327	2025-12-04	GAURAV JAISWAL	8	PPC	600	250	\N	\N	TANDA	\N	2026-04-07 21:28:44.430042+00	\N
328	2025-12-05	SHREE CEMENT	2	PPC	700	265	\N	\N	ETTA	\N	2026-04-07 21:28:44.431944+00	\N
329	2025-12-05	TANSEN	10	OPC	800	180	\N	\N	NEPAL	\N	2026-04-07 21:28:44.434218+00	\N
330	2025-12-06	SHREE CEMENT	2	PPC	700	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.436319+00	\N
331	2025-12-06	SHREE CEMENT	2	PPC	620	265	\N	\N	ETTA	\N	2026-04-07 21:28:44.438646+00	\N
332	2025-12-06	SHREE CEMENT	2	PPC	300	265	\N	\N	ETTA	\N	2026-04-07 21:28:44.440656+00	\N
333	2025-12-06	SHREE CEMENT	2	PPC	420	265	\N	\N	ETTA	\N	2026-04-07 21:28:44.442645+00	\N
334	2025-12-07	SHREE CEMENT	2	PPC	600	265	\N	\N	ETTA	\N	2026-04-07 21:28:44.444611+00	\N
335	2025-12-07	MAHAKAL LLP	2	PPC	840	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.446977+00	\N
336	2025-12-08	VRINDAVAN	2	PPC	600	253	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:44.449336+00	\N
337	2025-12-08	VRINDAVAN	2	PPC	600	253	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:44.450354+00	\N
338	2025-12-08	VRINDAVAN	16	PPC	700	250	\N	\N	JHANSI	\N	2026-04-07 21:28:44.451179+00	\N
339	2025-12-08	JK	4	PPC	700	280	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.452451+00	\N
340	2025-12-08	BIRLA	6	PPC	700	217	\N	\N	SATNA	\N	2026-04-07 21:28:44.454624+00	\N
341	2025-12-08	H V CEMENT	19	OPC	600	200	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.457082+00	\N
342	2025-12-09	NEERAJ GUPTA	16	PPC	500	280	\N	\N	KANPUR	\N	2026-04-07 21:28:44.459213+00	\N
343	2025-12-09	GAURAV JAISWAL	8	PPC	600	235	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:44.46149+00	\N
344	2025-12-09	TANSEN	10	OPC	700	210	\N	\N	NEPAL	\N	2026-04-07 21:28:44.463547+00	\N
345	2025-12-10	GAURAV JAISWAL	2	PPC	600	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.465723+00	\N
346	2025-12-10	GAURAV JAISWAL	2	PPC	700	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.468068+00	\N
347	2025-12-10	GAURAV JAISWAL	2	PPC	700	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.471037+00	\N
348	2025-12-10	SHREE CEMENT	2	PPC	700	262	\N	\N	ETTA	\N	2026-04-07 21:28:44.473421+00	\N
349	2025-12-10	SHREE CEMENT	2	PPC	600	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.475747+00	\N
350	2025-12-10	SHREE CEMENT	2	PPC	600	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.477996+00	\N
351	2025-12-10	SHREE CEMENT	2	PPC	600	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.48026+00	\N
352	2025-12-11	VRINDAVAN	4	PPC	700	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:44.482658+00	\N
353	2025-12-11	BIRLA	6	PPC	700	217	\N	\N	SATNA	\N	2026-04-07 21:28:44.483636+00	\N
354	2025-12-12	SHREE CEMENT	2	PPC	600	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.486015+00	\N
355	2025-12-12	SHREE CEMENT	2	PPC	740	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.488209+00	\N
356	2025-12-13	TANSEN	10	OPC	700	186	\N	\N	NEPAL	\N	2026-04-07 21:28:44.490072+00	\N
357	2025-12-13	VRINDAVAN	4	PPC	700	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:44.491972+00	\N
358	2025-12-13	SAGARMATHA	12	OPC	840	230	\N	\N	NEPAL	\N	2026-04-07 21:28:44.493101+00	\N
359	2025-12-14	GAURAV JAISWAL	2	PPC	620	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.495398+00	\N
360	2025-12-14	GAURAV JAISWAL	2	PPC	500	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.497784+00	\N
361	2025-12-14	GAURAV JAISWAL	2	PPC	600	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.499901+00	\N
362	2025-12-14	GAURAV JAISWAL	2	PPC	720	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.502194+00	\N
363	2025-12-14	GAURAV JAISWAL	2	PPC	700	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.504299+00	\N
364	2025-12-14	TANSEN	10	OPC	1000	180	\N	\N	NEPAL	\N	2026-04-07 21:28:44.506593+00	\N
365	2025-12-14	TANSEN	10	OPC	840	186	\N	\N	NEPAL	\N	2026-04-07 21:28:44.508823+00	\N
366	2025-12-14	JK	4	PPC	720	280	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.511163+00	\N
367	2025-12-15	ULTRATECH	8	PPC	700	240	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:44.513743+00	\N
368	2025-12-15	JK	4	PPC	620	280	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.51512+00	\N
369	2025-12-15	VRINDAVAN	4	PPC	700	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:44.517267+00	\N
370	2025-12-15	SHREE CEMENT	2	PPC	720	262	\N	\N	ETTA	\N	2026-04-07 21:28:44.519542+00	\N
371	2025-12-16	TANSEN	10	OPC	840	186	\N	\N	NEPAL	\N	2026-04-07 21:28:44.521621+00	\N
372	2025-12-16	ULTRATECH	8	PPC	600	240	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:44.524084+00	\N
373	2025-12-16	ULTRATECH	8	PPC	600	240	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:44.526878+00	\N
374	2025-12-16	GAURAV JAISWAL	2	PPC	720	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.529118+00	\N
375	2025-12-16	GAURAV JAISWAL	2	PPC	720	228	\N	\N	ETTA	\N	2026-04-07 21:28:44.53134+00	\N
376	2025-12-16	VRINDAVAN	4	PPC	720	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:44.533623+00	\N
377	2025-12-16	BIRLA	6	PPC	840	210	\N	\N	SATNA	\N	2026-04-07 21:28:44.536091+00	\N
378	2025-12-17	JK	4	PPC	700	235	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.538211+00	\N
379	2025-12-17	JK	4	PPC	720	280	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.540498+00	\N
380	2025-12-17	NEERAJ GUPTA	16	PPC	500	275	\N	\N	KANPUR	\N	2026-04-07 21:28:44.542429+00	\N
381	2025-12-17	SHREE CEMENT	2	PPC	600	262	\N	\N	ETTA	\N	2026-04-07 21:28:44.544009+00	\N
382	2025-12-17	SHREE CEMENT	2	PPC	600	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.546226+00	\N
383	2025-12-17	TANSEN	10	OPC	600	186	\N	\N	NEPAL	\N	2026-04-07 21:28:44.548635+00	\N
384	2025-12-17	GAURAV JAISWAL	2	PPC	720	228	\N	\N	ETTA	\N	2026-04-07 21:28:44.550759+00	\N
385	2025-12-18	SHREE CEMENT	2	PPC	600	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.551904+00	\N
386	2025-12-18	SHREE CEMENT	2	PPC	720	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.554115+00	\N
387	2025-12-18	SHREE CEMENT	2	PPC	620	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.556408+00	\N
388	2025-12-18	SAGARMATHA	12	OPC	840	228	\N	\N	NEPAL	\N	2026-04-07 21:28:44.558655+00	\N
389	2025-12-18	SAGARMATHA	12	OPC	840	228	\N	\N	NEPAL	\N	2026-04-07 21:28:44.560668+00	\N
390	2025-12-18	JK	4	PPC	800	235	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.562653+00	\N
391	2025-12-18	SHREE CEMENT	2	PPC	840	262	\N	\N	ETTA	\N	2026-04-07 21:28:44.565062+00	\N
392	2025-12-19	BIRLA	6	PPC	840	210	\N	\N	SATNA	\N	2026-04-07 21:28:44.567283+00	\N
393	2025-12-19	BIRLA	6	PPC	700	210	\N	\N	SATNA	\N	2026-04-07 21:28:44.569546+00	\N
394	2025-12-19	ULTRATECH	8	PPC	600	240	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:44.571886+00	\N
395	2025-12-19	ULTRATECH	8	PPC	390	240	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:44.574157+00	\N
396	2025-12-19	SHREE CEMENT	2	PPC	640	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.576544+00	\N
397	2025-12-20	BIRLA	6	PPC	840	210	\N	\N	SATNA	\N	2026-04-07 21:28:44.578998+00	\N
398	2025-12-20	GAURAV JAISWAL	2	PPC	600	228	\N	\N	ETTA	\N	2026-04-07 21:28:44.5815+00	\N
399	2025-12-20	GAURAV JAISWAL	2	PPC	600	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.583563+00	\N
400	2025-12-20	GAURAV JAISWAL	2	PPC	700	228	\N	\N	ETTA	\N	2026-04-07 21:28:44.5845+00	\N
401	2025-12-20	GAURAV JAISWAL	2	PPC	700	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.586841+00	\N
402	2025-12-20	SHREE CEMENT	2	PPC	600	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.589081+00	\N
403	2025-12-20	SHREE CEMENT	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.591435+00	\N
404	2025-12-20	SHREE CEMENT	2	PPC	600	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.593754+00	\N
405	2025-12-24	GAURAV JAISWAL	2	PPC	600	228	\N	\N	ETTA	\N	2026-04-07 21:28:44.595821+00	\N
406	2025-12-20	TANSEN	10	OPC	540	186	\N	\N	NEPAL	\N	2026-04-07 21:28:44.597767+00	\N
407	2025-12-20	TANSEN	10	OPC	300	210	\N	\N	NEPAL	\N	2026-04-07 21:28:44.601512+00	\N
408	2025-12-21	SHREE CEMENT	2	PPC	600	230	\N	\N	ETTA	\N	2026-04-07 21:28:44.603623+00	\N
409	2025-12-22	TANSEN	10	OPC	700	210	\N	\N	NEPAL	\N	2026-04-07 21:28:44.605885+00	\N
410	2025-12-22	JK	4	PPC	700	260	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.608084+00	\N
411	2025-12-22	SHREE CEMENT	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.61009+00	\N
412	2025-12-23	BIRLA	6	PPC	700	210	\N	\N	SATNA	\N	2026-04-07 21:28:44.61237+00	\N
413	2025-12-23	GAURAV JAISWAL	7	OPC	700	260	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.614746+00	\N
414	2025-12-23	GAURAV JAISWAL	2	PPC	700	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.617078+00	\N
415	2025-12-23	SHREE CEMENT	2	PPC	840	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.619662+00	\N
416	2025-12-24	TANSEN	10	OPC	1200	180	\N	\N	NEPAL	\N	2026-04-07 21:28:44.622335+00	\N
417	2025-12-24	JK	4	PPC	700	260	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.624198+00	\N
418	2025-12-25	SAGARMATHA	12	OPC	840	228	\N	\N	NEPAL	\N	2026-04-07 21:28:44.626511+00	\N
419	2025-12-25	GAURAV JAISWAL	2	PPC	1220	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.628771+00	\N
420	2025-12-25	GAURAV JAISWAL	2	PPC	700	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.6309+00	\N
421	2025-12-25	GAURAV JAISWAL	2	PPC	600	228	\N	\N	ETTA	\N	2026-04-07 21:28:44.633416+00	\N
422	2025-12-25	BIRLA	6	PPC	700	210	\N	\N	SATNA	\N	2026-04-07 21:28:44.635759+00	\N
423	2025-12-25	RP ASSOCIATES	8	PPC	500	250	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.637951+00	\N
424	2025-12-25	RP ASSOCIATES	8	PPC	100	250	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.639836+00	\N
425	2025-12-25	RP ASSOCIATES	7	OPC	700	260	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.641421+00	\N
426	2025-12-25	PINTU SULTANPUR	8	PPC	200	250	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.64325+00	\N
427	2025-12-26	TANSEN	10	OPC	840	186	\N	\N	NEPAL	\N	2026-04-07 21:28:44.644779+00	\N
428	2025-12-27	TANSEN	10	OPC	900	210	\N	\N	NEPAL	\N	2026-04-07 21:28:44.646678+00	\N
429	2025-12-27	SAGARMATHA	12	OPC	840	228	\N	\N	NEPAL	\N	2026-04-07 21:28:44.648327+00	\N
430	2025-12-27	GAURAV JAISWAL	2	PPC	640	208	\N	\N	ETTA	\N	2026-04-07 21:28:44.650322+00	\N
431	2025-12-27	GAURAV JAISWAL	2	PPC	720	208	\N	\N	ETTA	\N	2026-04-07 21:28:44.651943+00	\N
432	2025-12-28	GAURAV JAISWAL	2	PPC	600	228	\N	\N	ETTA	\N	2026-04-07 21:28:44.653774+00	\N
433	2025-12-28	VRINDAVAN	2	PPC	700	238	\N	\N	ETTA	\N	2026-04-07 21:28:44.655578+00	\N
434	2025-12-28	VRINDAVAN	2	PPC	840	238	\N	\N	ETTA	\N	2026-04-07 21:28:44.657173+00	\N
435	2025-11-28	VRINDAVAN	2	PPC	600	238	\N	\N	ETTA	\N	2026-04-07 21:28:44.659063+00	\N
436	2025-12-28	NEERAJ GUPTA	16	PPC	400	275	\N	\N	KANPUR	\N	2026-04-07 21:28:44.661009+00	\N
437	2025-12-28	NEERAJ GUPTA	16	PPC	100	275	\N	\N	KANPUR	\N	2026-04-07 21:28:44.66323+00	\N
438	2025-12-29	RAJNISH MISHRA	8	PPC	600	240	\N	\N	SULTANPUR	\N	2026-04-07 21:28:44.665685+00	\N
439	2025-12-29	SHREE CEMENT	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.667421+00	\N
440	2025-12-29	SHREE CEMENT	2	PPC	840	260	\N	\N	ETTA	\N	2026-04-07 21:28:44.669388+00	\N
441	2025-12-29	SAGARMATHA	12	OPC	600	228	\N	\N	NEPAL	\N	2026-04-07 21:28:44.671349+00	\N
442	2025-12-29	GAURAV JAISWAL	15	PPC	840	284	\N	\N	BIHAR	\N	2026-04-07 21:28:44.672941+00	\N
443	2025-12-29	SOBHIT SINGH	2	PPC	700	255	\N	\N	ETTA	\N	2026-04-07 21:28:44.675209+00	\N
444	2025-12-30	JK	4	PPC	700	260	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.677372+00	\N
445	2025-12-30	VRINDAVAN	4	PPC	700	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:44.680691+00	\N
446	2025-12-30	VRINDAVAN	4	PPC	700	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:44.681579+00	\N
447	2025-12-30	JK	4	PPC	700	260	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.682786+00	\N
448	2025-12-30	BIRLA	6	PPC	840	210	\N	\N	SATNA	\N	2026-04-07 21:28:44.684438+00	\N
449	2025-12-30	BIRLA	6	PPC	700	210	\N	\N	SATNA	\N	2026-04-07 21:28:44.686699+00	\N
450	2025-12-30	GAURAV JAISWAL	2	PPC	1240	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.688434+00	\N
451	2025-12-30	GAURAV JAISWAL	2	PPC	720	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.690444+00	\N
452	2025-12-30	VRINDAVAN	16	PPC	720	250	\N	\N	JHANSI	\N	2026-04-07 21:28:44.691931+00	\N
453	2025-12-30	GAURAV JAISWAL	2	PPC	1240	248	\N	\N	ETTA	\N	2026-04-07 21:28:44.692649+00	\N
454	2026-02-01	SHREE CEMENT	2	PPC	700	250	\N	UP84BT2082	ETTA	\N	2026-04-07 21:28:44.696711+00	\N
455	2026-02-01	SHREE CEMENT	2	PPC	700	270	\N	UP33BT5512	ETTA	\N	2026-04-07 21:28:44.698816+00	\N
456	2026-02-01	SHREE CEMENT	2	PPC	700	240	\N	\N	ETTA	\N	2026-04-07 21:28:44.700937+00	\N
457	2026-02-01	SHREE CEMENT	2	PPC	700	240	\N	UP81DT2035	ETTA	\N	2026-04-07 21:28:44.702832+00	\N
458	2026-02-01	SHREE CEMENT	2	PPC	540	270	\N	UP81DT2035	ETTA	\N	2026-04-07 21:28:44.704792+00	\N
459	2026-02-01	SHREE CEMENT	2	PPC	600	270	\N	\N	ETTA	\N	2026-04-07 21:28:44.706875+00	\N
460	2026-02-03	SHREE CEMENT	2	PPC	1000	240	\N	UP32WN3321	ETTA	\N	2026-04-07 21:28:44.709002+00	\N
461	2026-02-03	SHREE CEMENT	2	PPC	700	240	\N	UP16NT7134	ETTA	\N	2026-04-07 21:28:44.71118+00	\N
462	2026-02-03	SHREE CEMENT	2	PPC	700	240	\N	UP16KT4426	ETTA	\N	2026-04-07 21:28:44.71339+00	\N
463	2026-02-03	SHREE CEMENT	2	PPC	700	270	\N	UP84BT1506	ETTA	\N	2026-04-07 21:28:44.715803+00	\N
464	2026-02-03	SHREE CEMENT	2	PPC	700	270	\N	UP32UN3171	ETTA	\N	2026-04-07 21:28:44.717886+00	\N
465	2026-02-03	SHREE CEMENT	2	PPC	700	240	\N	UP32ZN4904	ETTA	\N	2026-04-07 21:28:44.719843+00	\N
466	2026-02-03	SHREE CEMENT	2	PPC	700	240	\N	UP84BT2083	ETTA	\N	2026-04-07 21:28:44.721741+00	\N
467	2026-02-04	BIRLA	6	PPC	700	230	\N	UP62CT7460	SATNA	\N	2026-04-07 21:28:44.72368+00	\N
468	2026-02-04	BIRLA	6	PPC	700	230	\N	UP62CT2417	SATNA	\N	2026-04-07 21:28:44.725165+00	\N
469	2026-02-04	BIRLA	6	PPC	840	230	\N	MP19HA9972	SATNA	\N	2026-04-07 21:28:44.728013+00	\N
471	2026-02-04	SHREE CEMENT	2	PPC	640	260	\N	UP32JN4971	ETTA	\N	2026-04-07 21:28:44.732655+00	\N
472	2026-02-04	TANSEN	10	OPC	520	210	\N	RJ10GC0587	NEPAL	\N	2026-04-07 21:28:44.734698+00	\N
473	2026-02-04	TANSEN	10	OPC	350	186	\N	RJ10GC0587	NEPAL	\N	2026-04-07 21:28:44.736985+00	\N
474	2026-02-03	TANSEN	10	OPC	840	210	\N	RJ13GC4980	NEPAL	\N	2026-04-07 21:28:44.739229+00	\N
475	2026-02-03	TANSEN	10	OPC	870	210	\N	RJ31GB3363	NEPAL	\N	2026-04-07 21:28:44.741215+00	\N
476	2026-02-05	TANSEN	10	OPC	840	210	\N	UP54T9035	NEPAL	\N	2026-04-07 21:28:44.743155+00	\N
477	2026-02-05	TANSEN	10	OPC	840	186	\N	UP54T8919	NEPAL	\N	2026-04-07 21:28:44.745219+00	\N
478	2026-02-05	TANSEN	10	OPC	840	180	\N	RJ14GJ5185	NEPAL	\N	2026-04-07 21:28:44.747469+00	\N
479	2026-02-03	TANSEN	10	OPC	840	180	\N	RJ52GA3383	NEPAL	\N	2026-04-07 21:28:44.749945+00	\N
480	2026-02-05	PACHERIA GONDA	21	OPC	840	263	\N	UP53GT8473	NEPAL	\N	2026-04-07 21:28:44.751856+00	\N
481	2026-02-06	SAGARMATHA	12	OPC	700	228	\N	UP62CT2727	NEPAL	\N	2026-04-07 21:28:44.754051+00	\N
482	2026-02-06	TANSEN	10	OPC	840	210	\N	UP61AT4187	NEPAL	\N	2026-04-07 21:28:44.756283+00	\N
483	2026-02-06	TANSEN	10	OPC	840	186	\N	RJ14GN8851	NEPAL	\N	2026-04-07 21:28:44.758567+00	\N
484	2026-02-07	TANSEN	10	OPC	860	210	\N	UP53HT9208	NEPAL	\N	2026-04-07 21:28:44.760613+00	\N
485	2026-02-07	TANSEN	10	OPC	850	210	\N	JH14L08010	NEPAL	\N	2026-04-07 21:28:44.762948+00	\N
486	2026-02-07	SHREE CEMENT	2	PPC	720	270	\N	\N	ETTA	\N	2026-04-07 21:28:44.765047+00	\N
487	2026-02-07	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:44.767223+00	\N
488	2026-02-07	SHREE CEMENT	2	PPC	500	240	\N	\N	ETTA	\N	2026-04-07 21:28:44.769221+00	\N
489	2026-02-07	SHREE CEMENT	2	PPC	400	240	\N	\N	ETTA	\N	2026-04-07 21:28:44.771176+00	\N
490	2026-02-07	SHREE CEMENT	2	PPC	720	240	\N	\N	ETTA	\N	2026-04-07 21:28:44.772265+00	\N
491	2026-02-08	TANSEN	10	OPC	300	210	\N	UP65FP5211	NEPAL	\N	2026-04-07 21:28:44.774133+00	\N
492	2026-02-08	TANSEN	10	OPC	300	186	\N	UP65FP5211	NEPAL	\N	2026-04-07 21:28:44.77564+00	\N
493	2026-02-08	TANSEN	10	OPC	640	210	\N	UP65FT1395	NEPAL	\N	2026-04-07 21:28:44.778164+00	\N
494	2026-02-08	TANSEN	10	OPC	700	186	\N	UP25ET1418	NEPAL	\N	2026-04-07 21:28:44.78097+00	\N
495	2026-02-08	TANSEN	10	OPC	300	186	\N	UP50BT5706	NEPAL	\N	2026-04-07 21:28:44.784754+00	\N
496	2026-02-08	TANSEN	10	OPC	300	210	\N	UP50BT5706	NEPAL	\N	2026-04-07 21:28:44.787071+00	\N
497	2026-02-08	TANSEN	10	OPC	1000	180	\N	RJ14GH2618	NEPAL	\N	2026-04-07 21:28:44.789256+00	\N
498	2026-02-08	SHREE CEMENT	2	PPC	700	270	\N	UP72AT3024	ETTA	\N	2026-04-07 21:28:44.791654+00	\N
499	2026-02-08	SHREE CEMENT	2	PPC	800	240	\N	UP32ZN4904	ETTA	\N	2026-04-07 21:28:44.793805+00	\N
500	2026-02-08	Bangur Cemnet	2	PPC	500	275	\N	UP32EN5497	ALAMNAGAR	\N	2026-04-07 21:28:44.795711+00	\N
501	2026-02-08	SHREE CEMENT	2	PPC	600	240	\N	RJ34GB0554	ETTA	\N	2026-04-07 21:28:44.797716+00	\N
502	2026-02-08	Bangur Cemnet	2	PPC	500	275	\N	UP32HN9763	ALAMNAGAR	\N	2026-04-07 21:28:44.800053+00	\N
503	2026-02-08	SHREE CEMENT	2	PPC	700	240	\N	RJ34GB0554	ETTA	\N	2026-04-07 21:28:44.802395+00	\N
504	2026-02-09	TANSEN	10	OPC	840	180	\N	RJ14GN8852	NEPAL	\N	2026-04-07 21:28:44.804465+00	\N
505	2026-02-10	SHREE CEMENT	2	PPC	540	275	\N	UP32HN9763	ALAMNAGAR	\N	2026-04-07 21:28:44.806781+00	\N
506	2026-02-10	SHREE CEMENT	2	PPC	700	275	\N	UP35AT1366	ALAMNAGAR	\N	2026-04-07 21:28:44.808755+00	\N
507	2026-02-10	SHREE CEMENT	2	PPC	840	275	\N	UP32WN3321	ALAMNAGAR	\N	2026-04-07 21:28:44.811135+00	\N
508	2026-02-10	SHREE CEMENT	2	PPC	1000	273	\N	UP32KN1956	ALAMNAGAR	\N	2026-04-07 21:28:44.813333+00	\N
509	2026-02-10	SHREE CEMENT	2	PPC	540	275	\N	UP32EN5497	ALAMNAGAR	\N	2026-04-07 21:28:44.815773+00	\N
510	2026-02-10	SHREE CEMENT	2	PPC	720	275	\N	UP32ZN4904	ALAMNAGAR	\N	2026-04-07 21:28:44.817683+00	\N
511	2026-02-10	TANSEN	10	OPC	820	186	\N	PB05AQ9355	NEPAL	\N	2026-04-07 21:28:44.820004+00	\N
512	2026-02-10	SHREE CEMENT	2	PPC	1100	240	\N	RJ11GC8258	ETTA	\N	2026-04-07 21:28:44.822379+00	\N
513	2026-02-10	SHREE CEMENT	2	PPC	1000	270	\N	UP81FT1408	ETTA	\N	2026-04-07 21:28:44.824398+00	\N
514	2026-02-10	SHREE CEMENT	2	PPC	800	270	\N	UP84BT2083	ETTA	\N	2026-04-07 21:28:44.826484+00	\N
515	2026-02-10	ABHIJEET AGARWAL	8	PPC	649	260	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:44.828743+00	\N
516	2026-02-11	TANSEN	10	OPC	820	180	\N	PB05AR9865	NEPAL	\N	2026-04-07 21:28:44.829649+00	\N
517	2026-02-12	TANSEN	10	OPC	840	210	\N	BR02GD9015	NEPAL	\N	2026-04-07 21:28:44.832255+00	\N
518	2026-02-12	SHREE CEMENT	2	PPC	720	240	\N	UP32QN5071	ETTA	\N	2026-04-07 21:28:44.836309+00	\N
519	2026-02-12	SHREE CEMENT	2	PPC	814.4	295	\N	\N	ETTA	\N	2026-04-07 21:28:44.838844+00	\N
520	2026-02-12	SHREE CEMENT	2	PPC	700	273	\N	UP32FN6083	ALAMNAGAR	\N	2026-04-07 21:28:44.840934+00	\N
521	2026-02-13	SHREE CEMENT	2	PPC	700	273	\N	UP32FN6083	ALAMNAGAR	\N	2026-04-07 21:28:44.842964+00	\N
522	2026-02-13	SHREE CEMENT	2	PPC	700	273	\N	UP32DN4696	ALAMNAGAR	\N	2026-04-07 21:28:44.845188+00	\N
523	2026-02-13	SHREE CEMENT	2	PPC	500	273	\N	UP78AN9031	ALAMNAGAR	\N	2026-04-07 21:28:44.847454+00	\N
524	2026-02-14	SHREE CEMENT	2	PPC	500	279	\N	UP94T8188	ETTA	\N	2026-04-07 21:28:44.849772+00	\N
525	2026-02-14	SHREE CEMENT	2	PPC	700	265	\N	UP32ZN4904	ETTA	\N	2026-04-07 21:28:44.851962+00	\N
526	2026-02-14	TANSEN	10	OPC	600	186	\N	UP40T8913	NEPAL	\N	2026-04-07 21:28:44.854268+00	\N
527	2026-02-15	SOBHIT SINGH	2	PPC	420	265	\N	\N	LUCKNOW	\N	2026-04-07 21:28:44.856193+00	\N
528	2026-02-15	SOBHIT SINGH	2	PPC	400	265	\N	\N	LUCKNOW	\N	2026-04-07 21:28:44.857495+00	\N
529	2026-02-16	BIRLA	6	PPC	840	240	\N	MP19HA9966	SATNA	\N	2026-04-07 21:28:44.859557+00	\N
530	2026-02-16	BIRLA	6	PPC	840	240	\N	MP19HA9972	SATNA	\N	2026-04-07 21:28:44.861862+00	\N
531	2026-02-16	BIRLA	6	PPC	840	240	\N	UP51AT3733	SATNA	\N	2026-04-07 21:28:44.864033+00	\N
532	2026-02-16	SHREE CEMENT	2	PPC	600	270	\N	UP32FN6083	ALAMNAGAR	\N	2026-04-07 21:28:44.866599+00	\N
533	2026-02-16	SHREE CEMENT	2	PPC	400	270	\N	UP32AN9031	ALAMNAGAR	\N	2026-04-07 21:28:44.868866+00	\N
534	2026-02-16	SHREE CEMENT	2	PPC	600	270	\N	UP53BT1777	ALAMNAGAR	\N	2026-04-07 21:28:44.870971+00	\N
535	2026-02-16	SHREE CEMENT	2	PPC	1000	270	\N	UP32KN1956	ALAMNAGAR	\N	2026-04-07 21:28:44.87316+00	\N
536	2026-02-16	SHREE CEMENT	2	PPC	700	265	\N	UP31BT1610	ETTA	\N	2026-04-07 21:28:44.87508+00	\N
537	2026-02-16	SHREE CEMENT	2	PPC	700	295	\N	UP32JN4971	ETTA	\N	2026-04-07 21:28:44.87744+00	\N
538	2026-02-16	SHREE CEMENT	2	PPC	720	270	\N	UP32ZN4904	ALAMNAGAR	\N	2026-04-07 21:28:44.879677+00	\N
539	2026-02-17	SHREE CEMENT	2	PPC	500	270	\N	UP32FN6083	ALAMNAGAR	\N	2026-04-07 21:28:44.882078+00	\N
540	2026-02-17	SHREE CEMENT	2	PPC	600	270	\N	UP53BT1777	ALAMNAGAR	\N	2026-04-07 21:28:44.883245+00	\N
541	2026-02-17	SHREE CEMENT	2	PPC	400	270	\N	UP78AN9031	ALAMNAGAR	\N	2026-04-07 21:28:44.885568+00	\N
542	2026-02-17	Bangur Cemnet	2	PPC	700	270	\N	UP32DN4696	ALAMNAGAR	\N	2026-04-07 21:28:44.888087+00	\N
543	2026-02-17	Bangur Cemnet	2	PPC	600	270	\N	UP78BN2796	ALAMNAGAR	\N	2026-04-07 21:28:44.89035+00	\N
544	2026-02-17	Bangur Cemnet	2	PPC	800	270	\N	UP32ZN4904	ALAMNAGAR	\N	2026-04-07 21:28:44.892719+00	\N
545	2026-02-17	SHREE CEMENT	2	PPC	700	295	\N	UP32SN8171	ETTA	\N	2026-04-07 21:28:44.894913+00	\N
546	2026-02-17	TANSEN	10	OPC	1000	210	\N	UP54AT0234	NEPAL	\N	2026-04-07 21:28:44.89638+00	\N
547	2026-02-17	TANSEN	10	OPC	400	210	\N	BR24GB5812	NEPAL	\N	2026-04-07 21:28:44.89826+00	\N
548	2026-02-17	TANSEN	10	OPC	440	180	\N	BR24GB5812	NEPAL	\N	2026-04-07 21:28:44.900461+00	\N
549	2026-02-17	SHREE CEMENT	2	PPC	700	265	\N	UP82T9357	ETTA	\N	2026-04-07 21:28:44.902771+00	\N
550	2026-02-17	SHREE CEMENT	2	PPC	1000	295	\N	UP84AT0833	ETTA	\N	2026-04-07 21:28:44.904976+00	\N
551	2026-02-17	SHREE CEMENT	2	PPC	814.8	295	\N	HR45E0367	ETTA	\N	2026-04-07 21:28:44.90644+00	\N
552	2026-02-17	SHREE CEMENT	2	PPC	836.8	295	\N	HR38AL4003	ETTA	\N	2026-04-07 21:28:44.908062+00	\N
553	2026-02-17	SHREE CEMENT	2	PPC	840	295	\N	UP81DT4813	ETTA	\N	2026-04-07 21:28:44.909911+00	\N
554	2026-02-17	SHREE CEMENT	2	PPC	720	295	\N	UP32QN2171	ETTA	\N	2026-04-07 21:28:44.911413+00	\N
555	2026-02-18	TANSEN	10	OPC	700	186	\N	RJ14GH4995	NEPAL	\N	2026-04-07 21:28:44.912875+00	\N
556	2026-02-18	TANSEN	10	OPC	540	210	\N	UP53HT9208	NEPAL	\N	2026-04-07 21:28:44.914425+00	\N
557	2026-02-18	TANSEN	10	OPC	300	186	\N	UP53HT9208	NEPAL	\N	2026-04-07 21:28:44.916761+00	\N
558	2026-02-18	Bangur Cemnet	13	OPC	100	270	\N	UP32RT6962	KAKORI	\N	2026-04-07 21:28:44.919069+00	\N
559	2026-02-18	Bangur Cemnet	13	OPC	100	270	\N	UP32RT6962	KAKORI	\N	2026-04-07 21:28:44.921007+00	\N
560	2026-02-18	BIRLA	6	PPC	700	240	\N	UP62CT5547	SATNA	\N	2026-04-07 21:28:44.923289+00	\N
561	2026-02-18	BIRLA	6	PPC	700	240	\N	UP62CT7460	SATNA	\N	2026-04-07 21:28:44.925512+00	\N
562	2026-02-18	SHREE CEMENT	2	PPC	700	295	\N	UP32TN6097	ETTA	\N	2026-04-07 21:28:44.927895+00	\N
563	2026-02-18	SHREE CEMENT	2	PPC	700	295	\N	UP81ET7303	ETTA	\N	2026-04-07 21:28:44.929788+00	\N
564	2026-02-18	SHREE CEMENT	2	PPC	700	265	\N	UP32SNO797	ETTA	\N	2026-04-07 21:28:44.93226+00	\N
565	2026-02-18	SHREE CEMENT	2	PPC	840	295	\N	UP81DT2742	ETTA	\N	2026-04-07 21:28:44.934269+00	\N
566	2026-02-18	SHREE CEMENT	2	PPC	700	265	\N	UP33CT6956	ETTA	\N	2026-04-07 21:28:44.937084+00	\N
567	2026-02-18	SHREE CEMENT	2	PPC	700	295	\N	UP81BT8328	ETTA	\N	2026-04-07 21:28:44.939411+00	\N
568	2026-02-18	SHREE CEMENT	2	PPC	200	295	\N	UP31CT5569	ETTA	\N	2026-04-07 21:28:44.941031+00	\N
569	2026-02-18	SHREE CEMENT	2	PPC	500	295	\N	UP31CT5569	ETTA	\N	2026-04-07 21:28:44.942903+00	\N
570	2026-02-18	SHREE CEMENT	2	PPC	600	265	\N	UP81FT2864	ETTA	\N	2026-04-07 21:28:44.944432+00	\N
571	2026-02-18	SHREE CEMENT	2	PPC	600	265	\N	UP81FT2864	ETTA	\N	2026-04-07 21:28:44.945975+00	\N
572	2026-02-18	SHREE CEMENT	2	PPC	700	265	\N	HR69D3484	ETTA	\N	2026-04-07 21:28:44.94747+00	\N
573	2026-02-18	SHREE CEMENT	2	PPC	700	265	\N	UP31BT2523	ETTA	\N	2026-04-07 21:28:44.949486+00	\N
574	2026-02-18	SHREE CEMENT	2	PPC	600	265	\N	UP82AT1702	ETTA	\N	2026-04-07 21:28:44.952013+00	\N
575	2026-02-18	SHREE CEMENT	2	PPC	700	265	\N	UP82AT1702	ETTA	\N	2026-04-07 21:28:44.954203+00	\N
576	2026-02-19	SHREE CEMENT	2	PPC	740	295	\N	HR38Z3119	ETTA	\N	2026-04-07 21:28:44.956562+00	\N
577	2026-02-19	SHREE CEMENT	2	PPC	640	265	\N	UP81GT6482	ETTA	\N	2026-04-07 21:28:44.958702+00	\N
578	2026-02-19	Bangur Cemnet	2	PPC	720	270	\N	UP32ZN4904	KAKORI	\N	2026-04-07 21:28:44.960871+00	\N
579	2026-02-19	Bangur Cemnet	2	PPC	600	270	\N	UP32FN6083	KAKORI	\N	2026-04-07 21:28:44.963113+00	\N
580	2026-02-19	SHREE CEMENT	2	PPC	700	245	\N	RJ05GC7104	ETTA	\N	2026-04-07 21:28:44.965456+00	\N
581	2026-02-19	SHREE CEMENT	2	PPC	540	245	\N	RJ05GC7104	ETTA	\N	2026-04-07 21:28:44.966562+00	\N
582	2026-02-20	SHREE CEMENT	2	PPC	816	295	\N	HR47G6204	ETTA	\N	2026-04-07 21:28:44.967632+00	\N
583	2026-02-20	SHREE CEMENT	2	PPC	815.2	295	\N	HR38AF9900	ETTA	\N	2026-04-07 21:28:44.969932+00	\N
584	2026-02-20	SHREE CEMENT	2	PPC	620	245	\N	UP33AT9899	ETTA	\N	2026-04-07 21:28:44.971787+00	\N
585	2026-02-20	SHREE CEMENT	2	PPC	700	245	\N	UP32WN9471	ETTA	\N	2026-04-07 21:28:44.974831+00	\N
586	2026-02-20	SHREE CEMENT	2	PPC	700	245	\N	UP84BT1507	ETTA	\N	2026-04-07 21:28:44.976716+00	\N
587	2026-02-20	SHREE CEMENT	2	PPC	640	245	\N	UP81DT4828	ETTA	\N	2026-04-07 21:28:44.97907+00	\N
588	2026-02-20	SHREE CEMENT	2	PPC	540	270	\N	UP32HN9761	ALAMNAGAR	\N	2026-04-07 21:28:44.981276+00	\N
589	2026-02-20	Bangur Cemnet	13	OPC	300	270	\N	UP30T6276	ALAMNAGAR	\N	2026-04-07 21:28:44.983586+00	\N
590	2026-02-20	Bangur Cemnet	13	OPC	540	270	\N	UP32FN3424	ALAMNAGAR	\N	2026-04-07 21:28:44.986162+00	\N
591	2026-02-20	Bangur Cemnet	13	OPC	100	270	\N	UP32RT6962	ALAMNAGAR	\N	2026-04-07 21:28:44.988915+00	\N
592	2026-02-20	Bangur Cemnet	13	OPC	100	270	\N	UP32RT6963	ALAMNAGAR	\N	2026-04-07 21:28:44.992619+00	\N
593	2026-02-20	Bangur Cemnet	13	OPC	100	270	\N	UP32RT6964	ALAMNAGAR	\N	2026-04-07 21:28:44.994985+00	\N
594	2026-02-20	Bangur Cemnet	13	OPC	200	270	\N	UP32LE5943	ALAMNAGAR	\N	2026-04-07 21:28:44.997066+00	\N
595	2026-02-21	TANSEN	10	OPC	840	186	\N	RJ14GJ1697	NEPAL	\N	2026-04-07 21:28:44.99949+00	\N
596	2026-02-21	TANSEN	10	OPC	680	186	\N	UP36T2707	NEPAL	\N	2026-04-07 21:28:45.001398+00	\N
597	2026-02-22	SHREE CEMENT	2	PPC	700	245	\N	UP33CT8164	ALAMNAGAR	\N	2026-04-07 21:28:45.003495+00	\N
598	2026-02-22	SHREE CEMENT	2	PPC	200	270	\N	UP32GM6727	ALAMNAGAR	\N	2026-04-07 21:28:45.005551+00	\N
599	2026-02-22	SHREE CEMENT	2	PPC	220	270	\N	UP30BT3651	ALAMNAGAR	\N	2026-04-07 21:28:45.007963+00	\N
600	2026-02-22	SHREE CEMENT	2	PPC	500	270	\N	UP32DN0993	ALAMNAGAR	\N	2026-04-07 21:28:45.009957+00	\N
601	2026-02-22	SHREE CEMENT	2	PPC	300	245	\N	UP30T3091	ALAMNAGAR	\N	2026-04-07 21:28:45.012203+00	\N
602	2026-02-22	SHREE CEMENT	2	PPC	250	270	\N	UP32FN8872	ALAMNAGAR	\N	2026-04-07 21:28:45.014529+00	\N
603	2026-02-22	SHREE CEMENT	2	PPC	200	270	\N	UP32GM6727	ALAMNAGAR	\N	2026-04-07 21:28:45.016827+00	\N
604	2026-02-22	SHREE CEMENT	2	PPC	600	270	\N	UP32DN4696	ALAMNAGAR	\N	2026-04-07 21:28:45.018763+00	\N
605	2026-02-22	SHREE CEMENT	2	PPC	600	270	\N	UP78BN2796	ALAMNAGAR	\N	2026-04-07 21:28:45.021+00	\N
606	2026-02-22	SHREE CEMENT	2	PPC	600	270	\N	UP32FN6083	ALAMNAGAR	\N	2026-04-07 21:28:45.022926+00	\N
607	2026-02-22	Bangur Cemnet	13	OPC	700	245	\N	UP53BT1777	ALAMNAGAR	\N	2026-04-07 21:28:45.024438+00	\N
608	2026-02-22	SHREE CEMENT	2	PPC	1240	260	\N	UP81DT4362	ALAMNAGAR	\N	2026-04-07 21:28:45.026696+00	\N
609	2026-02-23	Bangur Cemnet	13	OPC	800	270	\N	UP32ST6862	ALAMNAGAR	\N	2026-04-07 21:28:45.027467+00	\N
610	2026-02-23	Bangur Cemnet	13	OPC	800	270	\N	UP32ST6861	ALAMNAGAR	\N	2026-04-07 21:28:45.029353+00	\N
611	2026-02-23	SHREE CEMENT	2	PPC	300	245	\N	UP30T6276	ALAMNAGAR	\N	2026-04-07 21:28:45.031278+00	\N
612	2026-02-23	SHREE CEMENT	2	PPC	425	245	\N	UP77AN3027	ALAMNAGAR	\N	2026-04-07 21:28:45.033363+00	\N
613	2026-02-23	Bangur Cemnet	13	OPC	600	270	\N	UP33T7189	ALAMNAGAR	\N	2026-04-07 21:28:45.035259+00	\N
614	2026-02-23	Bangur Cemnet	13	OPC	600	270	\N	UP33AT6715	ALAMNAGAR	\N	2026-04-07 21:28:45.037878+00	\N
615	2026-02-23	Bangur Cemnet	13	OPC	150	270	\N	UP32JN5417	ALAMNAGAR	\N	2026-04-07 21:28:45.040426+00	\N
616	2026-02-23	Bangur Cemnet	13	OPC	110	270	\N	UP32RT4908	ALAMNAGAR	\N	2026-04-07 21:28:45.043022+00	\N
617	2026-02-23	SHREE CEMENT	2	PPC	840	245	\N	UP32WN3321	ETTA	\N	2026-04-07 21:28:45.045196+00	\N
618	2026-02-23	SHREE CEMENT	2	PPC	1260	245	\N	HR58E8864	ETTA	\N	2026-04-07 21:28:45.047093+00	\N
619	2026-02-24	SHREE CEMENT	2	PPC	680	245	\N	UP81DT4110	ETTA	\N	2026-04-07 21:28:45.049147+00	\N
620	2026-02-24	SHREE CEMENT	2	PPC	700	275	\N	RJ29GB8204	ETTA	\N	2026-04-07 21:28:45.050909+00	\N
621	2026-02-24	SHREE CEMENT	2	PPC	700	245	\N	UP32ZN4904	ETTA	\N	2026-04-07 21:28:45.052886+00	\N
622	2026-02-24	SHREE CEMENT	2	PPC	700	275	\N	UP53DT9907	ETTA	\N	2026-04-07 21:28:45.055098+00	\N
623	2026-02-25	SHREE CEMENT	2	PPC	840	255	\N	UP31AT7266	ETTA	\N	2026-04-07 21:28:45.056912+00	\N
624	2026-02-25	SHREE CEMENT	2	PPC	740	255	\N	UP47T3324	ETTA	\N	2026-04-07 21:28:45.059215+00	\N
625	2026-02-25	SHREE CEMENT	2	PPC	600	245	\N	UP32DN7475	ALAMNAGAR	\N	2026-04-07 21:28:45.061101+00	\N
626	2026-02-25	SHREE CEMENT	2	PPC	600	260	\N	UP32FN6038	ALAMNAGAR	\N	2026-04-07 21:28:45.062637+00	\N
627	2026-02-25	SHREE CEMENT	2	PPC	215	245	\N	UP53BT1777	ALAMNAGAR	\N	2026-04-07 21:28:45.063461+00	\N
628	2026-02-25	SHREE CEMENT	2	PPC	700	270	\N	UP33AT7322	ALAMNAGAR	\N	2026-04-07 21:28:45.065532+00	\N
629	2026-02-25	SHREE CEMENT	2	PPC	720	270	\N	UP32ZN4904	ALAMNAGAR	\N	2026-04-07 21:28:45.067476+00	\N
630	2026-02-25	Bangur Cemnet	13	OPC	200	270	\N	UP32JQ4302	ALAMNAGAR	\N	2026-04-07 21:28:45.069757+00	\N
631	2026-02-25	Bangur Cemnet	13	OPC	800	270	\N	UP32ST6861	ALAMNAGAR	\N	2026-04-07 21:28:45.07197+00	\N
632	2026-02-25	Bangur Cemnet	13	OPC	800	270	\N	UP32ST7183	ALAMNAGAR	\N	2026-04-07 21:28:45.073434+00	\N
633	2026-02-25	Bangur Cemnet	13	OPC	100	270	\N	UP32RT4908	ALAMNAGAR	\N	2026-04-07 21:28:45.074967+00	\N
634	2026-02-25	Bangur Cemnet	13	OPC	800	270	\N	UP32ST6862	ALAMNAGAR	\N	2026-04-07 21:28:45.076458+00	\N
635	2026-04-01	SHREE CEMENT	2	PPC	814.4	290	\N	HR45E3947	ETTA	\N	2026-04-07 21:28:45.081199+00	\N
636	2026-04-02	SHREE CEMENT	2	PPC	700	260	\N	UP81CT1857	ETTA	\N	2026-04-07 21:28:45.083216+00	\N
637	2026-04-02	SHREE CEMENT	2	PPC	600	280	\N	UP33AT6446	ETTA	\N	2026-04-07 21:28:45.085787+00	\N
638	2026-04-02	SHREE CEMENT	2	PPC	600	280	\N	UP33AT7517	ETTA	\N	2026-04-07 21:28:45.088506+00	\N
639	2026-04-03	SHREE CEMENT	2	PPC	720	280	\N	UP32ST7183	ETTA	\N	2026-04-07 21:28:45.090442+00	\N
640	2026-04-03	SHREE CEMENT	2	PPC	720	280	\N	UP32ST6862	ETTA	\N	2026-04-07 21:28:45.093859+00	\N
641	2026-04-04	SHREE CEMENT	2	PPC	720	250	\N	UP33CT7764	ETTA	\N	2026-04-07 21:28:45.096113+00	\N
642	2026-04-04	SHREE CEMENT	2	PPC	600	250	\N	UP32JN8787	ETTA	\N	2026-04-07 21:28:45.098383+00	\N
643	2026-04-04	SHREE CEMENT	2	PPC	600	280	\N	UP51AT3860	ETTA	\N	2026-04-07 21:28:45.10072+00	\N
644	2026-04-05	SHREE CEMENT	2	PPC	700	280	\N	UP33CT7290	ETTA	\N	2026-04-07 21:28:45.103009+00	\N
645	2026-04-05	SHREE CEMENT	2	PPC	800	250	\N	UP32ST7183	ETTA	\N	2026-04-07 21:28:45.104933+00	\N
646	2026-04-05	SHREE CEMENT	2	PPC	800	250	\N	UP32ST6862	ETTA	\N	2026-04-07 21:28:45.105786+00	\N
647	2026-04-05	SHREE CEMENT	2	PPC	600	280	\N	UP33AT6704	ETTA	\N	2026-04-07 21:28:45.107741+00	\N
648	2026-04-05	SHREE CEMENT	2	PPC	700	280	\N	UP81CT9942	ETTA	\N	2026-04-07 21:28:45.110029+00	\N
649	2026-04-05	SHREE CEMENT	2	PPC	600	280	\N	UP36T2461	ETTA	\N	2026-04-07 21:28:45.111958+00	\N
650	2026-04-05	SHREE CEMENT	2	PPC	720	280	\N	UP84BT1506	ETTA	\N	2026-04-07 21:28:45.113938+00	\N
651	2026-04-05	SHREE CEMENT	2	PPC	700	280	\N	UP81DT8642	ETTA	\N	2026-04-07 21:28:45.116361+00	\N
652	2026-04-05	SHREE CEMENT	2	PPC	800	280	\N	UP32ST7210	ETTA	\N	2026-04-07 21:28:45.118616+00	\N
653	2026-04-06	SHREE CEMENT	2	PPC	800	280	\N	UP32ST6861	ETTA	\N	2026-04-07 21:28:45.120827+00	\N
654	2026-04-06	SHREE CEMENT	2	PPC	720	280	\N	UP31BT0964	ETTA	\N	2026-04-07 21:28:45.123111+00	\N
655	2026-04-06	SHREE CEMENT	2	PPC	700	250	\N	UP31BT0350	ETTA	\N	2026-04-07 21:28:45.125048+00	\N
656	2026-04-06	SHREE CEMENT	2	PPC	831.2	290	\N	HR58D3920	ETTA	\N	2026-04-07 21:28:45.127324+00	\N
657	2026-04-06	SHREE CEMENT	2	PPC	803.2	290	\N	UP61KT4858	ETTA	\N	2026-04-07 21:28:45.130479+00	\N
658	2026-04-06	SHREE CEMENT	2	PPC	806.8	290	\N	HR45E0367	ETTA	\N	2026-04-07 21:28:45.132827+00	\N
659	2026-03-01	SHREE CEMENT	2	PPC	740	270	\N	UP32ZN6701	ALAMNAGAR	\N	2026-04-07 21:28:45.138241+00	\N
660	2026-03-01	SHREE CEMENT	2	PPC	821.2	295	\N	HR63E3918	ETTA	\N	2026-04-07 21:28:45.140738+00	\N
661	2026-03-01	SHREE CEMENT	2	PPC	720	275	\N	UP84BT1506	ETTA	\N	2026-04-07 21:28:45.143408+00	\N
662	2026-03-01	SHREE CEMENT	2	PPC	720	275	\N	UP32ST6862	ETTA	\N	2026-04-07 21:28:45.145942+00	\N
663	2026-03-01	SHREE CEMENT	2	PPC	840	275	\N	UP32WN3321	ETTA	\N	2026-04-07 21:28:45.147908+00	\N
664	2026-03-01	BANGUR CEMENT	13	OPC	700	270	\N	UP32ST7210	ALAMNAGAR	\N	2026-04-07 21:28:45.150199+00	\N
665	2026-03-01	BANGUR CEMENT	13	OPC	300	245	\N	UP32ST7210	ALAMNAGAR	\N	2026-04-07 21:28:45.152134+00	\N
666	2026-03-01	BANGUR CEMENT	13	OPC	100	270	\N	UP32RT6962	ALAMNAGAR	\N	2026-04-07 21:28:45.154372+00	\N
667	2026-03-01	BANGUR CEMENT	13	OPC	100	270	\N	UP32RT6962	ALAMNAGAR	\N	2026-04-07 21:28:45.156612+00	\N
668	2026-03-02	SHREE CEMENT	2	PPC	400	245	\N	UP77AN3027	ALAMNAGAR	\N	2026-04-07 21:28:45.158915+00	\N
669	2026-03-02	SHREE CEMENT	2	PPC	720	275	\N	UP32ZN4904	ETTA	\N	2026-04-07 21:28:45.161174+00	\N
670	2026-03-02	BANGUR CEMENT	13	OPC	720	270	\N	UP32ST6861	ALAMNAGAR	\N	2026-04-07 21:28:45.163459+00	\N
671	2026-03-06	SHREE CEMENT	2	PPC	720	275	\N	UP32ST6861	ETTA	\N	2026-04-07 21:28:45.165983+00	\N
672	2026-03-06	SHREE CEMENT	2	PPC	720	245	\N	UP32ST6862	ETTA	\N	2026-04-07 21:28:45.167684+00	\N
673	2026-03-06	SHREE CEMENT	2	PPC	796.8	295	\N	HR47G6204	ETTA	\N	2026-04-07 21:28:45.169998+00	\N
674	2026-03-06	SHREE CEMENT	2	PPC	700	275	\N	UP81DT9809	ETTA	\N	2026-04-07 21:28:45.172247+00	\N
675	2026-03-07	SHREE CEMENT	2	PPC	200	295	\N	UP32MC4405	ALAMNAGAR	\N	2026-04-07 21:28:45.174127+00	\N
676	2026-03-07	TANSEN	10	OPC	840	210	\N	UP53FT0449	NEPAL	\N	2026-04-07 21:28:45.176046+00	\N
677	2026-03-07	SHREE CEMENT	2	PPC	700	275	\N	UP53DT9907	ETTA	\N	2026-04-07 21:28:45.177982+00	\N
678	2026-03-07	SHREE CEMENT	2	PPC	700	245	\N	UP33CT7564	ETTA	\N	2026-04-07 21:28:45.179497+00	\N
679	2026-03-07	SHREE CEMENT	2	PPC	700	275	\N	UP33CT7864	ETTA	\N	2026-04-07 21:28:45.181414+00	\N
680	2026-03-08	SHREE CEMENT	2	PPC	840	245	\N	UP32WN3321	ETTA	\N	2026-04-07 21:28:45.183709+00	\N
681	2026-03-08	SHREE CEMENT	2	PPC	720	275	\N	UP32ST7183	ETTA	\N	2026-04-07 21:28:45.186091+00	\N
682	2026-03-08	SHREE CEMENT	2	PPC	700	275	\N	UP32WN5771	ETTA	\N	2026-04-07 21:28:45.188084+00	\N
683	2026-03-08	SHREE CEMENT	2	PPC	600	245	\N	UP32HN8157	ETTA	\N	2026-04-07 21:28:45.190003+00	\N
684	2026-03-08	SHREE CEMENT	2	PPC	400	245	\N	UP77AN3027	ALAMNAGAR	\N	2026-04-07 21:28:45.192192+00	\N
685	2026-03-08	SHREE CEMENT	2	PPC	200	295	\N	UP32LN0310	ALAMNAGAR	\N	2026-04-07 21:28:45.194653+00	\N
686	2026-03-09	SHREE CEMENT	2	PPC	300	255	\N	UP32T3091	ALAMNAGAR	\N	2026-04-07 21:28:45.196834+00	\N
687	2026-03-11	SHREE CEMENT	2	PPC	400	245	\N	UP77AN3027	ALAMNAGAR	\N	2026-04-07 21:28:45.19896+00	\N
688	2026-03-11	SHREE CEMENT	2	PPC	720	310	\N	UP32ST6861	ETTA	\N	2026-04-07 21:28:45.201095+00	\N
689	2026-03-11	SHREE CEMENT	2	PPC	80	310	\N	UP32ST6861	ETTA	\N	2026-04-07 21:28:45.202969+00	\N
690	2026-03-11	SHREE CEMENT	2	PPC	800	310	\N	UP32ST6862	ETTA	\N	2026-04-07 21:28:45.204784+00	\N
691	2026-03-11	SHREE CEMENT	2	PPC	600	295	\N	UP32JN5288	ALAMNAGAR	\N	2026-04-07 21:28:45.207018+00	\N
692	2026-03-11	SHREE CEMENT	2	PPC	600	295	\N	UP32JN1675	ALAMNAGAR	\N	2026-04-07 21:28:45.20933+00	\N
693	2026-03-11	SHREE CEMENT	2	PPC	800	295	\N	UP32ZN9193	ALAMNAGAR	\N	2026-04-07 21:28:45.211611+00	\N
694	2026-03-11	SHREE CEMENT	2	PPC	500	295	\N	UP32DN0993	ALAMNAGAR	\N	2026-04-07 21:28:45.213903+00	\N
695	2026-03-11	SHREE CEMENT	2	PPC	200	295	\N	UP32GM6727	ALAMNAGAR	\N	2026-04-07 21:28:45.216132+00	\N
696	2026-03-11	SHREE CEMENT	2	PPC	200	295	\N	UP30BT2760	ALAMNAGAR	\N	2026-04-07 21:28:45.218274+00	\N
697	2026-03-13	SHREE CEMENT	2	PPC	830.8	320	\N	HR58D3920	ETTA	\N	2026-04-07 21:28:45.220597+00	\N
698	2026-03-13	SHREE CEMENT	2	PPC	818.4	320	\N	HR58D5848	ETTA	\N	2026-04-07 21:28:45.222926+00	\N
699	2026-03-14	SHREE CEMENT	2	PPC	700	280	\N	UP84BT1506	ETTA	\N	2026-04-07 21:28:45.224951+00	\N
700	2026-03-15	SHREE CEMENT	2	PPC	300	275	\N	UP30T6276	ALAMNAGAR	\N	2026-04-07 21:28:45.226855+00	\N
701	2026-03-15	SHREE CEMENT	2	PPC	801.6	300	\N	HR38AE2017	ETTA	\N	2026-04-07 21:28:45.228804+00	\N
702	2026-03-15	SHREE CEMENT	2	PPC	723	270	\N	UP32ST7210	ETTA	\N	2026-04-07 21:28:45.230518+00	\N
703	2026-01-02	BIRLA	6	PPC	700	210	\N	\N	SATNA	\N	2026-04-07 21:28:45.232852+00	\N
704	2026-01-02	SHREE CEMENT	2	PPC	720	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.23497+00	\N
705	2026-01-03	VRINDAVAN	2	PPC	600	251	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.237068+00	\N
706	2026-01-03	VRINDAVAN	2	PPC	500	238	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.238097+00	\N
707	2026-01-03	VRINDAVAN	2	PPC	200	251	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.240378+00	\N
708	2025-01-03	VRINDAVAN	2	PPC	400	251	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.241281+00	\N
709	2025-01-03	BIRLA	6	PPC	840	210	\N	\N	SATNA	\N	2026-04-07 21:28:45.242158+00	\N
710	2025-01-03	SHREE CEMENT	2	PPC	720	230	\N	\N	ETTA	\N	2026-04-07 21:28:45.244649+00	\N
711	2025-01-03	SHREE CEMENT	2	PPC	640	260	\N	\N	ETTA	\N	2026-04-07 21:28:45.249106+00	\N
712	2026-01-25	SAGARMATHA	12	OPC	840	228	\N	\N	NEPAL	\N	2026-04-07 21:28:45.251224+00	\N
713	2025-01-05	SHREE CEMENT	2	PPC	620	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.253333+00	\N
714	2026-01-05	SHREE CEMENT	2	PPC	620	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.255289+00	\N
715	2025-01-05	SHREE CEMENT	2	PPC	840	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.257871+00	\N
716	2026-01-07	JK	4	PPC	700	290	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.261191+00	\N
717	2026-01-07	JK	4	PPC	700	290	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.263297+00	\N
718	2026-01-07	JK	4	PPC	700	290	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.264994+00	\N
719	2026-01-07	BIRLA	6	PPC	840	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.267334+00	\N
720	2026-01-07	BIRLA	6	PPC	700	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.26958+00	\N
721	2026-01-08	GAURAV JAISWAL	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:45.271819+00	\N
722	2026-01-08	SHREE CEMENT	2	PPC	700	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.274055+00	\N
723	2026-01-09	TANSEN	10	OPC	840	180	\N	\N	NEPAL	\N	2026-04-07 21:28:45.275598+00	\N
724	2026-01-09	TANSEN	10	OPC	840	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.277924+00	\N
725	2026-01-09	SHREE CEMENT	2	PPC	840	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.279851+00	\N
726	2026-01-09	GAURAV JAISWAL	2	PPC	840	200	\N	\N	ETTA	\N	2026-04-07 21:28:45.280625+00	\N
727	2025-01-10	SHREE CEMENT	2	PPC	620	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.281828+00	\N
728	2026-01-11	TANSEN	10	OPC	1000	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.284045+00	\N
729	2026-01-11	SHREE CEMENT	2	PPC	740	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.286318+00	\N
730	2026-01-12	SHREE CEMENT	2	PPC	540	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.28745+00	\N
731	2026-01-12	SHREE CEMENT	2	PPC	600	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.289456+00	\N
732	2026-01-13	SHREE CEMENT	2	PPC	600	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.291743+00	\N
733	2026-01-13	SHREE CEMENT	2	PPC	600	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.293754+00	\N
734	2026-01-13	SHREE CEMENT	2	PPC	520	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.295994+00	\N
735	2026-01-13	SHREE CEMENT	2	PPC	600	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.298461+00	\N
736	2026-01-13	SHREE CEMENT	2	PPC	600	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.3012+00	\N
737	2026-01-13	TANSEN	10	OPC	840	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.303486+00	\N
738	2026-01-13	TANSEN	10	OPC	840	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.305619+00	\N
739	2026-01-13	TANSEN	10	OPC	840	186	\N	\N	NEPAL	\N	2026-04-07 21:28:45.307899+00	\N
740	2026-01-14	BIRLA	6	PPC	840	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.309878+00	\N
741	2026-01-14	BIRLA	6	PPC	840	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.312109+00	\N
742	2026-01-14	BIRLA	6	PPC	840	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.31411+00	\N
743	2026-01-14	SHREE CEMENT	2	PPC	840	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.316613+00	\N
744	2026-01-14	ULTRATECH	8	PPC	600	240	\N	\N	RAEBARELI	\N	2026-04-07 21:28:45.318733+00	\N
745	2026-01-15	BIRLA	6	PPC	700	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.319689+00	\N
746	2026-01-15	BIRLA	6	PPC	700	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.321715+00	\N
747	2026-01-15	GAURAV JAISWAL	2	PPC	717	220	\N	\N	ETTA	\N	2026-04-07 21:28:45.323992+00	\N
748	2026-01-15	GAURAV JAISWAL	2	PPC	640	220	\N	\N	ETTA	\N	2026-04-07 21:28:45.325923+00	\N
749	2026-01-15	TANSEN	10	OPC	840	186	\N	\N	NEPAL	\N	2026-04-07 21:28:45.328103+00	\N
750	2026-01-16	SHREE CEMENT	2	PPC	1000	265	\N	\N	ETTA	\N	2026-04-07 21:28:45.329221+00	\N
751	2026-01-16	BIRLA	6	PPC	840	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.331326+00	\N
752	2026-01-16	BIRLA	6	PPC	840	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.333694+00	\N
753	2026-01-17	SOBHIT SINGH	2	PPC	1200	280	\N	\N	ETTA	\N	2026-04-07 21:28:45.335836+00	\N
754	2026-01-17	SHREE CEMENT	2	PPC	700	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.337951+00	\N
755	2026-01-17	SHREE CEMENT	2	PPC	1100	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.339949+00	\N
756	2026-01-17	SHREE CEMENT	2	PPC	840	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.349874+00	\N
757	2026-01-17	TANSEN	10	OPC	700	186	\N	\N	NEPAL	\N	2026-04-07 21:28:45.351499+00	\N
758	2026-01-18	SHREE CEMENT	2	PPC	700	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.354103+00	\N
759	2026-01-18	SHREE CEMENT	2	PPC	580	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.355189+00	\N
760	2026-01-18	SHREE CEMENT	2	PPC	1100	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.356973+00	\N
761	2026-01-18	SOBHIT SINGH	2	PPC	720	282	\N	\N	ETTA	\N	2026-04-07 21:28:45.358789+00	\N
762	2026-01-18	TANSEN	10	OPC	700	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.360736+00	\N
763	2026-01-18	TANSEN	10	OPC	700	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.363062+00	\N
764	2026-01-19	TANSEN	10	OPC	840	180	\N	\N	NEPAL	\N	2026-04-07 21:28:45.364851+00	\N
765	2026-01-20	SHREE CEMENT	2	PPC	1080	280	\N	\N	ETTA	\N	2026-04-07 21:28:45.367229+00	\N
766	2026-01-20	SHREE CEMENT	2	PPC	1180	280	\N	\N	ETTA	\N	2026-04-07 21:28:45.368395+00	\N
767	2026-01-20	TANSEN	10	OPC	840	180	\N	\N	NEPAL	\N	2026-04-07 21:28:45.36952+00	\N
768	2026-01-20	SHREE CEMENT	2	PPC	723	280	\N	\N	ETTA	\N	2026-04-07 21:28:45.371704+00	\N
769	2026-01-20	SHREE CEMENT	2	PPC	700	280	\N	\N	ETTA	\N	2026-04-07 21:28:45.373994+00	\N
770	2026-01-21	SHREE CEMENT	2	PPC	1100	280	\N	\N	ETTA	\N	2026-04-07 21:28:45.376022+00	\N
771	2026-01-21	BIRLA	6	PPC	840	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.377719+00	\N
772	2026-01-21	BIRLA	6	PPC	840	220	\N	\N	SATNA	\N	2026-04-07 21:28:45.379776+00	\N
773	2026-01-21	TANSEN	10	OPC	840	186	\N	\N	NEPAL	\N	2026-04-07 21:28:45.382034+00	\N
774	2026-01-21	TANSEN	10	OPC	840	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.384293+00	\N
775	2026-01-22	TANSEN	10	OPC	400	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.386395+00	\N
776	2026-01-22	TANSEN	10	OPC	440	186	\N	\N	NEPAL	\N	2026-04-07 21:28:45.389191+00	\N
777	2026-01-23	TANSEN	10	OPC	840	180	\N	\N	NEPAL	\N	2026-04-07 21:28:45.391068+00	\N
778	2026-01-23	GAURAV JAISWAL	2	PPC	500	235	\N	\N	ETTA	\N	2026-04-07 21:28:45.392935+00	\N
779	2026-01-23	GAURAV JAISWAL	2	PPC	340	235	\N	\N	ETTA	\N	2026-04-07 21:28:45.394898+00	\N
780	2026-01-23	GAURAV JAISWAL	2	PPC	640	235	\N	\N	ETTA	\N	2026-04-07 21:28:45.395991+00	\N
781	2026-01-23	SHREE CEMENT	2	PPC	600	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.397467+00	\N
782	2026-01-23	SHREE CEMENT	2	PPC	800	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.399744+00	\N
783	2026-01-23	SHREE CEMENT	2	PPC	600	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.402439+00	\N
784	2026-01-23	SHREE CEMENT	2	PPC	700	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.404973+00	\N
785	2026-01-23	SHREE CEMENT	2	PPC	700	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.407142+00	\N
786	2026-01-23	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.409078+00	\N
787	2026-01-24	SHREE CEMENT	2	PPC	600	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.410997+00	\N
788	2026-01-24	TANSEN	10	OPC	840	186	\N	\N	NEPAL	\N	2026-04-07 21:28:45.412979+00	\N
789	2025-01-03	SAGARMATHA	12	OPC	840	228	\N	\N	NEPAL	\N	2026-04-07 21:28:45.415236+00	\N
790	2026-01-25	JK	4	PPC	840	305	\N	\N	PANNA	\N	2026-04-07 21:28:45.417537+00	\N
791	2026-01-25	JK	4	PPC	840	305	\N	\N	PANNA	\N	2026-04-07 21:28:45.419518+00	\N
792	2026-01-25	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.421477+00	\N
793	2026-01-25	SHREE CEMENT	2	PPC	700	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.423686+00	\N
794	2026-01-25	SHREE CEMENT	2	PPC	420	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.425234+00	\N
795	2026-01-25	PACHERIA GONDA	21	OPC	700	261	\N	\N	NEPAL	\N	2026-04-07 21:28:45.428314+00	\N
796	2026-01-25	GAURAV JAISWAL	15	PPC	440	370	\N	\N	TIKARIA	\N	2026-04-07 21:28:45.430536+00	\N
797	2026-01-25	GAURAV JAISWAL	15	PPC	402	370	\N	\N	TIKARIA	\N	2026-04-07 21:28:45.432991+00	\N
798	2026-01-26	GAURAV JAISWAL	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.433988+00	\N
799	2026-01-26	SOBHIT SINGH	4	PPC	720	270	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:45.436236+00	\N
800	2026-01-27	TANSEN	10	OPC	700	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.437295+00	\N
801	2026-01-28	SHREE CEMENT	2	PPC	200	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.439535+00	\N
802	2026-01-28	SHREE CEMENT	2	PPC	1000	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.441442+00	\N
803	2026-01-28	SHREE CEMENT	2	PPC	700	260	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.443689+00	\N
804	2026-01-28	SHREE CEMENT	2	PPC	840	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.445708+00	\N
805	2026-01-28	SHREE CEMENT	2	PPC	700	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.447978+00	\N
806	2026-01-28	SHREE CEMENT	2	PPC	700	280	\N	\N	ETTA	\N	2026-04-07 21:28:45.450349+00	\N
807	2026-01-29	SHREE CEMENT	2	PPC	1000	274	\N	\N	DEORIA	\N	2026-04-07 21:28:45.453129+00	\N
808	2026-01-29	SHREE CEMENT	2	PPC	840	280	\N	\N	ETTA	\N	2026-04-07 21:28:45.455788+00	\N
809	2026-01-29	SHREE CEMENT	2	PPC	1240	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.457995+00	\N
810	2026-01-29	SHREE CEMENT	2	PPC	1000	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.460236+00	\N
811	2026-01-29	SHREE CEMENT	2	PPC	540	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.462554+00	\N
812	2026-01-29	SAGARMATHA	12	OPC	800	228	\N	\N	NEPAL	\N	2026-04-07 21:28:45.464531+00	\N
813	2026-01-29	TANSEN	10	OPC	840	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.466574+00	\N
814	2026-01-30	SHREE CEMENT	2	PPC	620	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.468542+00	\N
815	2026-01-30	SHREE CEMENT	2	PPC	700	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.470523+00	\N
816	2026-01-30	SHREE CEMENT	2	PPC	700	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.472656+00	\N
817	2026-01-30	SHREE CEMENT	2	PPC	700	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.473716+00	\N
818	2026-01-30	SHREE CEMENT	2	PPC	720	250	\N	\N	ETTA	\N	2026-04-07 21:28:45.475987+00	\N
819	2026-01-31	SHREE CEMENT	2	PPC	200	260	\N	\N	ETTA	\N	2026-04-07 21:28:45.478043+00	\N
820	2026-01-31	SHREE CEMENT	2	PPC	200	260	\N	\N	ETTA	\N	2026-04-07 21:28:45.480172+00	\N
821	2026-01-31	SHREE CEMENT	2	PPC	200	260	\N	\N	ETTA	\N	2026-04-07 21:28:45.482542+00	\N
822	2026-01-31	SHREE CEMENT	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:45.484786+00	\N
823	2026-01-31	SHREE CEMENT	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:45.486969+00	\N
824	2026-01-31	SHREE CEMENT	2	PPC	1100	280	\N	\N	ETTA	\N	2026-04-07 21:28:45.489008+00	\N
825	2026-01-31	TANSEN	10	OPC	840	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.491169+00	\N
826	2026-01-31	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.493469+00	\N
827	2026-01-31	SHREE CEMENT	2	PPC	700	240	\N	\N	ETTA	\N	2026-04-07 21:28:45.495652+00	\N
828	2025-11-01	SHREE CEMENT	2	PPC	600	267	\N	\N	ETTA	\N	2026-04-07 21:28:45.498448+00	\N
829	2025-11-01	SHREE CEMENT	2	PPC	700	245	\N	\N	ETTA	\N	2026-04-07 21:28:45.500576+00	\N
830	2025-11-01	SHREE CEMENT	2	PPC	700	245	\N	\N	ETTA	\N	2026-04-07 21:28:45.50272+00	\N
831	2025-11-01	SHREE CEMENT	2	PPC	740	275	\N	\N	ETTA	\N	2026-04-07 21:28:45.505448+00	\N
832	2025-11-01	ULTRATECH	9	DAMAGE	700	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.506948+00	\N
833	2025-11-01	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.5097+00	\N
834	2025-11-01	ULTRATECH	9	DAMAGE	850	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:45.511939+00	\N
835	2025-11-02	ULTRATECH	9	DAMAGE	700	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.514169+00	\N
836	2025-11-02	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.51636+00	\N
837	2025-11-02	ABHIJIT AGARWAL	19	OPC	600	200	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.518599+00	\N
838	2025-11-03	ULTRATECH	8	PPC	600	253	\N	\N	RAEBARELLY	\N	2026-04-07 21:28:45.520814+00	\N
839	2025-11-03	VRINDAVAN	4	PPC	720	240	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:45.523017+00	\N
840	2025-11-04	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.523763+00	\N
841	2025-11-04	SHREE CEMENT	2	PPC	620	267	\N	\N	ETTA	\N	2026-04-07 21:28:45.525277+00	\N
842	2025-11-04	ULTRATECH	9	DAMAGE	660	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.527204+00	\N
843	2025-11-04	ULTRATECH	9	DAMAGE	700	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.52876+00	\N
844	2025-11-04	ULTRATECH	9	DAMAGE	700	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.531047+00	\N
845	2025-11-04	ULTRATECH	9	DAMAGE	800	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.533342+00	\N
846	2025-11-04	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.535537+00	\N
847	2025-11-05	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.537591+00	\N
848	2025-11-05	ULTRATECH	9	DAMAGE	700	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.539861+00	\N
849	2025-11-05	ULTRATECH	9	DAMAGE	400	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:45.541715+00	\N
850	2025-11-05	BIRLA	6	PPC	700	215	\N	\N	SATNA	\N	2026-04-07 21:28:45.543188+00	\N
851	2025-11-05	BIRLA	6	PPC	700	215	\N	\N	SATNA	\N	2026-04-07 21:28:45.545483+00	\N
852	2025-11-05	SHREE CEMENT	2	PPC	740	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.547643+00	\N
853	2025-11-06	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.550151+00	\N
854	2025-11-06	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.552364+00	\N
855	2025-11-06	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.554457+00	\N
856	2025-11-06	BIRLA	6	PPC	840	215	\N	\N	SATNA	\N	2026-04-07 21:28:45.556637+00	\N
857	2025-11-06	TANSEN	10	OPC	700	215	\N	\N	NEPAL	\N	2026-04-07 21:28:45.559424+00	\N
858	2025-11-07	JK CEMENT	3	OPC	800	285	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.561956+00	\N
859	2025-11-07	JK	3	OPC	800	285	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.564265+00	\N
860	2025-11-07	ULTRATECH	9	DAMAGE	600	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:45.566622+00	\N
861	2025-11-07	ULTRATECH	9	DAMAGE	600	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:45.568835+00	\N
862	2025-11-07	ULTRATECH	9	DAMAGE	600	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:45.571192+00	\N
863	2025-11-07	ULTRATECH	9	DAMAGE	550	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:45.573767+00	\N
864	2025-11-07	BIRLA	6	PPC	840	215	\N	\N	SATNA	\N	2026-04-07 21:28:45.576035+00	\N
865	2025-11-08	JK	3	OPC	700	285	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.578295+00	\N
866	2025-11-08	ULTRATECH	9	DAMAGE	600	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:45.580592+00	\N
867	2025-11-08	TANSEN	10	OPC	700	215	\N	\N	NEPAL	\N	2026-04-07 21:28:45.582974+00	\N
868	2025-11-09	SHREE CEMENT	2	PPC	740	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.585191+00	\N
869	2025-11-09	TANSEN	10	OPC	700	190	\N	\N	NEPAL	\N	2026-04-07 21:28:45.587258+00	\N
870	2025-11-09	TANSEN	10	OPC	840	196	\N	\N	NEPAL	\N	2026-04-07 21:28:45.589522+00	\N
871	2025-11-09	ULTRATECH	8	PPC	175	330	\N	\N	SULTANPUR	\N	2026-04-07 21:28:45.591783+00	\N
872	2025-11-09	UPENDRA JAISWAL	4	PPC	150	285	\N	\N	RAEBARELLY	\N	2026-04-07 21:28:45.593837+00	\N
873	2025-11-09	SUNIL RBL	4	PPC	150	275	\N	\N	RAEBARELLY	\N	2026-04-07 21:28:45.595944+00	\N
874	2025-11-10	BIRLA	6	PPC	700	215	\N	\N	SATNA	\N	2026-04-07 21:28:45.597964+00	\N
875	2025-11-10	BIRLA	6	PPC	1000	105	\N	\N	HARDOI	\N	2026-04-07 21:28:45.600033+00	\N
876	2025-11-10	ULTRATECH	7	OPC	600	265	\N	\N	LUCKNOW	\N	2026-04-07 21:28:45.602259+00	\N
877	2025-11-10	ULTRATECH	7	OPC	600	265	\N	\N	LUCKNOW	\N	2026-04-07 21:28:45.60448+00	\N
878	2025-11-10	ULTRATECH	7	OPC	600	265	\N	\N	LUCKNOW	\N	2026-04-07 21:28:45.606789+00	\N
879	2025-11-10	TANSEN	10	OPC	840	190	\N	\N	NEPAL	\N	2026-04-07 21:28:45.609056+00	\N
880	2025-11-10	SHREE CEMENT	2	PPC	600	272	\N	\N	ETTA	\N	2026-04-07 21:28:45.611529+00	\N
881	2025-11-11	JK CEMENT	3	OPC	815	285	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.614033+00	\N
882	2025-11-11	JK CEMENT	3	OPC	700	285	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.61667+00	\N
883	2025-11-11	SHREE CEMENT	2	PPC	700	265	\N	\N	ETTA	\N	2026-04-07 21:28:45.618567+00	\N
884	2025-11-12	SHREE CEMENT	2	PPC	740	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.620826+00	\N
885	2025-11-12	SHREE CEMENT	2	PPC	720	235	\N	\N	ETTA	\N	2026-04-07 21:28:45.623083+00	\N
886	2025-11-12	SHREE CEMENT	2	PPC	620	272	\N	\N	ETTA	\N	2026-04-07 21:28:45.625326+00	\N
887	2025-11-12	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.627805+00	\N
888	2025-11-13	JK CEMENT	4	PPC	640	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:45.630183+00	\N
889	2025-11-13	JK CEMENT	4	PPC	700	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:45.632554+00	\N
890	2025-11-13	NEERAJ GUPTA	16	PPC	500	275	\N	\N	KANPUR	\N	2026-04-07 21:28:45.634667+00	\N
891	2025-11-13	TANSEN	10	OPC	340	190	\N	\N	NEPAL	\N	2026-04-07 21:28:45.636911+00	\N
892	2025-11-13	TANSEN	10	OPC	500	215	\N	\N	NEPAL	\N	2026-04-07 21:28:45.638457+00	\N
893	2025-11-14	SHREE CEMENT	2	PPC	600	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.639877+00	\N
894	2025-11-14	SHREE CEMENT	2	PPC	600	273	\N	\N	ETTA	\N	2026-04-07 21:28:45.641367+00	\N
895	2025-11-14	BIRLA CEMENT	6	PPC	840	215	\N	\N	SATNA	\N	2026-04-07 21:28:45.64292+00	\N
896	2025-11-14	SAMAR ENTERPRISES	22	OTHER	700	310	\N	\N	AMETHI	\N	2026-04-07 21:28:45.644806+00	\N
897	2025-11-14	JK CEMENT	4	PPC	700	280	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.64711+00	\N
898	2025-11-15	SHREE CEMENT	2	PPC	600	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.648578+00	\N
899	2025-11-15	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.650625+00	\N
900	2025-11-17	SHREE CEMENT	2	PPC	600	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.652605+00	\N
901	2025-11-17	SHREE CEMENT	2	PPC	700	235	\N	\N	ETTA	\N	2026-04-07 21:28:45.654581+00	\N
902	2025-11-17	SHREE CEMENT	2	PPC	600	275	\N	\N	ETTA	\N	2026-04-07 21:28:45.656548+00	\N
903	2025-11-17	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.658877+00	\N
904	2025-11-18	SHREE CEMENT	2	PPC	740	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.6615+00	\N
905	2025-11-18	SHREE CEMENT	2	PPC	600	263	\N	\N	ETTA	\N	2026-04-07 21:28:45.663969+00	\N
906	2025-11-18	ULTRATECH	7	OPC	600	265	\N	\N	LUCKNOW	\N	2026-04-07 21:28:45.666129+00	\N
907	2025-11-18	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.668312+00	\N
908	2025-11-19	GAURAV JAISWAL	7	OPC	840	265	\N	\N	ALLAHABD	\N	2026-04-07 21:28:45.670325+00	\N
909	2025-11-19	ULTRATECH	9	DAMAGE	600	75	\N	\N	ALLAHABD	\N	2026-04-07 21:28:45.67261+00	\N
910	2025-11-19	SHREE CEMENT	2	PPC	720	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.6746+00	\N
911	2025-11-19	TANSEN	10	OPC	840	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.676958+00	\N
912	2025-11-20	NEERAJ GUPTA	16	PPC	500	275	\N	\N	KANPUR	\N	2026-04-07 21:28:45.679118+00	\N
913	2025-11-20	ULTRATECH	8	PPC	900	240	\N	\N	LUCKNOW	\N	2026-04-07 21:28:45.681429+00	\N
914	2025-11-20	SHREE CEMENT	2	PPC	754	263	\N	\N	ETTA	\N	2026-04-07 21:28:45.68375+00	\N
915	2025-11-20	SHREE CEMENT	2	PPC	446	263	\N	\N	ETTA	\N	2026-04-07 21:28:45.685948+00	\N
916	2025-11-20	SHREE CEMENT	2	PPC	600	273	\N	\N	ETTA	\N	2026-04-07 21:28:45.688152+00	\N
917	2025-11-20	SAGARMATHA	12	OPC	600	230	\N	\N	NEPAL	\N	2026-04-07 21:28:45.690445+00	\N
918	2025-11-20	SAGARMATHA	12	OPC	600	230	\N	\N	NEPAL	\N	2026-04-07 21:28:45.692398+00	\N
919	2025-11-20	TANSEN	10	OPC	700	185	\N	\N	NEPAL	\N	2026-04-07 21:28:45.694661+00	\N
920	2025-11-21	ULTRATECH	9	DAMAGE	800	75	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.696148+00	\N
921	2025-11-21	ULTRATECH	9	DAMAGE	600	105	\N	\N	PRATAPGARH	\N	2026-04-07 21:28:45.697937+00	\N
922	2025-11-21	BIRLA	9	DAMAGE	600	105	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.700168+00	\N
923	2025-11-21	JK	4	PPC	700	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:45.701928+00	\N
924	2025-11-21	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.703073+00	\N
925	2025-11-21	TANSEN	10	OPC	840	185	\N	\N	NEPAL	\N	2026-04-07 21:28:45.705277+00	\N
926	2025-11-21	ULTRATECH	8	PPC	600	250	\N	\N	RAEBARELLY	\N	2026-04-07 21:28:45.70685+00	\N
927	2025-11-22	SHREE CEMENT	2	PPC	620	268	\N	\N	ETTA	\N	2026-04-07 21:28:45.709144+00	\N
928	2025-11-22	SHREE CEMENT	2	PPC	740	268	\N	\N	ETTA	\N	2026-04-07 21:28:45.711272+00	\N
929	2025-11-22	GAURAV JAISWAL	8	PPC	700	235	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.713584+00	\N
930	2025-11-23	SAGARMATHA	12	OPC	700	230	\N	\N	NEPAL	\N	2026-04-07 21:28:45.716274+00	\N
931	2025-11-23	SAGARMATHA	12	OPC	840	230	\N	\N	NEPAL	\N	2026-04-07 21:28:45.718158+00	\N
932	2025-11-24	JK	4	PPC	500	236	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:45.720486+00	\N
933	2025-11-24	GLOBAL ENTERPRISES	4	PPC	600	235	\N	\N	HAMIRPUR	\N	2026-04-07 21:28:45.722797+00	\N
934	2025-11-24	ULTRATECH	8	PPC	900	240	\N	\N	ALAMNAGAR	\N	2026-04-07 21:28:45.724666+00	\N
935	2025-11-24	SHREE CEMENT	2	PPC	720	268	\N	\N	ETTA	\N	2026-04-07 21:28:45.726946+00	\N
936	2025-11-26	SHREE CEMENT	2	PPC	600	230	\N	\N	ETTA	\N	2026-04-07 21:28:45.728923+00	\N
937	2025-11-26	ULTRATECH	9	DAMAGE	700	105	\N	\N	SULTANPUR	\N	2026-04-07 21:28:45.730995+00	\N
938	2025-11-26	TANSEN	10	OPC	600	210	\N	\N	NEPAL	\N	2026-04-07 21:28:45.733251+00	\N
939	2025-11-27	GAURAV JAISWAL	8	PPC	600	235	\N	\N	ALLAHABD	\N	2026-04-07 21:28:45.734961+00	\N
940	2025-11-27	BIRLA	6	PPC	840	217	\N	\N	SATNA	\N	2026-04-07 21:28:45.737091+00	\N
941	2025-11-27	BIRLA	6	PPC	700	217	\N	\N	SATNA	\N	2026-04-07 21:28:45.739256+00	\N
942	2025-11-28	SHREE CEMENT	2	PPC	720	265	\N	\N	ETTA	\N	2026-04-07 21:28:45.741524+00	\N
943	2025-11-28	SHREE CEMENT	2	PPC	700	265	\N	\N	ETTA	\N	2026-04-07 21:28:45.743526+00	\N
944	2025-11-28	SHREE CEMENT	2	PPC	700	270	\N	\N	ETTA	\N	2026-04-07 21:28:45.745796+00	\N
945	2025-11-28	ULTRATECH	8	PPC	900	240	\N	\N	LUCKNOW	\N	2026-04-07 21:28:45.747787+00	\N
946	2025-11-28	JK	4	PPC	620	280	\N	\N	ALLAHABAD	\N	2026-04-07 21:28:45.750069+00	\N
947	2025-11-29	NEERAJ GUPTA	16	PPC	500	280	\N	\N	KANPUR	\N	2026-04-07 21:28:45.752061+00	\N
948	2025-11-30	TANSEN	10	OPC	700	186	\N	\N	NEPAL	\N	2026-04-07 21:28:45.753973+00	\N
949	2025-11-30	TANSEN	10	OPC	840	186	\N	\N	NEPAL	\N	2026-04-07 21:28:45.756285+00	\N
950	2025-11-30	RAJNISH MISHRA	8	PPC	600	250	\N	\N	SULTANPUR	\N	2026-04-07 21:28:45.758449+00	\N
951	2025-11-30	VRINDAVAN	4	PPC	700	237	\N	\N	LUCKNOW	\N	2026-04-07 21:28:45.760716+00	\N
952	2025-11-30	MAHAKAL LLP	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:45.761915+00	\N
953	2025-11-30	MAHAKAL LLP	2	PPC	700	260	\N	\N	ETTA	\N	2026-04-07 21:28:45.764442+00	\N
954	2025-10-18	Godown Purchase	2	PPC	720	245	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.821884+00	\N
955	2025-10-18	Godown Purchase	2	PPC	720	245	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.823911+00	\N
956	2025-12-17	Godown Purchase	2	PPC	720	228	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.825611+00	\N
957	2026-01-03	Godown Purchase	2	PPC	720	230	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.827177+00	\N
958	2026-01-09	Godown Purchase	2	PPC	840	240	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.831558+00	\N
959	2026-01-09	Godown Purchase	2	PPC	840	243	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.833271+00	\N
960	2026-01-17	Godown Purchase	2	PPC	1100	240	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.834397+00	\N
961	2026-01-18	Godown Purchase	2	PPC	700	240	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.835625+00	\N
962	2026-01-23	Godown Purchase	2	PPC	340	235	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.836709+00	\N
963	2026-01-29	Godown Purchase	2	PPC	460	250	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.837899+00	\N
964	2026-01-31	Godown Purchase	2	PPC	700	250	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.839004+00	\N
965	2026-02-07	Godown Purchase	2	PPC	400	240	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.839861+00	\N
966	2026-02-15	Godown Purchase	2	PPC	420	265	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.841077+00	\N
967	2026-02-19	Godown Purchase	2	PPC	700	245	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.841964+00	\N
968	2026-02-19	Godown Purchase	2	PPC	540	245	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.843083+00	\N
969	2026-02-22	Godown Purchase	2	PPC	1240	260	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.844248+00	\N
970	2026-02-25	Godown Purchase	2	PPC	600	260	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.84531+00	\N
971	2026-02-27	Godown Purchase	2	PPC	500	266	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.846473+00	\N
972	2026-03-15	Godown Purchase	2	PPC	723	270	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.847611+00	\N
973	2026-03-22	Godown Purchase	2	PPC	1440	250	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.848704+00	\N
974	2025-12-08	Godown Purchase	16	PPC	700	250	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.849635+00	\N
975	2025-12-30	Godown Purchase	16	PPC	720	250	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.850711+00	\N
976	2026-01-22	Godown Purchase	16	PPC	720	265	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.851821+00	\N
977	2025-12-15	Godown Purchase	8	PPC	700	240	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.853021+00	\N
978	2025-01-14	Godown Purchase	8	PPC	600	240	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.85391+00	\N
979	2025-02-10	Godown Purchase	8	PPC	649	260	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.855007+00	\N
980	2026-03-16	Godown Purchase	8	PPC	720	220	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.856128+00	\N
981	2025-11-30	Godown Purchase	1	OPC	700	260	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.857287+00	\N
982	2025-12-04	Godown Purchase	1	OPC	700	260	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.858419+00	\N
983	2025-12-08	Godown Purchase	1	OPC	600	253	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.859632+00	\N
984	2025-12-08	Godown Purchase	1	OPC	600	253	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.860784+00	\N
985	2025-12-14	Godown Purchase	1	OPC	220	248	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.861803+00	\N
986	2025-12-20	Godown Purchase	1	OPC	600	248	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.862508+00	\N
987	2026-01-03	Godown Purchase	1	OPC	600	251	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.863262+00	\N
988	2026-01-03	Godown Purchase	1	OPC	200	251	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.864401+00	\N
989	2026-01-03	Godown Purchase	1	OPC	400	251	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.865503+00	\N
990	2026-01-11	Godown Purchase	1	OPC	740	270	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.866879+00	\N
991	2026-01-17	Godown Purchase	1	OPC	840	270	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.867863+00	\N
992	2026-01-20	Godown Purchase	1	OPC	1080	280	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.869016+00	\N
993	2026-01-20	Godown Purchase	1	OPC	1180	280	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.870092+00	\N
994	2026-02-17	Godown Purchase	1	OPC	500	270	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.871183+00	\N
995	2026-01-25	Godown Purchase	15	PPC	402	370	1	\N	Maunda Godown	\N	2026-04-07 21:28:45.872291+00	\N
996	2025-04-01	Opening Stock	6	PPC	1200	217.19737	\N	\N	\N	Historical opening stock before Excel tracking	2026-04-07 21:28:45.879535+00	\N
997	2026-04-08	Gourav C	21	OPC	2	200	2	ABC	\N	\N	2026-04-08 05:22:39.614722+00	\N
998	2026-04-08	New1	13	OPC	2	200	2	ABC	\N	\N	2026-04-08 18:59:16.073381+00	\N
470	2026-02-04	PACHERIA GONDA	21	OPC	840	263	\N	UP53ET6008	NEPAL	\N	2026-04-07 21:28:44.730276+00	\N
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales (id, date, party_id, brand_id, cement_type, bags, sale_rate, destination, invoice_number, billed_party, billed_quantity, billed_rate, billed_amount, truck_number, godown_id, remarks, created_at) FROM stdin;
1	2025-08-31	186	12	OPC	840	310	Azamgarh	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.705995+00
2	2025-09-01	111	2	PPC	700	335	MANIKPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.711473+00
3	2025-09-01	169	9	DAMAGE	600	150	JAUNPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.715351+00
4	2025-09-01	30	2	PPC	720	328	CHINHAT	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.717956+00
5	2025-09-02	102	2	PPC	700	325	RAMSHNEHI GHAT	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.720624+00
6	2025-09-02	15	4	PPC	840	325	BALRAMPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.723018+00
7	2025-09-02	140	2	PPC	200	335	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.725519+00
8	2025-09-02	140	2	PPC	700	335	AYODHA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.727933+00
9	2025-09-02	187	9	DAMAGE	300	145	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.731802+00
10	2025-09-02	140	2	PPC	700	335	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.734615+00
11	2025-09-02	139	6	PPC	680	335	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.737072+00
12	2025-09-02	19	6	PPC	800	255	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.739251+00
13	2025-09-02	136	12	OPC	840	307	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.741494+00
14	2025-09-02	136	12	OPC	840	307	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.743684+00
15	2025-09-03	106	16	PPC	500	350	GOPRAMAU	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.745655+00
16	2025-09-03	106	16	PPC	500	355	GOPRAMAU	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.747946+00
17	2025-09-03	102	6	PPC	840	255	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.74991+00
18	2025-09-03	135	6	PPC	840	255	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.752429+00
19	2025-09-04	35	6	PPC	1000	138	HARDOI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.754986+00
20	2025-09-04	188	2	PPC	500	325	RAIBAREILLY	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.758238+00
21	2025-09-04	111	2	PPC	700	325	RAIBAREILLY	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.760249+00
22	2025-09-04	15	2	PPC	700	290	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.762129+00
23	2025-09-04	169	9	DAMAGE	633	150	JAUNPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.764074+00
24	2025-09-04	15	12	OPC	640	307	BHARICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.765573+00
25	2025-09-05	189	6	PPC	700	255	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.768245+00
26	2025-09-05	134	6	PPC	840	330	AMBEDKARNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.770001+00
27	2025-09-05	102	6	PPC	700	255	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.772287+00
28	2025-09-05	36	8	PPC	600	298	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.774226+00
29	2025-09-05	136	4	PPC	200	295	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.775758+00
30	2025-09-06	112	2	PPC	690	335	AYODHA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.778047+00
31	2025-09-06	33	2	PPC	700	325	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.779908+00
32	2025-09-06	112	7	OPC	700	345	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.782342+00
33	2025-09-06	53	8	PPC	600	308	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.785122+00
34	2025-09-07	140	16	PPC	200	315	MATI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.787159+00
35	2025-09-07	70	18	PPC	250	278	IIM LKO	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.789216+00
36	2025-09-07	138	9	DAMAGE	550	160	KANPUR	\N	\N	\N	\N	\N	?	\N	\N	2026-04-07 21:28:43.7911+00
37	2025-09-08	140	22	OTHER	65	325	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.79306+00
38	2025-09-08	140	18	PPC	200	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.795281+00
39	2025-09-08	111	2	PPC	600	335	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.797567+00
40	2025-09-08	127	2	PPC	600	325	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.799939+00
41	2025-09-08	135	2	PPC	700	325	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.801672+00
42	2025-09-08	139	6	PPC	300	330	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.804021+00
43	2025-09-08	112	6	PPC	400	330	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.806103+00
44	2025-09-08	138	9	DAMAGE	540	160	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.807664+00
45	2025-09-08	138	9	DAMAGE	550	160	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.809971+00
46	2025-09-08	24	10	OPC	600	297	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.812273+00
47	2025-09-09	71	10	OPC	840	290	MAHARAJGANJ	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.814307+00
48	2025-09-09	171	9	DAMAGE	800	165	AYODHA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.81655+00
49	2025-09-09	140	16	PPC	200	315	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.818734+00
50	2025-09-10	125	9	DAMAGE	800	155	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.821061+00
51	2025-09-10	190	9	DAMAGE	300	145	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.824288+00
52	2025-09-10	16	9	DAMAGE	1000	150	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.826604+00
53	2025-09-10	191	2	PPC	700	320	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.830151+00
54	2025-09-10	139	4	PPC	700	318	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.831945+00
55	2025-09-11	9	4	PPC	840	350	DEORIA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.834826+00
56	2025-09-11	135	8	PPC	600	300	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.837669+00
57	2025-09-11	27	9	DAMAGE	400	150	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.839874+00
58	2025-09-11	190	9	DAMAGE	300	145	GAURIGANJ	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.841926+00
59	2025-09-11	36	8	PPC	600	298	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.843998+00
60	2025-09-11	127	2	PPC	675	325	JAGDISHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.845606+00
61	2025-09-11	140	2	PPC	200	330	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.847908+00
62	2025-09-12	127	15	PPC	818	320	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.850168+00
63	2025-09-12	140	4	PPC	720	340	AYODHA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.852711+00
64	2025-09-12	106	16	PPC	500	355	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.854948+00
65	2025-09-12	138	9	DAMAGE	500	160	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.857143+00
66	2025-09-12	73	8	PPC	540	313	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.85943+00
67	2025-09-12	36	8	PPC	540	298	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.861764+00
68	2025-09-12	36	8	PPC	600	298	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.863725+00
69	2025-09-12	15	12	OPC	840	305	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.865217+00
70	2025-09-12	139	12	OPC	840	310	MUSAFIRKHANA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.867069+00
71	2025-09-13	140	2	PPC	350	330	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.86916+00
72	2025-09-13	191	2	PPC	250	320	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.871448+00
73	2025-09-13	140	2	PPC	300	330	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.873602+00
74	2025-09-13	111	2	PPC	700	325	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.875529+00
75	2025-09-13	30	2	PPC	700	308	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.87702+00
76	2025-09-13	24	2	PPC	840	310	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.879033+00
77	2025-09-13	112	6	PPC	820	330	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.881264+00
78	2025-09-13	106	16	PPC	498	355	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.883174+00
79	2025-09-15	138	9	DAMAGE	600	160	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.886268+00
80	2025-09-16	111	2	PPC	700	325	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.888923+00
81	2025-09-16	135	2	PPC	700	325	shravaSTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.890785+00
82	2025-09-16	24	2	PPC	700	305	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.892763+00
83	2025-09-16	140	2	PPC	700	330	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.894737+00
84	2025-09-16	192	2	PPC	710	320	JAGDISHPUR	\N	\N	\N	\N	\N	400	\N	\N	2026-04-07 21:28:43.898196+00
85	2025-09-16	136	2	PPC	700	320	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.900468+00
86	2025-09-16	124	2	PPC	600	300	BASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.902547+00
87	2025-09-16	97	10	OPC	840	281	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.904815+00
88	2025-09-17	189	6	PPC	840	250	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.906937+00
89	2025-09-17	136	6	PPC	840	325	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.908907+00
90	2025-09-17	169	9	DAMAGE	700	150	JAUNPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.911225+00
91	2025-09-17	139	7	OPC	600	335	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.913192+00
92	2025-09-18	52	8	PPC	200	310	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.915411+00
93	2025-09-18	125	9	DAMAGE	800	160	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.917423+00
94	2025-09-18	171	9	DAMAGE	800	160	AYODHA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.919875+00
95	2025-09-19	125	9	DAMAGE	800	160	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.92223+00
96	2025-09-19	186	6	PPC	700	265	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.924245+00
97	2025-09-19	136	6	PPC	840	325	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.925761+00
98	2025-09-19	63	2	PPC	200	320	CHINHAT	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.928058+00
99	2025-09-19	63	2	PPC	200	295	CHINHAT	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.930305+00
100	2025-09-19	127	2	PPC	700	310	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.932478+00
101	2025-09-19	24	2	PPC	700	305	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.934368+00
102	2025-09-19	135	4	PPC	720	285	SIDDHARTHNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.937213+00
103	2025-09-20	135	8	PPC	600	288	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.93994+00
104	2025-09-20	73	8	PPC	600	290	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.942464+00
105	2025-09-21	16	9	DAMAGE	1080	150	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.944544+00
106	2025-09-22	58	6	PPC	1250	150	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.946814+00
107	2025-09-22	134	10	OPC	840	246	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.949147+00
108	2025-09-22	135	12	OPC	500	285	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.951249+00
109	2025-09-22	136	12	OPC	700	285	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.953506+00
110	2025-09-23	190	9	DAMAGE	400	135	GAURIGANJ	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.95577+00
111	2025-09-24	190	9	DAMAGE	379	135	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.957893+00
112	2025-09-24	141	4	PPC	700	280	MATI SITE	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.959968+00
113	2025-09-24	64	4	PPC	700	275	GOMTINAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.962195+00
114	2025-09-24	124	2	PPC	720	300	BASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.964513+00
115	2025-09-24	119	2	PPC	720	290	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.966698+00
116	2025-09-24	136	2	PPC	720	290	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.96909+00
117	2025-09-24	111	2	PPC	700	295	RAIBAREILLY	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.971347+00
118	2025-09-24	33	2	PPC	1000	280	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.973552+00
119	2025-09-24	15	2	PPC	620	290	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.975824+00
120	2025-09-24	140	2	PPC	1000	295	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.977891+00
121	2025-09-24	97	2	PPC	720	290	KAISEREGANJ	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.979792+00
122	2025-09-24	112	6	PPC	840	305	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.982082+00
123	2025-09-24	112	6	PPC	840	305	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.984294+00
124	2025-09-24	112	6	PPC	840	305	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.98609+00
125	2025-09-25	98	10	OPC	850	305	RUDAULI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.988313+00
126	2025-06-25	24	10	OPC	700	280	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.990762+00
127	2025-09-25	193	12	OPC	840	325	KADIPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.994759+00
128	2025-09-25	70	18	PPC	250	278	IIM	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.99631+00
129	2025-09-25	24	2	PPC	800	280	NAANPARA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:43.99856+00
130	2025-09-26	71	10	OPC	1000	265	KHADDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.000792+00
131	2025-09-27	112	7	OPC	500	305	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.003134+00
132	2025-09-27	112	8	PPC	200	280	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.005405+00
133	2025-09-28	136	6	PPC	840	305	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.007619+00
134	2025-09-28	39	2	PPC	720	260	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.010029+00
135	2025-09-28	125	10	OPC	840	270	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.012071+00
136	2025-09-28	194	2	PPC	720	295	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.015118+00
137	2025-09-29	124	2	PPC	720	280	BASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.017202+00
138	2025-09-30	140	2	PPC	700	295	AYODHA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.019486+00
139	2025-09-30	127	2	PPC	720	290	JAGDISHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.021788+00
140	2025-09-30	191	2	PPC	720	280	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.023845+00
141	2025-09-30	111	2	PPC	1200	295	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.025672+00
142	2025-09-30	111	2	PPC	600	290	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.027205+00
143	2025-09-30	33	2	PPC	720	280	KURSI LKO	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.028737+00
144	2025-09-30	30	2	PPC	700	284	CHINHAT	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.031007+00
145	2025-09-30	24	2	PPC	600	280	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.032622+00
146	2025-09-30	127	2	PPC	700	295	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.034881+00
147	2025-09-30	140	8	PPC	600	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.037561+00
148	2025-09-30	24	2	PPC	620	280	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.039781+00
149	2025-09-30	53	4	PPC	720	275	GOMTINAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.042194+00
150	2025-09-30	59	10	OPC	840	265	DEORIA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.045005+00
151	2025-09-30	127	10	OPC	840	305	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.046981+00
152	2025-09-30	19	6	PPC	700	230	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.049245+00
153	2025-09-30	167	6	PPC	700	231	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.051358+00
154	2025-09-30	136	6	PPC	840	305	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.053476+00
155	2025-10-01	53	8	PPC	500	257	GOMTINAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.06194+00
156	2025-10-01	140	2	PPC	860	290	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.064106+00
157	2025-10-01	112	2	PPC	900	290	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.066423+00
158	2025-10-01	24	2	PPC	720	280	MANIKPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.068681+00
159	2025-10-01	135	2	PPC	620	260	GORAKHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.070923+00
160	2025-10-02	111	2	PPC	720	295	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.072956+00
161	2025-10-02	140	2	PPC	720	260	Sitapur	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.074642+00
162	2025-10-03	194	2	PPC	840	255	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.076971+00
163	2025-10-03	140	4	PPC	720	260	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.079209+00
164	2025-10-03	15	4	PPC	700	265	BALRAMPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.081507+00
165	2025-10-03	58	6	PPC	600	127	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.083522+00
166	2025-10-03	191	4	PPC	700	250	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.085856+00
167	2025-10-04	39	4	PPC	300	265	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.088106+00
168	2025-10-04	9	4	PPC	840	330	DEORIA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.091399+00
169	2025-10-04	191	2	PPC	640	250	SANDILA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.093268+00
170	2025-10-04	53	2	PPC	720	253	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.096307+00
171	2025-10-04	191	2	PPC	700	280	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.098614+00
172	2025-10-04	191	2	PPC	700	280	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.101198+00
173	2025-10-04	139	2	PPC	700	290	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.104048+00
174	2025-10-04	74	2	PPC	900	273	MAINPURI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.1062+00
175	2025-10-04	24	2	PPC	700	280	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.108123+00
176	2025-10-04	15	2	PPC	700	290	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.110059+00
177	2025-10-04	24	2	PPC	720	280	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.112138+00
178	2025-10-04	132	2	PPC	600	280	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.114028+00
179	2025-10-04	176	10	OPC	500	300	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.116346+00
180	2025-10-04	176	10	OPC	350	275	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.11851+00
181	2025-10-04	125	10	OPC	1000	270	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.120867+00
182	2025-10-04	136	10	OPC	860	270	BALLIA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.123034+00
183	2025-10-04	24	10	OPC	490	275	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.124949+00
184	2025-10-04	24	10	OPC	350	270	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.127228+00
185	2025-10-04	191	2	PPC	720	255	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.129383+00
186	2025-10-06	35	6	PPC	380	128	HARDOI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.131221+00
187	2025-10-06	127	1	OPC	720	290	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.133418+00
188	2025-10-06	111	1	OPC	720	295	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.134931+00
189	2025-10-06	33	1	OPC	740	272	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.136862+00
190	2025-10-06	149	1	OPC	600	260	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.139106+00
191	2025-10-07	70	18	PPC	250	278	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.14096+00
192	2025-10-07	65	2	PPC	500	278	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.142494+00
193	2025-10-07	130	2	PPC	700	255	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.144798+00
194	2025-10-07	141	2	PPC	840	280	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.147097+00
195	2025-10-07	71	10	OPC	840	265	SIDDHARTNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.149645+00
196	2025-10-08	36	8	PPC	700	250	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.152471+00
197	2025-10-08	36	8	PPC	700	250	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.154878+00
198	2025-10-08	73	8	PPC	600	267	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.157358+00
199	2025-10-08	15	12	OPC	840	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.159304+00
200	2025-10-08	130	2	PPC	700	255	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.161596+00
201	2025-10-08	33	2	PPC	700	275	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.1639+00
202	2025-10-08	15	4	PPC	700	285	BALRAMPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.166218+00
203	2025-10-08	17	4	PPC	800	300	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.168461+00
204	2025-10-08	135	2	PPC	720	290	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.170714+00
205	2025-10-08	60	19	OPC	600	220	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.172965+00
206	2025-10-09	127	2	PPC	620	290	HAIDERGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.175265+00
207	2025-10-09	24	2	PPC	620	275	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.176941+00
208	2025-10-09	24	2	PPC	720	280	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.179365+00
209	2025-10-10	110	2	PPC	700	278	SANDILA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.181346+00
210	2025-10-11	132	2	PPC	700	285	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.184504+00
211	2025-10-10	39	4	PPC	700	260	BALRAMPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.187876+00
212	2025-10-10	106	22	OTHER	640	320	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.190113+00
213	2025-10-10	136	6	PPC	700	230	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.192405+00
214	2025-10-10	127	6	PPC	840	275	FATEHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.194628+00
215	2025-10-10	106	16	PPC	500	320	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.196705+00
216	2025-10-11	135	10	OPC	200	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.198672+00
217	2025-10-11	135	10	OPC	200	245	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.200874+00
218	2025-10-11	135	10	OPC	440	265	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.203394+00
219	2025-10-13	73	8	PPC	600	267	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.206177+00
220	2025-10-13	194	2	PPC	680	253	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.208455+00
221	2025-10-13	127	4	PPC	700	255	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.210808+00
222	2025-10-13	39	4	PPC	700	260	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.213034+00
223	2025-10-14	130	8	PPC	600	275	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.216464+00
224	2025-10-14	73	8	PPC	600	280	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.218713+00
225	2025-10-14	135	8	PPC	600	261	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.220741+00
226	2025-10-14	194	2	PPC	720	280	SAMBHAL	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.22294+00
227	2025-10-15	71	12	OPC	600	285	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.225226+00
228	2025-10-15	140	2	PPC	700	290	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.227566+00
229	2025-10-15	106	16	PPC	500	284.5	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.229764+00
230	2025-10-15	114	9	DAMAGE	800	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.232219+00
231	2025-10-15	129	9	DAMAGE	550	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.234409+00
232	2025-10-15	12	9	DAMAGE	1400	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.236673+00
233	2025-10-15	167	6	PPC	700	225	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.238911+00
234	2025-10-15	167	6	PPC	700	225	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.241124+00
235	2025-10-16	132	2	PPC	700	280	UNNAO	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.243479+00
236	2025-10-16	53	2	PPC	700	250	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.245252+00
237	2025-10-16	167	6	PPC	840	225	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.247172+00
238	2025-10-16	24	10	OPC	600	275	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.249539+00
239	2025-10-16	71	10	OPC	600	265	SIDDHARTNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.251712+00
240	2025-10-18	112	6	PPC	840	230	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.254017+00
241	2025-10-18	111	2	PPC	700	285	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.257758+00
242	2025-10-18	127	2	PPC	720	290	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.260259+00
243	2025-10-18	15	2	PPC	600	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.268255+00
244	2025-10-18	191	2	PPC	600	250	HARDOI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.270456+00
245	2025-10-18	73	8	PPC	600	267	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.272643+00
246	2025-10-18	129	9	DAMAGE	600	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.274922+00
247	2025-10-18	129	9	DAMAGE	530	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.27726+00
248	2025-10-18	129	9	DAMAGE	630	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.279215+00
249	2025-10-18	27	9	DAMAGE	500	90	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.281201+00
250	2025-10-18	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.283506+00
251	2025-10-24	66	9	DAMAGE	600	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.285782+00
252	2025-10-24	27	9	DAMAGE	500	90	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.287778+00
253	2025-10-24	56	9	DAMAGE	700	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.290142+00
254	2025-10-24	56	9	DAMAGE	700	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.292297+00
255	2025-10-24	171	9	DAMAGE	700	130	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.294576+00
256	2025-10-25	56	9	DAMAGE	660	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.296581+00
257	2025-10-25	57	9	DAMAGE	800	115	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.298911+00
258	2025-10-25	106	16	PPC	500	284.5	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.301157+00
259	2025-10-25	194	2	PPC	700	285	SAMBHAL	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.303461+00
260	2025-10-25	24	2	PPC	700	280	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.305665+00
261	2025-10-25	15	2	PPC	620	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.307311+00
262	2025-10-26	15	12	OPC	700	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.309175+00
263	2025-10-26	129	9	DAMAGE	600	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.311477+00
264	2025-10-26	129	9	DAMAGE	520	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.313744+00
265	2025-10-26	84	7	OPC	600	295	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.316525+00
266	2025-10-26	33	2	PPC	640	280	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.319061+00
267	2025-10-27	171	9	DAMAGE	700	125	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.321374+00
268	2025-10-27	130	2	PPC	740	255	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.323368+00
269	2025-10-27	135	2	PPC	620	260	GORAKHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.325266+00
270	2025-10-28	106	16	PPC	500	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.327192+00
271	2025-10-28	137	9	DAMAGE	800	150	JAGDISHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.32917+00
272	2025-10-28	112	6	PPC	840	230	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.33136+00
273	2025-10-28	134	6	PPC	840	235	AMBEDKER NAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.333773+00
274	2025-10-28	17	6	PPC	700	230	AMBEDKER NAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.335957+00
275	2025-10-28	127	2	PPC	700	285	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.338209+00
276	2025-10-28	111	2	PPC	700	290	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.340137+00
277	2025-10-28	15	2	PPC	620	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.342423+00
278	2025-10-28	139	2	PPC	700	295	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.344476+00
279	2025-10-28	124	2	PPC	600	265	BASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.346357+00
280	2025-10-28	135	10	OPC	700	235	SIDDHARTNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.348294+00
281	2025-10-28	27	9	DAMAGE	550	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.350436+00
282	2025-10-28	16	9	DAMAGE	600	125	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.352758+00
283	2025-10-28	66	9	DAMAGE	600	83	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.354742+00
284	2025-10-28	129	9	DAMAGE	520	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.35679+00
285	2025-10-28	129	9	DAMAGE	670	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.359038+00
286	2025-10-28	129	9	DAMAGE	700	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.361316+00
287	2025-10-29	138	9	DAMAGE	620	85	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.363074+00
288	2025-10-29	134	10	OPC	840	245	AMBEDKER NAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.365307+00
289	2025-10-29	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.368073+00
290	2025-10-29	71	10	OPC	700	265	SIDDHARTNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.370931+00
291	2025-10-29	33	2	PPC	700	278	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.372896+00
292	2025-10-29	111	2	PPC	700	290	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.374795+00
293	2025-10-29	127	2	PPC	700	285	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.377059+00
294	2025-10-29	53	2	PPC	740	250	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.379325+00
295	2025-10-30	65	2	PPC	700	263	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.381606+00
296	2025-10-31	135	2	PPC	700	285	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.385039+00
297	2025-10-31	74	2	PPC	900	277	MAINPURI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.38729+00
298	2025-10-31	138	9	DAMAGE	620	85	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.389233+00
299	2025-10-31	138	9	DAMAGE	600	115	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.391498+00
300	2025-10-31	138	9	DAMAGE	700	115	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.393414+00
301	2025-10-31	12	9	DAMAGE	620	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.395795+00
302	2025-12-01	15	2	PPC	700	285	UNNAO	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.398861+00
303	2025-12-01	112	8	PPC	600	255	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.400868+00
304	2025-12-02	193	2	PPC	700	285	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.403153+00
305	2025-11-02	24	2	PPC	700	275	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.405388+00
306	2025-12-02	171	9	DAMAGE	800	125	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.407769+00
307	2025-12-02	9	4	PPC	700	305	DEORIA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.409437+00
308	2025-12-03	125	10	OPC	1200	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.411776+00
309	2025-12-03	130	2	PPC	720	280	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.414144+00
310	2025-12-03	15	2	PPC	720	285	BALRAMPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.41628+00
311	2025-12-03	127	2	PPC	620	280	JAGDISHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.41854+00
312	2025-12-04	33	2	PPC	700	275	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.420856+00
313	2025-12-04	132	2	PPC	700	285	UNNAO	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.424702+00
314	2025-12-04	112	6	PPC	840	230	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.426973+00
315	2025-12-04	167	6	PPC	700	227	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.429229+00
316	2025-12-04	123	8	PPC	600	260	AYODYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.430823+00
317	2025-12-05	15	2	PPC	700	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.433105+00
318	2025-12-05	135	10	OPC	800	225	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.435363+00
319	2025-12-06	39	2	PPC	700	250	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.437357+00
320	2025-12-06	140	2	PPC	620	285	AYODYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.439709+00
321	2025-12-06	37	2	PPC	300	305	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.441489+00
322	2025-12-06	140	2	PPC	420	285	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.443603+00
323	2025-12-07	15	2	PPC	600	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.445457+00
324	2025-12-07	33	2	PPC	840	275	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.44814+00
325	2025-12-08	61	4	PPC	700	295	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.45348+00
326	2025-12-08	186	6	PPC	700	227	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.455905+00
327	2025-12-08	60	19	OPC	600	220	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.458093+00
328	2025-12-09	106	16	PPC	500	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.460339+00
329	2025-12-09	112	8	PPC	600	255	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.462325+00
330	2025-12-09	71	10	OPC	700	260	SIDDHARTNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.464394+00
331	2025-12-10	24	2	PPC	600	270	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.466794+00
332	2025-12-10	15	2	PPC	700	280	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.469571+00
333	2025-12-10	15	2	PPC	700	280	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.472324+00
334	2025-12-10	139	2	PPC	700	280	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.474517+00
335	2025-12-10	122	2	PPC	600	266	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.476993+00
336	2025-12-10	39	2	PPC	600	250	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.479074+00
337	2025-12-10	97	2	PPC	600	240	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.48138+00
338	2025-12-11	165	6	PPC	700	230	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.484785+00
339	2025-12-12	97	2	PPC	600	240	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.487061+00
340	2025-12-12	130	2	PPC	740	245	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.489296+00
341	2025-12-13	97	10	OPC	700	230	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.49087+00
342	2025-12-13	139	12	OPC	840	281	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.494251+00
343	2025-12-14	24	2	PPC	620	270	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.496514+00
344	2025-12-14	65	2	PPC	500	275	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.498838+00
345	2025-12-14	63	2	PPC	600	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.500971+00
346	2025-12-14	140	2	PPC	720	280	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.503188+00
347	2025-12-14	30	2	PPC	700	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.505391+00
348	2025-12-14	125	10	OPC	1000	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.507695+00
349	2025-12-14	24	10	OPC	840	230	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.510037+00
350	2025-12-14	134	4	PPC	720	295	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.512612+00
351	2025-12-15	186	4	PPC	620	300	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.516259+00
352	2025-12-15	191	4	PPC	700	246	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.518414+00
353	2025-12-15	130	2	PPC	720	280	MORADABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.520676+00
354	2025-12-16	134	10	OPC	840	235	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.522943+00
355	2025-12-16	33	8	PPC	600	245	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.52537+00
356	2025-12-16	33	8	PPC	600	245	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.527995+00
357	2025-12-16	33	2	PPC	720	260	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.5302+00
358	2025-12-16	191	2	PPC	720	240	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.532648+00
359	2025-12-16	191	4	PPC	720	246	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.534755+00
360	2025-12-16	167	6	PPC	840	220	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.537102+00
361	2025-12-17	59	4	PPC	700	250	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.539248+00
362	2025-12-17	136	4	PPC	720	293	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.541305+00
363	2025-12-17	106	16	PPC	500	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.543146+00
364	2025-12-17	127	2	PPC	600	280	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.545131+00
365	2025-12-17	97	2	PPC	600	240	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.547313+00
366	2025-12-17	97	10	OPC	600	230	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.549611+00
367	2025-12-18	134	2	PPC	600	245	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.552958+00
368	2025-12-18	97	2	PPC	720	240	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.555218+00
369	2025-12-18	97	2	PPC	620	240	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.557497+00
370	2025-12-18	71	12	OPC	840	280	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.55976+00
371	2025-12-18	139	12	OPC	840	278	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.561531+00
372	2025-12-18	186	4	PPC	800	250	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.563791+00
373	2025-12-18	127	2	PPC	840	280	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.566266+00
374	2025-12-19	135	6	PPC	840	225	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.568442+00
375	2025-12-19	167	6	PPC	700	220	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.570614+00
376	2025-12-19	47	8	PPC	600	255	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.572985+00
377	2025-12-19	33	8	PPC	390	245	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.575169+00
378	2025-12-19	39	2	PPC	640	250	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.577723+00
379	2025-12-20	186	6	PPC	840	227	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.580373+00
380	2025-12-20	97	2	PPC	600	240	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.582583+00
381	2025-12-20	130	2	PPC	700	240	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.585724+00
382	2025-12-20	132	2	PPC	700	260	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.587964+00
383	2025-12-20	15	2	PPC	600	280	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.590192+00
384	2025-12-20	24	2	PPC	700	270	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.592608+00
385	2025-12-20	97	2	PPC	600	270	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.594812+00
386	2025-12-24	15	2	PPC	600	240	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.596911+00
387	2025-12-20	195	10	OPC	540	230	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.600379+00
388	2025-12-20	195	10	OPC	300	260	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.602477+00
389	2025-12-21	97	2	PPC	600	240	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.604773+00
390	2025-12-22	71	10	OPC	700	260	SIDDHARTNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.607003+00
391	2025-12-22	97	4	PPC	700	275	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.609237+00
392	2025-12-22	38	2	PPC	700	265	MAINPURI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.611213+00
393	2025-12-23	136	6	PPC	700	225	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.613475+00
394	2025-12-23	134	7	OPC	700	282	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.616048+00
395	2025-12-23	33	2	PPC	700	260	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.618288+00
396	2025-12-23	127	2	PPC	840	280	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.621052+00
397	2025-12-24	125	10	OPC	1200	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.623312+00
398	2025-12-24	136	4	PPC	700	275	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.625353+00
399	2025-12-25	78	12	OPC	840	280	VARANASI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.62758+00
400	2025-12-25	15	2	PPC	1220	280	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.629891+00
401	2025-12-25	140	2	PPC	700	280	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.632043+00
402	2025-12-25	24	2	PPC	600	260	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.63455+00
403	2025-12-25	167	6	PPC	700	220	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.636796+00
404	2025-12-25	179	8	PPC	500	265	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.639011+00
405	2025-12-25	179	8	PPC	100	265	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.640556+00
406	2025-12-25	84	7	OPC	700	290	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.642459+00
407	2025-12-25	180	8	PPC	200	270	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.643987+00
408	2025-12-26	24	10	OPC	840	215	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.645519+00
409	2025-12-27	71	10	OPC	900	260	SIDDHARTNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.647426+00
410	2025-12-27	78	12	OPC	840	280	VARANASI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.649276+00
411	2025-12-27	110	2	PPC	640	260	HARDOI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.65105+00
412	2025-12-27	127	2	PPC	720	280	HARDOI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.652999+00
413	2025-12-28	68	2	PPC	600	290	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.654856+00
414	2025-12-28	33	2	PPC	700	248	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.656333+00
415	2025-12-28	130	2	PPC	840	245	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.658242+00
416	2025-11-28	191	2	PPC	600	245	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.660152+00
417	2025-12-28	20	16	PPC	400	293	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.662088+00
418	2025-12-28	106	16	PPC	100	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.664347+00
419	2025-12-29	112	8	PPC	600	250	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.666651+00
420	2025-12-29	98	2	PPC	700	280	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.668232+00
421	2025-12-29	126	2	PPC	840	270	SITAPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.670291+00
422	2025-12-29	71	12	OPC	600	280	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.672084+00
423	2025-12-29	106	15	PPC	840	299.5	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.674026+00
424	2025-12-29	132	2	PPC	700	265	UNNAO	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.675971+00
425	2025-12-30	78	4	PPC	700	270	VARANASI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.678866+00
426	2025-12-30	97	4	PPC	700	275	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.683579+00
427	2025-12-30	112	6	PPC	840	225	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.685596+00
428	2025-12-30	112	6	PPC	700	225	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.687743+00
429	2025-12-30	195	2	PPC	1240	280	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.689281+00
430	2025-12-30	63	2	PPC	720	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.691136+00
431	2025-12-30	33	2	PPC	1240	265	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.693413+00
432	2026-02-01	191	2	PPC	700	260	LUCKNOW	\N	\N	\N	\N	\N	UP84BT2082	\N	\N	2026-04-07 21:28:44.697635+00
433	2026-02-01	191	2	PPC	700	280	AMBEDKERNAGAR	\N	\N	\N	\N	\N	UP33BT5512	\N	\N	2026-04-07 21:28:44.69981+00
434	2026-02-01	160	2	PPC	700	260	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.701715+00
435	2026-02-01	39	2	PPC	700	260	GONDA	\N	\N	\N	\N	\N	UP81DT2035	\N	\N	2026-04-07 21:28:44.703881+00
436	2026-02-01	122	2	PPC	540	280	GONDA	\N	\N	\N	\N	\N	UP81DT2035	\N	\N	2026-04-07 21:28:44.705965+00
437	2026-02-01	84	2	PPC	600	290	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.707749+00
438	2026-02-03	130	2	PPC	1000	260	LUCKNOW	\N	\N	\N	\N	\N	UP32WN3321	\N	\N	2026-04-07 21:28:44.710041+00
439	2026-02-03	191	2	PPC	700	260	SANDILA	\N	\N	\N	\N	\N	UP16NT7134	\N	\N	2026-04-07 21:28:44.712269+00
440	2026-02-03	191	2	PPC	700	260	MALLAWAN	\N	\N	\N	\N	\N	UP16KT4426	\N	\N	2026-04-07 21:28:44.714452+00
441	2026-02-03	77	2	PPC	700	290	UNNAO	\N	\N	\N	\N	\N	UP84BT1506	\N	\N	2026-04-07 21:28:44.716685+00
442	2026-02-03	112	2	PPC	700	295	SULTANPUR	\N	\N	\N	\N	\N	UP32UN3171	\N	\N	2026-04-07 21:28:44.718783+00
443	2026-02-03	140	2	PPC	700	260	BARABANKI	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:44.720545+00
444	2026-02-03	191	2	PPC	700	260	BARABANKI	\N	\N	\N	\N	\N	UP84BT2083	\N	\N	2026-04-07 21:28:44.722879+00
445	2026-02-04	167	6	PPC	700	240	AZAMGARH	\N	\N	\N	\N	\N	UP62CT7460	\N	\N	2026-04-07 21:28:44.724397+00
446	2026-02-04	167	6	PPC	700	240	AZAMGARH	\N	\N	\N	\N	\N	UP62CT2417	\N	\N	2026-04-07 21:28:44.726458+00
447	2026-02-04	186	6	PPC	840	247	AZAMGARH	\N	\N	\N	\N	\N	MP19HA9972	\N	\N	2026-04-07 21:28:44.729139+00
449	2026-02-04	160	2	PPC	640	275	SULTANPUR	\N	\N	\N	\N	\N	UP32JN4971	\N	\N	2026-04-07 21:28:44.733601+00
450	2026-02-04	97	10	OPC	520	260	AZAMGARH	\N	\N	\N	\N	\N	RJ10GC0587	\N	\N	2026-04-07 21:28:44.735869+00
451	2026-02-04	97	10	OPC	350	230	AZAMGARH	\N	\N	\N	\N	\N	RJ10GC0587	\N	\N	2026-04-07 21:28:44.738096+00
452	2026-02-03	97	10	OPC	840	260	GAZIPUR	\N	\N	\N	\N	\N	RJ13GC4980	\N	\N	2026-04-07 21:28:44.740327+00
453	2026-02-03	97	10	OPC	870	260	GAZIPUR	\N	\N	\N	\N	\N	RJ31GB3363	\N	\N	2026-04-07 21:28:44.742249+00
454	2026-02-05	134	10	OPC	840	260	AMBEDKERNAGAR	\N	\N	\N	\N	\N	UP54T9035	\N	\N	2026-04-07 21:28:44.74426+00
455	2026-02-05	134	10	OPC	840	235	AMBEDKERNAGAR	\N	\N	\N	\N	\N	UP54T8919	\N	\N	2026-04-07 21:28:44.746369+00
456	2026-02-05	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	RJ14GJ5185	\N	\N	2026-04-07 21:28:44.74876+00
457	2026-02-03	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	RJ52GA3383	\N	\N	2026-04-07 21:28:44.750964+00
458	2026-02-05	93	21	OPC	840	276	BASTI	\N	\N	\N	\N	\N	UP53GT8473	\N	\N	2026-04-07 21:28:44.752911+00
459	2026-02-06	15	12	OPC	700	280	BALRAMPUR	\N	\N	\N	\N	\N	UP62CT2727	\N	\N	2026-04-07 21:28:44.75522+00
460	2026-02-06	97	10	OPC	840	260	AZAMGARH	\N	\N	\N	\N	\N	UP61AT4187	\N	\N	2026-04-07 21:28:44.757446+00
461	2026-02-06	24	10	OPC	840	230	BAHRAICH	\N	\N	\N	\N	\N	RJ14GN8851	\N	\N	2026-04-07 21:28:44.759468+00
462	2026-02-07	136	10	OPC	860	260	AZAMGARH	\N	\N	\N	\N	\N	UP53HT9208	\N	\N	2026-04-07 21:28:44.76183+00
463	2026-02-07	129	10	OPC	850	260	ALLAHABAD	\N	\N	\N	\N	\N	JH14L08010	\N	\N	2026-04-07 21:28:44.76384+00
464	2026-02-07	84	2	PPC	720	300	JAGDISHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.766189+00
465	2026-02-07	98	2	PPC	700	300	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.767987+00
466	2026-02-07	127	2	PPC	500	270	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.770035+00
467	2026-02-07	69	2	PPC	720	285	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.773049+00
468	2026-02-08	97	10	OPC	300	260	GHAZIPUR	\N	\N	\N	\N	\N	UP65FP5211	\N	\N	2026-04-07 21:28:44.774857+00
469	2026-02-08	97	10	OPC	300	235	GHAZIPUR	\N	\N	\N	\N	\N	UP65FP5211	\N	\N	2026-04-07 21:28:44.776801+00
470	2026-02-08	97	10	OPC	640	260	AZAMGARH	\N	\N	\N	\N	\N	UP65FT1395	\N	\N	2026-04-07 21:28:44.779547+00
471	2026-02-08	196	10	OPC	700	230	SHRAVASTI	\N	\N	\N	\N	\N	UP25ET1418	\N	\N	2026-04-07 21:28:44.783584+00
472	2026-02-08	136	10	OPC	300	235	AZAMGARH	\N	\N	\N	\N	\N	UP50BT5706	\N	\N	2026-04-07 21:28:44.785964+00
473	2026-02-08	136	10	OPC	300	260	AZAMGARH	\N	\N	\N	\N	\N	UP50BT5706	\N	\N	2026-04-07 21:28:44.788115+00
474	2026-02-08	125	10	OPC	1000	235	GONDA	\N	\N	\N	\N	\N	RJ14GH2618	\N	\N	2026-04-07 21:28:44.790486+00
475	2026-02-08	139	2	PPC	700	295	DOSTPUR SULTANPUR	\N	\N	\N	\N	\N	UP72AT3024	\N	\N	2026-04-07 21:28:44.792646+00
476	2026-02-08	40	2	PPC	800	260	PARA lko	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:44.79493+00
477	2026-02-08	5	2	PPC	500	303	SAFEDABAD BBK	\N	\N	\N	\N	\N	UP32EN5497	\N	\N	2026-04-07 21:28:44.796877+00
478	2026-02-08	41	2	PPC	600	250	KADIPUR SULTANPUR	\N	\N	\N	\N	\N	RJ34GB0554	\N	\N	2026-04-07 21:28:44.799013+00
479	2026-02-08	33	2	PPC	500	306	KURSHI ROAD LKO	\N	\N	\N	\N	\N	UP32HN9763	\N	\N	2026-04-07 21:28:44.801128+00
480	2026-02-08	41	2	PPC	700	250	SULTANPUR	\N	\N	\N	\N	\N	RJ34GB0554	\N	\N	2026-04-07 21:28:44.803295+00
481	2026-02-09	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	RJ14GN8852	\N	\N	2026-04-07 21:28:44.805859+00
482	2026-02-10	5	2	PPC	540	303	MOHANLALGANJ	\N	\N	\N	\N	\N	UP32HN9763	\N	\N	2026-04-07 21:28:44.807867+00
483	2026-02-10	5	2	PPC	700	303	SAFEDABAD BBK	\N	\N	\N	\N	\N	UP35AT1366	\N	\N	2026-04-07 21:28:44.809856+00
484	2026-02-10	5	2	PPC	840	303	SAFEDABAD BBK	\N	\N	\N	\N	\N	UP32WN3321	\N	\N	2026-04-07 21:28:44.812137+00
485	2026-02-10	5	2	PPC	1000	303	SAFEDABAD BBK	\N	\N	\N	\N	\N	UP32KN1956	\N	\N	2026-04-07 21:28:44.814594+00
486	2026-02-10	33	2	PPC	540	306	KURSHI ROAD LKO	\N	\N	\N	\N	\N	UP32EN5497	\N	\N	2026-04-07 21:28:44.816796+00
487	2026-02-10	33	2	PPC	720	306	KURSHI ROAD LKO	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:44.818926+00
488	2026-02-10	196	10	OPC	820	235	SHRAVASTI	\N	\N	\N	\N	\N	PB05AQ9355	\N	\N	2026-04-07 21:28:44.82111+00
489	2026-02-10	63	2	PPC	1100	270	CHINHAT LKO	\N	\N	\N	\N	\N	RJ11GC8258	\N	\N	2026-04-07 21:28:44.823309+00
490	2026-02-10	39	2	PPC	1000	290	AYODHYA	\N	\N	\N	\N	\N	UP81FT1408	\N	\N	2026-04-07 21:28:44.82524+00
491	2026-02-10	74	2	PPC	800	280	\N	\N	\N	\N	\N	\N	UP84BT2083	\N	\N	2026-04-07 21:28:44.827548+00
492	2026-02-11	125	10	OPC	820	235	GONDA	\N	\N	\N	\N	\N	PB05AR9865	\N	\N	2026-04-07 21:28:44.830699+00
493	2026-02-12	197	10	OPC	840	260	AYODHYA	\N	\N	\N	\N	\N	BR02GD9015	\N	\N	2026-04-07 21:28:44.83488+00
494	2026-02-12	23	2	PPC	720	260	GONDA	\N	\N	\N	\N	\N	UP32QN5071	\N	\N	2026-04-07 21:28:44.837337+00
495	2026-02-12	40	2	PPC	814.4	300	PARA LKO	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.839834+00
496	2026-02-12	5	2	PPC	700	303	MOHANLALGANJ	\N	\N	\N	\N	\N	UP32FN6083	\N	\N	2026-04-07 21:28:44.841754+00
497	2026-02-13	5	2	PPC	700	303	MOHANLALGANJ	\N	\N	\N	\N	\N	UP32FN6083	\N	\N	2026-04-07 21:28:44.844044+00
498	2026-02-13	5	2	PPC	700	303	MOHANLALGANJ	\N	\N	\N	\N	\N	UP32DN4696	\N	\N	2026-04-07 21:28:44.846418+00
499	2026-02-13	5	2	PPC	500	303	MOHANLALGANJ	\N	\N	\N	\N	\N	UP78AN9031	\N	\N	2026-04-07 21:28:44.848478+00
500	2026-02-14	148	2	PPC	500	279	\N	\N	\N	\N	\N	\N	UP94T8188	\N	\N	2026-04-07 21:28:44.850767+00
501	2026-02-14	40	2	PPC	700	265	PARA LKO	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:44.853082+00
502	2026-02-14	97	10	OPC	600	235	BAHRAICH	\N	\N	\N	\N	\N	UP40T8913	\N	\N	2026-04-07 21:28:44.855326+00
503	2026-02-15	49	2	PPC	400	275	BANGLABAZAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:44.858321+00
504	2026-02-16	112	6	PPC	840	245	SULTANPUR	\N	\N	\N	\N	\N	MP19HA9966	\N	\N	2026-04-07 21:28:44.860696+00
505	2026-02-16	167	6	PPC	840	250	AZAMGARH	\N	\N	\N	\N	\N	MP19HA9972	\N	\N	2026-04-07 21:28:44.862897+00
506	2026-02-16	135	6	PPC	840	245	BALRAMPUR	\N	\N	\N	\N	\N	UP51AT3733	\N	\N	2026-04-07 21:28:44.865351+00
507	2026-02-16	5	2	PPC	600	303	SAFEDABAD BBK	\N	\N	\N	\N	\N	UP32FN6083	\N	\N	2026-04-07 21:28:44.867571+00
508	2026-02-16	5	2	PPC	400	303	MOHANLALGANJ	\N	\N	\N	\N	\N	UP32AN9031	\N	\N	2026-04-07 21:28:44.869785+00
509	2026-02-16	5	2	PPC	600	303	MOHANLALGANJ	\N	\N	\N	\N	\N	UP53BT1777	\N	\N	2026-04-07 21:28:44.872157+00
510	2026-02-16	5	2	PPC	1000	303	SAFEDABAD BBK	\N	\N	\N	\N	\N	UP32KN1956	\N	\N	2026-04-07 21:28:44.874222+00
511	2026-02-16	69	2	PPC	700	290	MAHARAJGANJ	\N	\N	\N	\N	\N	UP31BT1610	\N	\N	2026-04-07 21:28:44.87629+00
512	2026-02-16	134	2	PPC	700	310	AMBEDKARNAGAR	\N	\N	\N	\N	\N	UP32JN4971	\N	\N	2026-04-07 21:28:44.878519+00
513	2026-02-16	40	2	PPC	720	300	PARA lko	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:44.880816+00
514	2026-02-17	30	2	PPC	600	285	CHINHAT	\N	\N	\N	\N	\N	UP53BT1777	\N	\N	2026-04-07 21:28:44.884318+00
515	2026-02-17	49	2	PPC	400	305	NADERGANJ	\N	\N	\N	\N	\N	UP78AN9031	\N	\N	2026-04-07 21:28:44.886932+00
516	2026-02-17	76	2	PPC	700	305	KISHAN PATH LKO	\N	\N	\N	\N	\N	UP32DN4696	\N	\N	2026-04-07 21:28:44.889302+00
517	2026-02-17	76	2	PPC	600	305	KISHAN PATH LKO	\N	\N	\N	\N	\N	UP78BN2796	\N	\N	2026-04-07 21:28:44.891483+00
518	2026-02-17	5	2	PPC	800	303	MOHANLALGANJ	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:44.893779+00
519	2026-02-17	93	2	PPC	700	310	BASTI	\N	\N	\N	\N	\N	UP32SN8171	\N	\N	2026-04-07 21:28:44.895613+00
520	2026-02-17	97	10	OPC	1000	260	AZAMGARH	\N	\N	\N	\N	\N	UP54AT0234	\N	\N	2026-04-07 21:28:44.897112+00
521	2026-02-17	134	10	OPC	400	265	AMBEDKARNAGAR	\N	\N	\N	\N	\N	BR24GB5812	\N	\N	2026-04-07 21:28:44.899506+00
522	2026-02-17	134	10	OPC	440	235	AMBEDKARNAGAR	\N	\N	\N	\N	\N	BR24GB5812	\N	\N	2026-04-07 21:28:44.901544+00
523	2026-02-17	69	2	PPC	700	280	SITAPUR	\N	\N	\N	\N	\N	UP82T9357	\N	\N	2026-04-07 21:28:44.903859+00
524	2026-02-17	74	2	PPC	1000	290	MAINPURI	\N	\N	\N	\N	\N	UP84AT0833	\N	\N	2026-04-07 21:28:44.905686+00
525	2026-02-17	40	2	PPC	814.8	300	PARA	\N	\N	\N	\N	\N	HR45E0367	\N	\N	2026-04-07 21:28:44.907213+00
526	2026-02-17	40	2	PPC	836.8	300	PARA	\N	\N	\N	\N	\N	HR38AL4003	\N	\N	2026-04-07 21:28:44.909153+00
527	2026-02-17	93	2	PPC	840	310	BASTI	\N	\N	\N	\N	\N	UP81DT4813	\N	\N	2026-04-07 21:28:44.910661+00
528	2026-02-17	140	2	PPC	720	300	BARABANKI	\N	\N	\N	\N	\N	UP32QN2171	\N	\N	2026-04-07 21:28:44.91214+00
529	2026-02-18	196	10	OPC	700	230	SHRAVASTI	\N	\N	\N	\N	\N	RJ14GH4995	\N	\N	2026-04-07 21:28:44.913604+00
530	2026-02-18	136	10	OPC	540	260	AZAMGARH	\N	\N	\N	\N	\N	UP53HT9208	\N	\N	2026-04-07 21:28:44.915687+00
531	2026-02-18	136	10	OPC	300	230	AZAMGARH	\N	\N	\N	\N	\N	UP53HT9208	\N	\N	2026-04-07 21:28:44.917824+00
532	2026-02-18	106	13	OPC	100	285	JEHTA	\N	\N	\N	\N	\N	UP32RT6962	\N	\N	2026-04-07 21:28:44.920128+00
533	2026-02-18	64	13	OPC	100	290	MADIYAON	\N	\N	\N	\N	\N	UP32RT6962	\N	\N	2026-04-07 21:28:44.922092+00
534	2026-02-18	186	6	PPC	700	250	AZAMGARH	\N	\N	\N	\N	\N	UP62CT5547	\N	\N	2026-04-07 21:28:44.924454+00
535	2026-02-18	167	6	PPC	700	250	AZAMGARH	\N	\N	\N	\N	\N	UP62CT7460	\N	\N	2026-04-07 21:28:44.92669+00
536	2026-02-18	140	2	PPC	700	300	RAMNAGAR	\N	\N	\N	\N	\N	UP32TN6097	\N	\N	2026-04-07 21:28:44.928868+00
537	2026-02-18	182	2	PPC	700	305	DARIYABAD BBK	\N	\N	\N	\N	\N	UP81ET7303	\N	\N	2026-04-07 21:28:44.930888+00
538	2026-02-18	97	2	PPC	700	275	GOMTINAGAR	\N	\N	\N	\N	\N	UP32SNO797	\N	\N	2026-04-07 21:28:44.933143+00
539	2026-02-18	97	2	PPC	840	305	GONDA	\N	\N	\N	\N	\N	UP81DT2742	\N	\N	2026-04-07 21:28:44.935693+00
540	2026-02-18	182	2	PPC	700	272	BARABANKI	\N	\N	\N	\N	\N	UP33CT6956	\N	\N	2026-04-07 21:28:44.938365+00
541	2026-02-18	30	2	PPC	700	305	\N	\N	\N	\N	\N	\N	UP81BT8328	\N	\N	2026-04-07 21:28:44.940178+00
542	2026-02-18	112	2	PPC	200	310	SAIFULA GANJ SULTANPUR	\N	\N	\N	\N	\N	UP31CT5569	\N	\N	2026-04-07 21:28:44.942133+00
543	2026-02-18	136	2	PPC	500	305	KADIPUR SULTANPUR	\N	\N	\N	\N	\N	UP31CT5569	\N	\N	2026-04-07 21:28:44.943658+00
544	2026-02-18	63	2	PPC	600	269	\N	\N	\N	\N	\N	\N	UP81FT2864	\N	\N	2026-04-07 21:28:44.945232+00
545	2026-02-18	68	2	PPC	600	300	SAFEDABAD	\N	\N	\N	\N	\N	UP81FT2864	\N	\N	2026-04-07 21:28:44.946682+00
546	2026-02-18	182	2	PPC	700	272	SITAPUR	\N	\N	\N	\N	\N	HR69D3484	\N	\N	2026-04-07 21:28:44.948204+00
547	2026-02-18	97	2	PPC	700	275	SHRAVASTI	\N	\N	\N	\N	\N	UP31BT2523	\N	\N	2026-04-07 21:28:44.950476+00
548	2026-02-18	69	2	PPC	600	280	SHAKUNTALA LKO	\N	\N	\N	\N	\N	UP82AT1702	\N	\N	2026-04-07 21:28:44.953153+00
549	2026-02-18	106	2	PPC	700	275	GOPRAMAU	\N	\N	\N	\N	\N	UP82AT1702	\N	\N	2026-04-07 21:28:44.955423+00
550	2026-02-19	36	2	PPC	740	305	\N	\N	\N	\N	\N	\N	HR38Z3119	\N	\N	2026-04-07 21:28:44.957665+00
551	2026-02-19	55	2	PPC	640	275	PAYAGPUR BAHRAICH	\N	\N	\N	\N	\N	UP81GT6482	\N	\N	2026-04-07 21:28:44.959689+00
552	2026-02-19	40	2	PPC	720	300	SULTANPUR ROAD	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:44.962013+00
553	2026-02-19	5	2	PPC	600	303	SAFEDABAD	\N	\N	\N	\N	\N	UP32FN6083	\N	\N	2026-04-07 21:28:44.964215+00
554	2026-02-20	40	2	PPC	816	305	PARA ROAD	\N	\N	\N	\N	\N	HR47G6204	\N	\N	2026-04-07 21:28:44.968828+00
555	2026-02-20	40	2	PPC	815.2	305	PARA ROAD	\N	\N	\N	\N	\N	HR38AF9900	\N	\N	2026-04-07 21:28:44.971013+00
556	2026-02-20	198	2	PPC	620	268	GONDA	\N	\N	\N	\N	\N	UP33AT9899	\N	\N	2026-04-07 21:28:44.974027+00
557	2026-02-20	198	2	PPC	700	268	GONDA	\N	\N	\N	\N	\N	UP32WN9471	\N	\N	2026-04-07 21:28:44.975932+00
558	2026-02-20	41	2	PPC	700	260	\N	\N	\N	\N	\N	\N	UP84BT1507	\N	\N	2026-04-07 21:28:44.977924+00
559	2026-02-20	136	2	PPC	640	275	\N	\N	\N	\N	\N	\N	UP81DT4828	\N	\N	2026-04-07 21:28:44.980153+00
560	2026-02-20	36	2	PPC	540	277	UNNAO	\N	\N	\N	\N	\N	UP32HN9761	\N	\N	2026-04-07 21:28:44.98255+00
561	2026-02-20	36	13	OPC	300	277	MOHANLALGANJ	\N	\N	\N	\N	\N	UP30T6276	\N	\N	2026-04-07 21:28:44.984688+00
562	2026-02-20	36	13	OPC	540	277	SAFDARGABJ BBK	\N	\N	\N	\N	\N	UP32FN3424	\N	\N	2026-04-07 21:28:44.987443+00
563	2026-02-20	199	13	OPC	100	290	PARA LKO	\N	\N	\N	\N	\N	UP32RT6962	\N	\N	2026-04-07 21:28:44.991334+00
564	2026-02-20	45	13	OPC	100	290	DALIGANJ	\N	\N	\N	\N	\N	UP32RT6963	\N	\N	2026-04-07 21:28:44.993755+00
565	2026-02-20	64	13	OPC	100	290	MADIYAON	\N	\N	\N	\N	\N	UP32RT6964	\N	\N	2026-04-07 21:28:44.995965+00
566	2026-02-20	45	13	OPC	200	290	KHESHRI KHEDA LKO	\N	\N	\N	\N	\N	UP32LE5943	\N	\N	2026-04-07 21:28:44.998201+00
567	2026-02-21	196	10	OPC	840	230	SARAVASTI	\N	\N	\N	\N	\N	RJ14GJ1697	\N	\N	2026-04-07 21:28:45.000495+00
568	2026-02-21	24	10	OPC	680	230	BAHRAICH	\N	\N	\N	\N	\N	UP36T2707	\N	\N	2026-04-07 21:28:45.002557+00
569	2026-02-22	24	2	PPC	700	270	MANIKPUR	\N	\N	\N	\N	\N	UP33CT8164	\N	\N	2026-04-07 21:28:45.004602+00
570	2026-02-22	36	2	PPC	200	278	HARDOIYA MOD MOHAN ROAD	\N	\N	\N	\N	\N	UP32GM6727	\N	\N	2026-04-07 21:28:45.006779+00
571	2026-02-22	36	2	PPC	220	278	BIJNOR	\N	\N	\N	\N	\N	UP30BT3651	\N	\N	2026-04-07 21:28:45.008906+00
729	2026-01-21	33	2	PPC	1100	290	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.376848+00
572	2026-02-22	36	2	PPC	500	278	AMAUSI	\N	\N	\N	\N	\N	UP32DN0993	\N	\N	2026-04-07 21:28:45.011049+00
573	2026-02-22	36	2	PPC	300	250	ARJUNGANJ	\N	\N	\N	\N	\N	UP30T3091	\N	\N	2026-04-07 21:28:45.013332+00
574	2026-02-22	36	2	PPC	250	278	AMAUSI LKO	\N	\N	\N	\N	\N	UP32FN8872	\N	\N	2026-04-07 21:28:45.015778+00
575	2026-02-22	36	2	PPC	200	278	HARDOIYA MOD MOHAN ROAD	\N	\N	\N	\N	\N	UP32GM6727	\N	\N	2026-04-07 21:28:45.017913+00
576	2026-02-22	33	2	PPC	600	306	KURSI ROAD	\N	\N	\N	\N	\N	UP32DN4696	\N	\N	2026-04-07 21:28:45.01988+00
577	2026-02-22	177	2	PPC	600	277	THARI MALL	\N	\N	\N	\N	\N	UP78BN2796	\N	\N	2026-04-07 21:28:45.022121+00
578	2026-02-22	191	2	PPC	600	280	KURSI BBK	\N	\N	\N	\N	\N	UP32FN6083	\N	\N	2026-04-07 21:28:45.02364+00
579	2026-02-22	191	13	OPC	700	250	GOMTINAGAR LKO	\N	\N	\N	\N	\N	UP53BT1777	\N	\N	2026-04-07 21:28:45.025557+00
580	2026-02-23	39	13	OPC	800	300	CG CITY PHOENIX PLASSIO	\N	\N	\N	\N	\N	UP32ST6862	\N	\N	2026-04-07 21:28:45.028234+00
581	2026-02-23	33	13	OPC	800	305	KURSHI ROAD	\N	\N	\N	\N	\N	UP32ST6861	\N	\N	2026-04-07 21:28:45.030457+00
582	2026-02-23	36	2	PPC	300	250	BKT LKO	\N	\N	\N	\N	\N	UP30T6276	\N	\N	2026-04-07 21:28:45.032174+00
583	2026-02-23	36	2	PPC	425	250	AMAUSI	\N	\N	\N	\N	\N	UP77AN3027	\N	\N	2026-04-07 21:28:45.034363+00
584	2026-02-23	111	13	OPC	600	280	PARSDEPUR  RAEBARELI	\N	\N	\N	\N	\N	UP33T7189	\N	\N	2026-04-07 21:28:45.036259+00
585	2026-02-23	111	13	OPC	600	280	PARSDEPUR  RAEBARELI	\N	\N	\N	\N	\N	UP33AT6715	\N	\N	2026-04-07 21:28:45.039089+00
586	2026-02-23	106	13	OPC	150	285	KASHMANDI LKO	\N	\N	\N	\N	\N	UP32JN5417	\N	\N	2026-04-07 21:28:45.0418+00
587	2026-02-23	194	13	OPC	110	285	\N	\N	\N	\N	\N	\N	UP32RT4908	\N	\N	2026-04-07 21:28:45.044043+00
588	2026-02-23	69	2	PPC	840	280	SITAPUR	\N	\N	\N	\N	\N	UP32WN3321	\N	\N	2026-04-07 21:28:45.045958+00
589	2026-02-23	198	2	PPC	1260	265	GONDA	\N	\N	\N	\N	\N	HR58E8864	\N	\N	2026-04-07 21:28:45.047829+00
590	2026-02-24	41	2	PPC	680	260	SULTANPUR	\N	\N	\N	\N	\N	UP81DT4110	\N	\N	2026-04-07 21:28:45.050097+00
591	2026-02-24	15	2	PPC	700	305	BAHRAICH	\N	\N	\N	\N	\N	RJ29GB8204	\N	\N	2026-04-07 21:28:45.051614+00
592	2026-02-24	49	2	PPC	700	260	SULTANPUR	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:45.053933+00
593	2026-02-24	140	2	PPC	700	305	\N	\N	\N	\N	\N	\N	UP53DT9907	\N	\N	2026-04-07 21:28:45.056167+00
594	2026-02-25	36	2	PPC	840	270	GONDA	\N	\N	\N	\N	\N	UP31AT7266	\N	\N	2026-04-07 21:28:45.058066+00
595	2026-02-25	36	2	PPC	740	270	GONDA	\N	\N	\N	\N	\N	UP47T3324	\N	\N	2026-04-07 21:28:45.060321+00
596	2026-02-25	191	2	PPC	600	250	CHARBAGH LKO	\N	\N	\N	\N	\N	UP32DN7475	\N	\N	2026-04-07 21:28:45.061831+00
597	2026-02-25	106	2	PPC	215	260	GOPRAMAU LKO	\N	\N	\N	\N	\N	UP53BT1777	\N	\N	2026-04-07 21:28:45.064553+00
598	2026-02-25	140	2	PPC	700	285	MATI	\N	\N	\N	\N	\N	UP33AT7322	\N	\N	2026-04-07 21:28:45.066601+00
599	2026-02-25	127	2	PPC	720	308	AMETHI	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:45.068639+00
600	2026-02-25	80	13	OPC	200	290	MALIHABAD LKO	\N	\N	\N	\N	\N	UP32JQ4302	\N	\N	2026-04-07 21:28:45.070843+00
601	2026-02-25	33	13	OPC	800	306	KURSHI ROAD	\N	\N	\N	\N	\N	UP32ST6861	\N	\N	2026-04-07 21:28:45.072661+00
602	2026-02-25	191	13	OPC	800	280	DUBBAGA	\N	\N	\N	\N	\N	UP32ST7183	\N	\N	2026-04-07 21:28:45.074163+00
603	2026-02-25	49	13	OPC	100	290	\N	\N	\N	\N	\N	\N	UP32RT4908	\N	\N	2026-04-07 21:28:45.075671+00
604	2026-02-25	33	13	OPC	800	306	KURSI ROAD	\N	\N	\N	\N	\N	UP32ST6862	\N	\N	2026-04-07 21:28:45.077204+00
605	2026-04-01	68	2	PPC	500	305	SAFEDABAD BBK	\N	\N	\N	\N	\N	UP32ST7183	\N	\N	2026-04-07 21:28:45.07834+00
606	2026-04-01	68	2	PPC	400	305	DADRA BBK	\N	\N	\N	\N	\N	UP32ST7183	\N	\N	2026-04-07 21:28:45.079231+00
607	2026-04-01	167	6	PPC	700	240	AZAMGARH	\N	\N	\N	\N	\N	UP62CT5547	\N	\N	2026-04-07 21:28:45.080069+00
608	2026-04-01	40	2	PPC	814.4	310	PARA	\N	\N	\N	\N	\N	HR45E3947	\N	\N	2026-04-07 21:28:45.082044+00
609	2026-04-02	69	2	PPC	700	275	KANPUR	\N	\N	\N	\N	\N	UP81CT1857	\N	\N	2026-04-07 21:28:45.08428+00
610	2026-04-02	139	2	PPC	600	295	DOSTPUR	\N	\N	\N	\N	\N	UP33AT6446	\N	\N	2026-04-07 21:28:45.087052+00
611	2026-04-02	136	2	PPC	600	305	DOSTPUR	\N	\N	\N	\N	\N	UP33AT7517	\N	\N	2026-04-07 21:28:45.089597+00
612	2026-04-03	200	2	PPC	720	300	\N	\N	\N	\N	\N	\N	UP32ST7183	\N	\N	2026-04-07 21:28:45.092656+00
613	2026-04-03	182	2	PPC	720	300	\N	\N	\N	\N	\N	\N	UP32ST6862	\N	\N	2026-04-07 21:28:45.094963+00
614	2026-04-04	39	2	PPC	720	270	\N	\N	\N	\N	\N	\N	UP33CT7764	\N	\N	2026-04-07 21:28:45.097209+00
615	2026-04-04	136	2	PPC	600	268	SAIFULLAGANJ	\N	\N	\N	\N	\N	UP32JN8787	\N	\N	2026-04-07 21:28:45.099638+00
616	2026-04-04	15	2	PPC	600	305	\N	\N	\N	\N	\N	\N	UP51AT3860	\N	\N	2026-04-07 21:28:45.101884+00
617	2026-04-05	139	2	PPC	700	295	\N	\N	\N	\N	\N	\N	UP33CT7290	\N	\N	2026-04-07 21:28:45.10408+00
618	2026-04-05	73	2	PPC	800	265	\N	\N	\N	\N	\N	\N	UP32ST6862	\N	\N	2026-04-07 21:28:45.106912+00
619	2026-04-05	139	2	PPC	600	295	\N	\N	\N	\N	\N	\N	UP33AT6704	\N	\N	2026-04-07 21:28:45.108917+00
620	2026-04-05	97	2	PPC	700	305	\N	\N	\N	\N	\N	\N	UP81CT9942	\N	\N	2026-04-07 21:28:45.110814+00
621	2026-04-05	100	2	PPC	600	300	\N	\N	\N	\N	\N	\N	UP36T2461	\N	\N	2026-04-07 21:28:45.113104+00
622	2026-04-05	139	2	PPC	720	295	\N	\N	\N	\N	\N	\N	UP84BT1506	\N	\N	2026-04-07 21:28:45.11506+00
623	2026-04-05	97	2	PPC	700	305	\N	\N	\N	\N	\N	\N	UP81DT8642	\N	\N	2026-04-07 21:28:45.117373+00
624	2026-04-05	5	2	PPC	800	300	\N	\N	\N	\N	\N	\N	UP32ST7210	\N	\N	2026-04-07 21:28:45.119655+00
625	2026-04-06	33	2	PPC	800	310	\N	\N	\N	\N	\N	\N	UP32ST6861	\N	\N	2026-04-07 21:28:45.121977+00
626	2026-04-06	15	2	PPC	720	305	\N	\N	\N	\N	\N	\N	UP31BT0964	\N	\N	2026-04-07 21:28:45.12421+00
627	2026-04-06	198	2	PPC	700	265	\N	\N	\N	\N	\N	\N	UP31BT0350	\N	\N	2026-04-07 21:28:45.126154+00
628	2026-04-06	201	2	PPC	831.2	305	\N	\N	\N	\N	\N	\N	HR58D3920	\N	\N	2026-04-07 21:28:45.129366+00
629	2026-04-06	40	2	PPC	803.2	310	\N	\N	\N	\N	\N	\N	UP61KT4858	\N	\N	2026-04-07 21:28:45.131543+00
630	2026-04-06	40	2	PPC	806.8	310	\N	\N	\N	\N	\N	\N	HR45E0367	\N	\N	2026-04-07 21:28:45.133857+00
631	2026-04-06	99	2	PPC	600	250	\N	\N	\N	\N	\N	\N	UP32EN5498	\N	\N	2026-04-07 21:28:45.134993+00
632	2026-03-01	36	2	PPC	740	278	BARABANKI	\N	\N	\N	\N	\N	UP32ZN6701	\N	\N	2026-04-07 21:28:45.13923+00
633	2026-03-01	39	2	PPC	821.2	300	PARA LKO	\N	\N	\N	\N	\N	HR63E3918	\N	\N	2026-04-07 21:28:45.142111+00
634	2026-03-01	11	2	PPC	720	300	BAHRAICH	\N	\N	\N	\N	\N	UP84BT1506	\N	\N	2026-04-07 21:28:45.144775+00
635	2026-03-01	5	2	PPC	720	303	\N	\N	\N	\N	\N	\N	UP32ST6862	\N	\N	2026-04-07 21:28:45.146793+00
636	2026-03-01	5	2	PPC	840	303	\N	\N	\N	\N	\N	\N	UP32WN3321	\N	\N	2026-04-07 21:28:45.148859+00
637	2026-03-01	76	13	OPC	700	303	KISHAN PATH LKO	\N	\N	\N	\N	\N	UP32ST7210	\N	\N	2026-04-07 21:28:45.151222+00
638	2026-03-01	76	13	OPC	300	275	KISHAN PATH LKO	\N	\N	\N	\N	\N	UP32ST7210	\N	\N	2026-04-07 21:28:45.153203+00
639	2026-03-01	117	13	OPC	100	290	DAROGA KHEDA	\N	\N	\N	\N	\N	UP32RT6962	\N	\N	2026-04-07 21:28:45.155457+00
640	2026-03-01	191	13	OPC	100	280	JHETA	\N	\N	\N	\N	\N	UP32RT6962	\N	\N	2026-04-07 21:28:45.157797+00
641	2026-03-02	36	2	PPC	400	250	NADARGANJ	\N	\N	\N	\N	\N	UP77AN3027	\N	\N	2026-04-07 21:28:45.16001+00
642	2026-03-02	15	2	PPC	720	305	BAHRAICH	\N	\N	\N	\N	\N	UP32ZN4904	\N	\N	2026-04-07 21:28:45.162318+00
643	2026-03-02	111	13	OPC	720	307	RAIBARELI	\N	\N	\N	\N	\N	UP32ST6861	\N	\N	2026-04-07 21:28:45.164615+00
644	2026-03-06	136	2	PPC	720	305	MARIAHU	\N	\N	\N	\N	\N	UP32ST6861	\N	\N	2026-04-07 21:28:45.166873+00
645	2026-03-06	136	2	PPC	720	273	MARIAHU	\N	\N	\N	\N	\N	UP32ST6862	\N	\N	2026-04-07 21:28:45.168905+00
646	2026-03-06	33	2	PPC	796.8	305	SANDILA	\N	\N	\N	\N	\N	HR47G6204	\N	\N	2026-04-07 21:28:45.171104+00
647	2026-03-06	135	2	PPC	700	305	DHODHEPUR	\N	\N	\N	\N	\N	UP81DT9809	\N	\N	2026-04-07 21:28:45.173359+00
648	2026-03-07	36	2	PPC	200	278	NADARGANJ	\N	\N	\N	\N	\N	UP32MC4405	\N	\N	2026-04-07 21:28:45.174906+00
649	2026-03-07	71	10	OPC	840	260	MAHARAJGANJ	\N	\N	\N	\N	\N	UP53FT0449	\N	\N	2026-04-07 21:28:45.177182+00
650	2026-03-07	176	2	PPC	700	305	KHIARUNI	\N	\N	\N	\N	\N	UP53DT9907	\N	\N	2026-04-07 21:28:45.178695+00
651	2026-03-07	39	2	PPC	700	265	DHODHEPUR	\N	\N	\N	\N	\N	UP33CT7564	\N	\N	2026-04-07 21:28:45.180246+00
652	2026-03-07	71	2	PPC	700	305	DHODHEPUR	\N	\N	\N	\N	\N	UP33CT7864	\N	\N	2026-04-07 21:28:45.182714+00
653	2026-03-08	106	2	PPC	840	275	NARIYAON	\N	\N	\N	\N	\N	UP32WN3321	\N	\N	2026-04-07 21:28:45.184845+00
654	2026-03-08	110	2	PPC	720	305	NARIYAON	\N	\N	\N	\N	\N	UP32ST7183	\N	\N	2026-04-07 21:28:45.186912+00
655	2026-03-08	136	2	PPC	700	305	NARIYAON	\N	\N	\N	\N	\N	UP32WN5771	\N	\N	2026-04-07 21:28:45.18924+00
656	2026-03-08	69	2	PPC	600	278	SULTANPUR	\N	\N	\N	\N	\N	UP32HN8157	\N	\N	2026-04-07 21:28:45.19078+00
657	2026-03-08	36	2	PPC	400	250	HAZRATGANJ	\N	\N	\N	\N	\N	UP77AN3027	\N	\N	2026-04-07 21:28:45.193218+00
658	2026-03-08	36	2	PPC	200	278	MIYAGANJ UNNAO	\N	\N	\N	\N	\N	UP32LN0310	\N	\N	2026-04-07 21:28:45.195653+00
659	2026-03-09	36	2	PPC	300	250	AMAUSI	\N	\N	\N	\N	\N	UP32T3091	\N	\N	2026-04-07 21:28:45.197924+00
660	2026-03-11	36	2	PPC	400	253	JANKIPURAM LKO	\N	\N	\N	\N	\N	UP77AN3027	\N	\N	2026-04-07 21:28:45.200059+00
661	2026-03-11	39	2	PPC	720	315	NARIYAON	\N	\N	\N	\N	\N	UP32ST6861	\N	\N	2026-04-07 21:28:45.202005+00
662	2026-03-11	140	2	PPC	80	315	NARIYAON	\N	\N	\N	\N	\N	UP32ST6861	\N	\N	2026-04-07 21:28:45.203881+00
663	2026-03-11	40	2	PPC	800	320	NARIYAON	\N	\N	\N	\N	\N	UP32ST6862	\N	\N	2026-04-07 21:28:45.205853+00
664	2026-03-11	99	2	PPC	600	292	DUBAGGA LKO	\N	\N	\N	\N	\N	UP32JN5288	\N	\N	2026-04-07 21:28:45.208114+00
665	2026-03-11	99	2	PPC	600	292	DUBAGGA LKO	\N	\N	\N	\N	\N	UP32JN1675	\N	\N	2026-04-07 21:28:45.210399+00
666	2026-03-11	99	2	PPC	800	292	KURSI ROAD LKO	\N	\N	\N	\N	\N	UP32ZN9193	\N	\N	2026-04-07 21:28:45.212672+00
667	2026-03-11	99	2	PPC	500	292	MOHANLALGANJ	\N	\N	\N	\N	\N	UP32DN0993	\N	\N	2026-04-07 21:28:45.214718+00
668	2026-03-11	99	2	PPC	200	292	MALIHABAD LKO	\N	\N	\N	\N	\N	UP32GM6727	\N	\N	2026-04-07 21:28:45.217049+00
669	2026-03-11	99	2	PPC	200	292	DUBAGGA LKO	\N	\N	\N	\N	\N	UP30BT2760	\N	\N	2026-04-07 21:28:45.219457+00
670	2026-03-13	40	2	PPC	830.8	320	LUCKNOW	\N	\N	\N	\N	\N	HR58D3920	\N	\N	2026-04-07 21:28:45.221695+00
671	2026-03-13	40	2	PPC	818.4	320	LUCKNOW	\N	\N	\N	\N	\N	HR58D5848	\N	\N	2026-04-07 21:28:45.223747+00
672	2026-03-14	41	2	PPC	700	275	DARIYABAD	\N	\N	\N	\N	\N	UP84BT1506	\N	\N	2026-04-07 21:28:45.22604+00
673	2026-03-15	36	2	PPC	300	290	JANKIPURAM	\N	\N	\N	\N	\N	UP30T6276	\N	\N	2026-04-07 21:28:45.227627+00
674	2026-03-15	33	2	PPC	801.6	315	SANDILA	\N	\N	\N	\N	\N	HR38AE2017	\N	\N	2026-04-07 21:28:45.229639+00
675	2026-01-02	167	6	PPC	700	220	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.233809+00
676	2026-01-02	39	2	PPC	720	250	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.235866+00
677	2026-01-03	191	2	PPC	500	245	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.239209+00
678	2025-01-03	17	6	PPC	840	227	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.243227+00
679	2025-01-03	202	2	PPC	720	240	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.24752+00
680	2025-01-03	140	2	PPC	640	280	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.250318+00
681	2026-01-25	134	12	OPC	840	280	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.252447+00
682	2025-01-05	15	2	PPC	620	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.25448+00
683	2026-01-05	11	2	PPC	620	280	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.256616+00
684	2025-01-05	203	2	PPC	840	265	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.260024+00
685	2026-01-07	97	4	PPC	700	300	MAU	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.262077+00
686	2026-01-07	64	4	PPC	700	300	MAU	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.264145+00
687	2026-01-07	136	4	PPC	700	300	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.266165+00
688	2026-01-07	167	6	PPC	840	230	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.268416+00
689	2026-01-07	17	6	PPC	700	235	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.270677+00
690	2026-01-08	30	2	PPC	700	280	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.27291+00
691	2026-01-08	182	2	PPC	700	250	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.2748+00
692	2026-01-09	125	10	OPC	840	269	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.27679+00
693	2026-01-09	9	10	OPC	840	235	DEORIA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.27906+00
694	2025-01-10	92	2	PPC	620	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.283022+00
695	2026-01-11	61	10	OPC	1000	260	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.285158+00
696	2026-01-12	140	2	PPC	540	290	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.288265+00
697	2026-01-12	11	2	PPC	600	285	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.290576+00
698	2026-01-13	97	2	PPC	600	250	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.292869+00
699	2026-01-13	97	2	PPC	600	250	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.294868+00
700	2026-01-13	39	2	PPC	520	260	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.296989+00
701	2026-01-13	39	2	PPC	600	260	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.299951+00
702	2026-01-13	22	2	PPC	600	255	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.302397+00
703	2026-01-13	97	10	OPC	840	260	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.304454+00
704	2026-01-13	61	10	OPC	840	260	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.306754+00
705	2026-01-13	97	10	OPC	840	230	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.308682+00
706	2026-01-14	167	6	PPC	840	230	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.310974+00
707	2026-01-14	112	6	PPC	840	235	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.313275+00
708	2026-01-14	17	6	PPC	840	235	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.315312+00
709	2026-01-14	127	2	PPC	840	285	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.317481+00
710	2026-01-15	112	6	PPC	700	235	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.320547+00
711	2026-01-15	167	6	PPC	700	230	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.322839+00
712	2026-01-15	30	2	PPC	717	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.325078+00
713	2026-01-15	140	2	PPC	640	290	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.327156+00
714	2026-01-16	74	2	PPC	1000	280	ETTA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.330362+00
715	2026-01-16	136	6	PPC	840	235	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.332554+00
716	2026-01-16	97	6	PPC	840	235	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.334554+00
717	2026-01-17	5	2	PPC	1200	295	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.336878+00
718	2026-01-17	134	2	PPC	700	255	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.338694+00
719	2026-01-17	11	10	OPC	700	225	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.352892+00
720	2026-01-18	140	2	PPC	580	295	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.356024+00
721	2026-01-18	127	2	PPC	1100	290	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.35788+00
722	2026-01-18	33	2	PPC	720	290	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.359589+00
723	2026-01-18	97	10	OPC	700	260	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.361946+00
724	2026-01-18	97	10	OPC	700	260	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.363932+00
725	2026-01-19	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.366147+00
726	2026-01-20	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.370548+00
727	2026-01-20	30	2	PPC	723	295	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.372874+00
728	2026-01-20	110	2	PPC	700	295	SANDILA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.374877+00
730	2026-01-21	167	6	PPC	840	230	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.378562+00
731	2026-01-21	167	6	PPC	840	230	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.380913+00
732	2026-01-21	134	10	OPC	840	235	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.383224+00
733	2026-01-21	64	10	OPC	840	264	GAZIPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.385402+00
734	2026-01-22	97	10	OPC	400	260	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.388283+00
735	2026-01-22	97	10	OPC	440	230	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.389936+00
736	2026-01-23	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.39217+00
737	2026-01-23	140	2	PPC	500	260	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.394076+00
738	2026-01-23	182	2	PPC	640	260	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.396713+00
739	2026-01-23	39	2	PPC	600	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.398288+00
740	2026-01-23	39	2	PPC	800	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.401026+00
741	2026-01-23	39	2	PPC	600	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.403773+00
742	2026-01-23	39	2	PPC	700	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.406015+00
743	2026-01-23	33	2	PPC	700	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.408268+00
744	2026-01-23	15	2	PPC	700	295	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.409851+00
745	2026-01-24	36	2	PPC	600	265	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.411749+00
746	2026-01-24	196	10	OPC	840	225	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.41412+00
747	2025-01-03	136	12	OPC	840	315	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.416448+00
748	2026-01-25	136	4	PPC	840	235	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.418269+00
749	2026-01-25	136	4	PPC	840	235	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.420332+00
750	2026-01-25	182	2	PPC	700	295	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.422576+00
751	2026-01-25	82	2	PPC	700	255	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.424442+00
752	2026-01-25	204	2	PPC	420	255	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.427181+00
753	2026-01-25	93	21	OPC	700	276	BASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.429397+00
754	2026-01-25	106	15	PPC	440	370	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.431719+00
755	2026-01-26	191	2	PPC	700	290	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.435026+00
756	2026-01-27	25	10	OPC	700	271	GORAKHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.438427+00
757	2026-01-28	106	2	PPC	200	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.440265+00
758	2026-01-28	5	2	PPC	1000	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.442545+00
759	2026-01-28	191	2	PPC	700	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.444889+00
760	2026-01-28	96	2	PPC	840	285	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.446853+00
761	2026-01-28	69	2	PPC	700	270	SITAPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.449156+00
762	2026-01-28	195	2	PPC	700	290	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.451644+00
763	2026-01-29	9	2	PPC	1000	291	DEORIA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.454256+00
764	2026-01-29	5	2	PPC	840	290	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.456852+00
765	2026-01-29	63	2	PPC	1240	260	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.459081+00
766	2026-01-29	181	2	PPC	1000	280	ETTA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.46143+00
767	2026-01-29	182	2	PPC	540	260	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.463379+00
768	2026-01-29	17	12	OPC	800	280	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.465345+00
769	2026-01-29	64	10	OPC	840	262	BALLIA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.467652+00
770	2026-01-30	15	2	PPC	620	260	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.469451+00
771	2026-01-30	130	2	PPC	700	260	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.471416+00
772	2026-01-30	96	2	PPC	700	260	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.474811+00
773	2026-01-30	24	2	PPC	720	255	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.476829+00
774	2026-01-31	140	2	PPC	200	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.478946+00
775	2026-01-31	191	2	PPC	200	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.481187+00
776	2026-01-31	140	2	PPC	200	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.483629+00
777	2026-01-31	63	2	PPC	700	290	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.485863+00
778	2026-01-31	33	2	PPC	700	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.488054+00
779	2026-01-31	140	2	PPC	1100	290	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.489992+00
780	2026-01-31	129	10	OPC	840	260	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.492206+00
781	2026-01-31	93	2	PPC	700	290	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.494481+00
782	2026-01-31	122	2	PPC	700	250	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.496504+00
783	2025-11-01	140	2	PPC	600	290	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.499552+00
784	2025-11-01	75	2	PPC	700	260	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.501701+00
785	2025-11-01	75	2	PPC	700	260	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.503817+00
786	2025-11-01	66	9	DAMAGE	700	83	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.508272+00
787	2025-11-01	66	9	DAMAGE	600	83	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.510598+00
788	2025-11-01	138	9	DAMAGE	850	115	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.513109+00
789	2025-11-02	129	9	DAMAGE	700	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.515254+00
790	2025-11-02	129	9	DAMAGE	600	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.517431+00
791	2025-11-02	60	19	OPC	600	220	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.519651+00
792	2025-11-03	73	8	PPC	600	265	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.521901+00
793	2025-11-04	127	2	PPC	700	285	JAGDISHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.524546+00
794	2025-11-04	33	2	PPC	620	278	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.526086+00
795	2025-11-04	129	9	DAMAGE	660	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.527902+00
796	2025-11-04	129	9	DAMAGE	700	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.529967+00
797	2025-11-04	129	9	DAMAGE	700	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.532248+00
798	2025-11-04	129	9	DAMAGE	800	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.534292+00
799	2025-11-04	56	9	DAMAGE	600	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.536416+00
800	2025-11-05	66	9	DAMAGE	600	83	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.538676+00
801	2025-11-05	66	9	DAMAGE	700	83	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.540926+00
802	2025-11-05	27	9	DAMAGE	400	115	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.542446+00
803	2025-11-05	167	6	PPC	700	225	AZAMAGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.544338+00
804	2025-11-05	186	6	PPC	700	227	AZAMAGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.546634+00
805	2025-11-05	30	2	PPC	740	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.54892+00
806	2025-11-06	66	9	DAMAGE	600	83	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.551102+00
807	2025-11-06	66	9	DAMAGE	600	83	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.553427+00
808	2025-11-06	66	9	DAMAGE	600	83	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.555259+00
809	2025-11-06	112	6	PPC	840	230	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.558023+00
810	2025-11-06	71	10	OPC	700	265	SIDDHARTHNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.560819+00
811	2025-11-07	17	3	OPC	800	300	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.563115+00
812	2025-11-07	17	3	OPC	800	300	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.565401+00
813	2025-11-07	138	9	DAMAGE	600	115	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.56758+00
814	2025-11-07	138	9	DAMAGE	600	115	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.569978+00
815	2025-11-07	138	9	DAMAGE	600	115	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.572503+00
816	2025-11-07	138	9	DAMAGE	550	115	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.574857+00
817	2025-11-07	112	6	PPC	840	230	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.577133+00
818	2025-11-08	17	3	OPC	700	300	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.579407+00
819	2025-11-08	138	9	DAMAGE	600	115	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.581622+00
820	2025-11-08	71	10	OPC	700	265	SIDDHARTHNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.58408+00
821	2025-11-09	110	2	PPC	740	280	SANDILA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.586134+00
822	2025-11-09	135	10	OPC	700	227	SIDDHARTHNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.588336+00
823	2025-11-09	134	10	OPC	840	245	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.59062+00
824	2025-11-09	46	8	PPC	175	340	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.59293+00
825	2025-11-09	86	4	PPC	150	290	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.595049+00
826	2025-11-09	86	4	PPC	150	285	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.597112+00
827	2025-11-10	167	6	PPC	700	225	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.598747+00
828	2025-11-10	35	6	PPC	1000	115	HARDOI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.601039+00
829	2025-11-10	33	7	OPC	600	275	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.60339+00
830	2025-11-10	33	7	OPC	600	275	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.605586+00
831	2025-11-10	33	7	OPC	600	275	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.607897+00
832	2025-11-10	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.610146+00
833	2025-11-10	24	2	PPC	600	280	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.612575+00
834	2025-11-11	17	3	OPC	815	300	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.615373+00
835	2025-11-11	61	3	OPC	700	295	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.61766+00
836	2025-11-11	30	2	PPC	700	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.619684+00
837	2025-11-12	127	2	PPC	740	285	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.621896+00
838	2025-11-12	194	2	PPC	720	250	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.624177+00
839	2025-11-12	149	2	PPC	620	272	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.626459+00
840	2025-11-12	191	2	PPC	700	280	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.628978+00
841	2025-11-13	15	4	PPC	640	250	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.631311+00
842	2025-11-13	39	4	PPC	700	255	BALRAMPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.633625+00
843	2025-11-13	106	16	PPC	500	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.63585+00
844	2025-11-13	98	10	OPC	340	275	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.637629+00
845	2025-11-13	98	10	OPC	500	300	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.639145+00
846	2025-11-14	33	2	PPC	600	275	UNNAO	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.640587+00
847	2025-11-14	59	2	PPC	600	295	GAZIPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.642124+00
848	2025-11-14	167	6	PPC	840	225	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.643696+00
849	2025-11-14	106	22	OTHER	700	316.5	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.646054+00
850	2025-11-14	135	4	PPC	700	295	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.647813+00
851	2025-11-15	15	2	PPC	600	290	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.649595+00
852	2025-11-15	191	2	PPC	700	280	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.651682+00
853	2025-11-17	191	2	PPC	600	279	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.653433+00
854	2025-11-17	135	2	PPC	700	260	GORAKHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.655405+00
855	2025-11-17	15	2	PPC	600	285	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.657688+00
856	2025-11-17	127	2	PPC	700	285	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.660085+00
857	2025-11-18	194	2	PPC	740	280	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.662826+00
858	2025-11-18	110	2	PPC	600	273	SANDILA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.665089+00
859	2025-11-18	33	7	OPC	600	275	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.667246+00
860	2025-11-18	129	9	DAMAGE	600	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.669168+00
861	2025-11-19	127	7	OPC	840	275	FATEHPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.671399+00
862	2025-11-19	12	9	DAMAGE	600	85	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.673488+00
863	2025-11-19	141	2	PPC	720	278	BARELLY	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.675793+00
864	2025-11-19	71	10	OPC	840	260	SIDDHARTHNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.67804+00
865	2025-11-20	106	16	PPC	500	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.680284+00
866	2025-11-20	194	8	PPC	900	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.682513+00
867	2025-11-20	110	2	PPC	754	273	SANDILA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.684706+00
868	2025-11-20	132	2	PPC	446	285	SANDILA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.687081+00
869	2025-11-20	15	2	PPC	600	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.689291+00
870	2025-11-20	15	12	OPC	600	285	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.691227+00
871	2025-11-20	71	12	OPC	600	285	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.693537+00
872	2025-11-20	135	10	OPC	700	230	SIDDHARTHNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.695426+00
873	2025-11-21	129	9	DAMAGE	800	90	ALLAHABAD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.696936+00
874	2025-11-21	16	9	DAMAGE	600	125	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.699032+00
875	2025-11-21	62	9	DAMAGE	600	115	ALLAHABD	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.701105+00
876	2025-11-21	135	2	PPC	700	285	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.704152+00
877	2025-11-21	125	10	OPC	840	235	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.70602+00
878	2025-11-21	140	8	PPC	600	267	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.707974+00
879	2025-11-22	140	2	PPC	620	290	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.710339+00
880	2025-11-22	111	2	PPC	740	290	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.712496+00
881	2025-11-22	73	8	PPC	700	254	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.715022+00
882	2025-11-23	17	12	OPC	700	280	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.717339+00
883	2025-11-23	134	12	OPC	840	285	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.71939+00
884	2025-11-24	39	4	PPC	500	255	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.721649+00
885	2025-11-24	39	4	PPC	600	255	KANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.723826+00
886	2025-11-24	73	8	PPC	900	273	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.725854+00
887	2025-11-24	139	2	PPC	720	285	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.727834+00
888	2025-11-26	39	2	PPC	600	250	GONDA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.729746+00
889	2025-11-26	171	9	DAMAGE	700	125	AYODHYA	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.731992+00
890	2025-11-26	71	10	OPC	600	260	SIDDHARTNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.734121+00
891	2025-11-27	16	8	PPC	600	237	PRATAPGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.736138+00
892	2025-11-27	167	6	PPC	840	227	AZAMGARH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.738183+00
893	2025-11-27	17	6	PPC	700	227	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.740466+00
894	2025-11-28	127	2	PPC	720	280	RAEBARELI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.742631+00
895	2025-11-28	139	2	PPC	700	285	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.744572+00
896	2025-11-28	140	2	PPC	700	285	BARABANKI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.746874+00
897	2025-11-28	73	8	PPC	900	270	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.748855+00
898	2025-11-28	17	4	PPC	620	300	AMBEDKERNAGAR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.751099+00
899	2025-11-29	106	16	PPC	500	285	LUCKNOW	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.753123+00
900	2025-11-30	24	10	OPC	700	230	BEHRAICH	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.755088+00
901	2025-11-30	13	10	OPC	840	235	SHRAVASTI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.757394+00
902	2025-11-30	91	8	PPC	600	270	SULTANPUR	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.759591+00
903	2025-11-30	110	2	PPC	700	273	HARDOI	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-07 21:28:45.762941+00
904	2026-04-08	205	21	OPC	1	250	Bengaluru	\N	\N	\N	\N	\N	ABC	2	\N	2026-04-08 05:24:08.019597+00
905	2026-04-08	206	13	OPC	1	100	\N	\N	\N	\N	\N	\N	\N	2	\N	2026-04-08 19:01:17.274284+00
448	2026-02-04	97	21	OPC	840	273	AZAMGARH	ABC	\N	\N	\N	\N	UP53ET6008	\N	\N	2026-04-07 21:28:44.731312+00
\.


--
-- Name: bank_balances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bank_balances_id_seq', 1, false);


--
-- Name: cement_brands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cement_brands_id_seq', 22, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expenses_id_seq', 28, true);


--
-- Name: godowns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.godowns_id_seq', 3, true);


--
-- Name: imprest_handlers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.imprest_handlers_id_seq', 16, true);


--
-- Name: imprest_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.imprest_transactions_id_seq', 17, true);


--
-- Name: loans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.loans_id_seq', 1, false);


--
-- Name: parties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.parties_id_seq', 206, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 2572, true);


--
-- Name: purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchases_id_seq', 998, true);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sales_id_seq', 905, true);


--
-- Name: bank_balances bank_balances_bank_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_balances
    ADD CONSTRAINT bank_balances_bank_name_key UNIQUE (bank_name);


--
-- Name: bank_balances bank_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_balances
    ADD CONSTRAINT bank_balances_pkey PRIMARY KEY (id);


--
-- Name: cement_brands cement_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cement_brands
    ADD CONSTRAINT cement_brands_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: godowns godowns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.godowns
    ADD CONSTRAINT godowns_pkey PRIMARY KEY (id);


--
-- Name: imprest_handlers imprest_handlers_handler_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imprest_handlers
    ADD CONSTRAINT imprest_handlers_handler_name_key UNIQUE (handler_name);


--
-- Name: imprest_handlers imprest_handlers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imprest_handlers
    ADD CONSTRAINT imprest_handlers_pkey PRIMARY KEY (id);


--
-- Name: imprest_transactions imprest_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imprest_transactions
    ADD CONSTRAINT imprest_transactions_pkey PRIMARY KEY (id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);


--
-- Name: parties parties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: payments payments_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id);


--
-- Name: purchases purchases_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.cement_brands(id);


--
-- Name: purchases purchases_godown_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_godown_id_fkey FOREIGN KEY (godown_id) REFERENCES public.godowns(id);


--
-- Name: sales sales_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.cement_brands(id);


--
-- Name: sales sales_godown_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_godown_id_fkey FOREIGN KEY (godown_id) REFERENCES public.godowns(id);


--
-- Name: sales sales_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id);


--
-- PostgreSQL database dump complete
--

\unrestrict VhhhcmSWLweMWFNzJUbG7Nf2WSwSbvfIM2xvZGIJGf4WaKOye7pAegLgWZnHgJ6


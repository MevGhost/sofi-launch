--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

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
-- Name: DisputeMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DisputeMethod" AS ENUM (
    'ADMIN',
    'DAO',
    'ARBITRATOR'
);


ALTER TYPE public."DisputeMethod" OWNER TO postgres;

--
-- Name: DisputeStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DisputeStatus" AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'REJECTED'
);


ALTER TYPE public."DisputeStatus" OWNER TO postgres;

--
-- Name: DisputeType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DisputeType" AS ENUM (
    'MILESTONE_DISPUTE',
    'QUALITY_DISPUTE',
    'DEADLINE_DISPUTE',
    'OTHER'
);


ALTER TYPE public."DisputeType" OWNER TO postgres;

--
-- Name: EscrowStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EscrowStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'DISPUTED',
    'CANCELLED',
    'PAUSED'
);


ALTER TYPE public."EscrowStatus" OWNER TO postgres;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationType" AS ENUM (
    'ESCROW_CREATED',
    'MILESTONE_SUBMITTED',
    'MILESTONE_APPROVED',
    'MILESTONE_REJECTED',
    'MILESTONE_RELEASED',
    'FUNDS_CLAIMED',
    'DISPUTE_RAISED',
    'DISPUTE_RESOLVED',
    'ESCROW_COMPLETED',
    'ESCROW_CANCELLED',
    'VERIFICATION_REQUIRED',
    'SYSTEM_ANNOUNCEMENT'
);


ALTER TYPE public."NotificationType" OWNER TO postgres;

--
-- Name: ProofType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProofType" AS ENUM (
    'LINK',
    'FILE',
    'SOCIAL'
);


ALTER TYPE public."ProofType" OWNER TO postgres;

--
-- Name: SubmissionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SubmissionStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'DISPUTED'
);


ALTER TYPE public."SubmissionStatus" OWNER TO postgres;

--
-- Name: SyncState; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SyncState" AS ENUM (
    'IDLE',
    'SYNCING',
    'SUCCESS',
    'FAILED',
    'RETRY'
);


ALTER TYPE public."SyncState" OWNER TO postgres;

--
-- Name: VerificationAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."VerificationAction" AS ENUM (
    'APPROVE',
    'REJECT',
    'COMMENT'
);


ALTER TYPE public."VerificationAction" OWNER TO postgres;

--
-- Name: VerificationMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."VerificationMethod" AS ENUM (
    'SINGLE',
    'MAJORITY',
    'UNANIMOUS'
);


ALTER TYPE public."VerificationMethod" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Activity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Activity" (
    id text NOT NULL,
    "escrowId" text,
    "userAddress" character varying(255) NOT NULL,
    action text NOT NULL,
    details jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "chainId" text
);


ALTER TABLE public."Activity" OWNER TO postgres;

--
-- Name: ChainConfig; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChainConfig" (
    id text NOT NULL,
    "chainId" text NOT NULL,
    "chainName" text NOT NULL,
    "chainType" text NOT NULL,
    "rpcUrl" text NOT NULL,
    "wsUrl" text,
    "explorerUrl" text NOT NULL,
    "nativeCurrency" jsonb NOT NULL,
    "blockTime" double precision NOT NULL,
    "isTestnet" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "contractAddresses" jsonb NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ChainConfig" OWNER TO postgres;

--
-- Name: ChainHealth; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChainHealth" (
    id text NOT NULL,
    "chainId" text NOT NULL,
    status text NOT NULL,
    latency integer,
    "blockHeight" bigint,
    "checkedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    error text
);


ALTER TABLE public."ChainHealth" OWNER TO postgres;

--
-- Name: Dispute; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Dispute" (
    id text NOT NULL,
    "escrowId" text NOT NULL,
    "disputeType" public."DisputeType" NOT NULL,
    "raisedBy" character varying(255) NOT NULL,
    reason text NOT NULL,
    evidence jsonb,
    status public."DisputeStatus" DEFAULT 'OPEN'::public."DisputeStatus" NOT NULL,
    resolution text,
    "resolvedBy" character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "resolvedAt" timestamp(3) without time zone
);


ALTER TABLE public."Dispute" OWNER TO postgres;

--
-- Name: Escrow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Escrow" (
    id text NOT NULL,
    "contractAddress" character varying(255),
    "factoryAddress" character varying(255),
    "chainId" text NOT NULL,
    "blockNumber" bigint,
    "transactionHash" character varying(255) NOT NULL,
    "projectName" text NOT NULL,
    "dealType" text NOT NULL,
    "customDealType" text,
    "dealDescription" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "projectAddress" character varying(255) NOT NULL,
    "kolAddress" character varying(255) NOT NULL,
    "tokenAddress" character varying(255) NOT NULL,
    "tokenSymbol" text NOT NULL,
    "tokenDecimals" integer NOT NULL,
    "totalAmount" text NOT NULL,
    "releasedAmount" text DEFAULT '0'::text NOT NULL,
    status public."EscrowStatus" DEFAULT 'ACTIVE'::public."EscrowStatus" NOT NULL,
    "requireVerification" boolean DEFAULT false NOT NULL,
    "verificationMethod" public."VerificationMethod",
    "disputeResolutionMethod" public."DisputeMethod",
    "arbitratorAddress" character varying(255),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "claimedAmount" text DEFAULT '0'::text NOT NULL,
    requirements text[],
    "adminControlled" boolean DEFAULT false NOT NULL,
    "chainData" jsonb,
    "chainEscrowId" text NOT NULL,
    "lastSyncedAt" timestamp(3) without time zone,
    "platformFeeBps" integer,
    chain text DEFAULT 'base-sepolia'::text,
    "escrowTokenAccount" character varying(255)
);


ALTER TABLE public."Escrow" OWNER TO postgres;

--
-- Name: Milestone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Milestone" (
    id text NOT NULL,
    "escrowId" text NOT NULL,
    "milestoneIndex" integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    amount text NOT NULL,
    percentage double precision NOT NULL,
    "releaseDate" timestamp(3) without time zone NOT NULL,
    conditions text[],
    released boolean DEFAULT false NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    "releasedAt" timestamp(3) without time zone,
    "verifiedAt" timestamp(3) without time zone,
    claimed boolean DEFAULT false NOT NULL,
    "claimedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "verificationStatus" public."SubmissionStatus"
);


ALTER TABLE public."Milestone" OWNER TO postgres;

--
-- Name: MilestoneSubmission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MilestoneSubmission" (
    id text NOT NULL,
    "milestoneId" text NOT NULL,
    "kolAddress" character varying(255) NOT NULL,
    description text NOT NULL,
    "proofType" public."ProofType" NOT NULL,
    "proofUrl" text NOT NULL,
    "socialPlatform" text,
    metrics jsonb,
    status public."SubmissionStatus" DEFAULT 'PENDING'::public."SubmissionStatus" NOT NULL,
    feedback text,
    "reviewedBy" character varying(255),
    "reviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MilestoneSubmission" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    read boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: Settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Settings" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    "adminAddresses" text[] DEFAULT ARRAY[]::text[],
    "adminPin" text DEFAULT ''::text NOT NULL,
    "maintenanceMode" boolean DEFAULT false NOT NULL,
    announcement text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dailyReport" boolean DEFAULT false NOT NULL,
    "defaultCurrency" text DEFAULT 'USDC'::text NOT NULL,
    "disputeRaised" boolean DEFAULT true NOT NULL,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "escrowCompleted" boolean DEFAULT true NOT NULL,
    "escrowCreated" boolean DEFAULT true NOT NULL,
    "ipWhitelist" text DEFAULT ''::text NOT NULL,
    "maxEscrowAmount" text DEFAULT '1000000'::text NOT NULL,
    "maxLoginAttempts" text DEFAULT '5'::text NOT NULL,
    "minEscrowAmount" text DEFAULT '100'::text NOT NULL,
    "platformFee" text DEFAULT '2.5'::text NOT NULL,
    "platformName" text DEFAULT 'KOL Escrow Platform'::text NOT NULL,
    "requireVerification" boolean DEFAULT true NOT NULL,
    "sessionTimeout" text DEFAULT '30'::text NOT NULL,
    "twoFactorRequired" boolean DEFAULT false NOT NULL,
    "userId" text NOT NULL,
    "verificationRequired" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Settings" OWNER TO postgres;

--
-- Name: SyncLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SyncLog" (
    id text NOT NULL,
    "chainId" text NOT NULL,
    "escrowId" text,
    operation text NOT NULL,
    "blockNumber" bigint,
    "transactionHash" character varying(255),
    status public."SyncState" NOT NULL,
    error text,
    attempts integer DEFAULT 1 NOT NULL,
    data jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone
);


ALTER TABLE public."SyncLog" OWNER TO postgres;

--
-- Name: SyncStatus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SyncStatus" (
    id text NOT NULL,
    "chainId" text NOT NULL,
    "lastBlockNumber" bigint,
    "lastSyncedAt" timestamp(3) without time zone,
    status public."SyncState" DEFAULT 'IDLE'::public."SyncState" NOT NULL,
    error text,
    "consecutiveErrors" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SyncStatus" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    address character varying(255) NOT NULL,
    nonce text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastLogin" timestamp(3) without time zone,
    name text,
    email text,
    avatar text,
    bio text,
    department text,
    "lastActive" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text DEFAULT 'team'::text NOT NULL,
    "chainType" text DEFAULT 'evm'::text NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: Verification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Verification" (
    id text NOT NULL,
    "escrowId" text NOT NULL,
    "milestoneId" text NOT NULL,
    "verifierId" text NOT NULL,
    "userAddress" character varying(255) NOT NULL,
    action public."VerificationAction" NOT NULL,
    signature text,
    "transactionHash" character varying(255),
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Verification" OWNER TO postgres;

--
-- Name: Verifier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Verifier" (
    id text NOT NULL,
    "escrowId" text NOT NULL,
    address character varying(255) NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Verifier" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: Activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Activity" (id, "escrowId", "userAddress", action, details, "ipAddress", "userAgent", "createdAt", "chainId") FROM stdin;
cmdnlk38j0014wopchww5i97c	\N	0x33742d3feede42eeb82e65a0155bd46b693a69f5	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:11.78	\N
cmdnlk38n0016wopc8x4dvaov	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:11.783	\N
cmdnlk38n0018wopcd789kdm6	\N	0x90f79bf6eb2c4f870365e785982e1f101e93b906	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:11.784	\N
cmdnlkfwk001dwopchhhgo6so	\N	0x90f79bf6eb2c4f870365e785982e1f101e93b906	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:28.196	\N
cmdnlkfwl001fwopc94qnssak	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:28.197	\N
cmdnlkfwl001hwopcqkcq4k7s	\N	0x33742d3feede42eeb82e65a0155bd46b693a69f5	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:28.197	\N
cmdnlkroq001nwopcx2ttvspx	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:43.466	\N
cmdnlkrot001pwopcnr39k7fd	\N	0x90f79bf6eb2c4f870365e785982e1f101e93b906	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:43.469	\N
cmdnlkrot001rwopc72zzyy9c	\N	0x33742d3feede42eeb82e65a0155bd46b693a69f5	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:43.469	\N
cmdnlkrot001twopcjm7bea24	\N	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:05:43.469	\N
cmdnlmudd0002wohr0mbbmewd	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:07:20.257	\N
cmdnlmue70009wohrfdcw1kpv	cmdnlmue20006wohrwo6pyi10	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Simple Test", "totalAmount": "1000000000"}	::1	axios/1.11.0	2025-07-28 21:07:20.288	\N
cmdnlmuen000cwohry3tdh2jw	\N	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:07:20.304	\N
cmdnlnbc5000fwohrznoertmf	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:07:42.245	\N
cmdnlnbct000mwohrg2kq4xje	cmdnlnbco000jwohrzmaa37d7	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Simple Test", "totalAmount": "1000000000"}	::1	axios/1.11.0	2025-07-28 21:07:42.269	\N
cmdnlnbko000pwohr1b72hp0m	\N	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:07:42.552	\N
cmdnlp2bo000swohrwfsbss6r	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:09:03.877	\N
cmdnlp2c6000vwohrht7i32f9	\N	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:09:03.895	\N
cmdnlp2cl000ywohrm7u70v4n	\N	0x90f79bf6eb2c4f870365e785982e1f101e93b906	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:09:03.909	\N
cmdnlp2d00019wohrqr4accx0	cmdnlp2cw0013wohry816hicu	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Milestone Test Project", "totalAmount": "3000000000"}	::1	axios/1.11.0	2025-07-28 21:09:03.924	\N
cmdnlp2d8001dwohr3tq3qmc2	cmdnlp2cw0013wohry816hicu	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdnlp2d5001bwohrnf0y1v75", "milestoneTitle": "Initial Setup"}	::1	axios/1.11.0	2025-07-28 21:09:03.933	\N
cmdnlp2n1001fwohrfb7328vi	cmdnlp2cw0013wohry816hicu	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	CLAIM_REQUESTED	{"claimableAmount": "0"}	::1	axios/1.11.0	2025-07-28 21:09:04.286	\N
cmdnlp2nq001jwohr4uxvszn8	cmdnlp2cw0013wohry816hicu	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	DELIVERABLE_SUBMITTED	{"milestoneId": 1, "submissionId": "cmdnlp2nj001hwohr84hr0c0t", "milestoneTitle": "Campaign Launch"}	::1	axios/1.11.0	2025-07-28 21:09:04.31	\N
cmdnlp2ob001nwohr07jy4kzv	cmdnlp2cw0013wohry816hicu	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_DISPUTED	{"reason": "Deliverables incomplete - missing most requirements", "disputeType": "QUALITY_DISPUTE", "milestoneId": 1, "milestoneTitle": "Campaign Launch"}	::1	axios/1.11.0	2025-07-28 21:09:04.331	\N
cmdnmmqdp0002woppy9le2tvm	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:35:14.701	\N
cmdnmmqeb0005wopp11bq832f	\N	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:35:14.724	\N
cmdnmmqep0008wopp2dtgdogm	\N	0x90f79bf6eb2c4f870365e785982e1f101e93b906	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:35:14.737	\N
cmdnmmqf5000jwoppe944bmkk	cmdnmmqf1000dwoppg9r43w2q	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Milestone Test Project", "totalAmount": "3000000000"}	::1	axios/1.11.0	2025-07-28 21:35:14.753	\N
cmdnmmqfh000nwoppcwd7sky2	cmdnmmqf1000dwoppg9r43w2q	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdnmmqfb000lwopptihm2p6l", "milestoneTitle": "Initial Setup"}	::1	axios/1.11.0	2025-07-28 21:35:14.765	\N
cmdnmmqqc000pwopp6o5fx9nu	cmdnmmqf1000dwoppg9r43w2q	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	CLAIM_REQUESTED	{"claimableAmount": "0"}	::1	axios/1.11.0	2025-07-28 21:35:15.156	\N
cmdnmmqr9000twoppm7wnypas	cmdnmmqf1000dwoppg9r43w2q	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	DELIVERABLE_SUBMITTED	{"milestoneId": 1, "submissionId": "cmdnmmqr2000rwoppjurp2w7a", "milestoneTitle": "Campaign Launch"}	::1	axios/1.11.0	2025-07-28 21:35:15.189	\N
cmdnmmqrr000xwoppfqlx118z	cmdnmmqf1000dwoppg9r43w2q	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_DISPUTED	{"reason": "Deliverables incomplete - missing most requirements", "disputeType": "QUALITY_DISPUTE", "milestoneId": 1, "milestoneTitle": "Campaign Launch"}	::1	axios/1.11.0	2025-07-28 21:35:15.207	\N
cmdnmn7jc0010woppjvi4kwh5	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:35:36.937	\N
cmdnmqwld0013woppigg4l8d2	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:29.378	\N
cmdnmqwlv0016wopp0flabi74	\N	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:29.396	\N
cmdnmqwma0019wopp3jmgy3mk	\N	0x90f79bf6eb2c4f870365e785982e1f101e93b906	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:29.411	\N
cmdnmqwmj001cwopph6g8nccx	\N	0x33742d3feede42eeb82e65a0155bd46b693a69f5	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:29.419	\N
cmdnmqwmp001fwopp8rf21bjd	\N	0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:29.426	\N
cmdnmqwmx001iwopp2fj8kri5	\N	0x15d34aaf54267db7d7c367839aaf71a00a2c6a65	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:29.433	\N
cmdnmraai0029woppib1zz96z	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:47.13	\N
cmdnmqwoc001twoppjayk20k2	cmdnmqwo8001nwoppdsbb3vpr	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Base Chain Test Project", "totalAmount": "5000000000"}	::1	axios/1.11.0	2025-07-28 21:38:29.485	\N
cmdnmqwom0020wopp0uso4ktp	cmdnmqwoj001xwopp5an5emxn	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Solana Chain Test", "totalAmount": "2000000000"}	::1	axios/1.11.0	2025-07-28 21:38:29.494	\N
cmdnmqwuu0024woppsebq3zfd	cmdnmqwo8001nwoppdsbb3vpr	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdnmqwug0022woppst9smbro", "milestoneTitle": "Phase 1: Setup"}	::1	axios/1.11.0	2025-07-28 21:38:29.719	\N
cmdnmqwv10026woppc9ekuhd3	cmdnmqwo8001nwoppdsbb3vpr	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	CLAIM_REQUESTED	{"claimableAmount": "0"}	::1	axios/1.11.0	2025-07-28 21:38:29.726	\N
cmdnmraay002cwoppwfys7s8t	\N	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:47.147	\N
cmdnmrabg002fwopp26oxmy6y	\N	0x90f79bf6eb2c4f870365e785982e1f101e93b906	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:47.165	\N
cmdnmrabo002iwoppo5y74ppq	\N	0x33742d3feede42eeb82e65a0155bd46b693a69f5	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:47.172	\N
cmdnmrabu002lwoppbaujv73g	\N	0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:47.179	\N
cmdnmrac1002owoppxbzerlcq	\N	0x15d34aaf54267db7d7c367839aaf71a00a2c6a65	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:38:47.185	\N
cmdnmrade002zwopps6x7fv3i	cmdnmrada002twopph4ti72zb	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Base Chain Test Project", "totalAmount": "5000000000"}	::1	axios/1.11.0	2025-07-28 21:38:47.234	\N
cmdnmradn0036woppl3g0mu6q	cmdnmradk0033wopptvti58ry	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Solana Chain Test", "totalAmount": "2000000000"}	::1	axios/1.11.0	2025-07-28 21:38:47.243	\N
cmdnmraju003awoppz0rmxqxo	cmdnmrada002twopph4ti72zb	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdnmrajf0038wopphwf1neje", "milestoneTitle": "Phase 1: Setup"}	::1	axios/1.11.0	2025-07-28 21:38:47.466	\N
cmdnmrak1003cwoppnthav40w	cmdnmrada002twopph4ti72zb	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	CLAIM_REQUESTED	{"claimableAmount": "0"}	::1	axios/1.11.0	2025-07-28 21:38:47.473	\N
cmdnmt18l0002wognyrk7p9ny	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:40:08.709	\N
cmdnmt1960005wognnt2cm4is	\N	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:40:08.73	\N
cmdnmt19l0008wogntqcaxq89	\N	0x90f79bf6eb2c4f870365e785982e1f101e93b906	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:40:08.746	\N
cmdnmt19s000bwogn364woh4o	\N	0x33742d3feede42eeb82e65a0155bd46b693a69f5	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:40:08.753	\N
cmdnmt19z000ewognw1dxhy20	\N	0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:40:08.76	\N
cmdnmt1a7000hwogncbgoflsv	\N	0x15d34aaf54267db7d7c367839aaf71a00a2c6a65	USER_LOGIN	{"method": "metamask"}	::1	axios/1.11.0	2025-07-28 21:40:08.768	\N
cmdnmt1c0000swognq5ehm614	cmdnmt1bw000mwognwkclm5d6	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Base Chain Test Project", "totalAmount": "5000000000"}	::1	axios/1.11.0	2025-07-28 21:40:08.832	\N
cmdnmt1c9000zwogndjvudflk	cmdnmt1c6000wwognufxvnvbf	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	ESCROW_CREATED	{"projectName": "Solana Chain Test", "totalAmount": "2000000000"}	::1	axios/1.11.0	2025-07-28 21:40:08.841	\N
cmdnmt1ix0013wognagq0d6to	cmdnmt1bw000mwognwkclm5d6	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdnmt1ii0011wogn7tcs7qp6", "milestoneTitle": "Phase 1: Setup"}	::1	axios/1.11.0	2025-07-28 21:40:09.081	\N
cmdnmt1j40015wogny2vj6gkw	cmdnmt1bw000mwognwkclm5d6	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	CLAIM_REQUESTED	{"claimableAmount": "0"}	::1	axios/1.11.0	2025-07-28 21:40:09.088	\N
cmdnnhbhe000iwomh88ew1b85	\N	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	USER_LOGIN	{"method": "metamask"}	::1	curl/8.15.0	2025-07-28 21:59:01.731	\N
cmdnnqzxo0003wo9guu995v2n	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-28 22:06:33.325	\N
cmdnos80r0003wo59zaoomulx	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-28 22:35:30.075	\N
cmdpbjs240005wop8yyfqxwav	cmdpbjs1s0003wop81q5ye84x	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "23", "escrowPda": "pa85KueEHVN342YL3tJ2VZ4YwvRtZWTFeZ54YGoDHSi", "signature": "4d512McjcBfxHrgL1wK3EwetaLZqGS9NnUcvWAVtJTeNvgqtE4Sp6axNTsp9UhGtKDhx6unZFLp4i2sFYaptQiQf"}	\N	\N	2025-07-30 02:00:33.485	\N
cmdpbszwa0001wouvbd3i3w3l	\N	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 02:07:43.546	\N
cmdpcm6qo0001wognyepvk01y	\N	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 02:30:25.441	\N
cmdpco8c50003wognhvs4eflj	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 02:32:00.822	\N
cmdpcov8h0009wognltaeqb5w	cmdpcov850007wogndj8otwin	0x567e21c4b29661c3c7fac79154fca5531aa923c0	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "24", "escrowPda": "38NHXt3VTzB7mRev9bo6LP5WvTRt2epLkbw252dcZy7e", "signature": "9hgiffRmu5preTsXeuoawsTqXvohhbgbmfu6reD53PbSU8bbikhLkQFnU7sgntWCaJr3YAL4XCmHivDg3CnBLAH"}	\N	\N	2025-07-30 02:32:30.497	\N
cmdpe2dq30007worfp930kk69	cmdpe2dpl0003worfdjvd82dq	0x567e21c4b29661c3c7fac79154fca5531aa923c0	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "28", "escrowPda": "6ykYWdQc8dxQyRRY7dydUBQK38Zu84Qmo7WTidYrz8Aq", "signature": "2Cj7LnS5YgjEeeEYJDSLagP1EnvMQVbNeXL7WmiDDRdzvnyY5REt9FsTt4ExZcEZEJoF75Su3db2rNKuhnKAzUKh"}	\N	\N	2025-07-30 03:11:00.603	\N
cmdpe9enq000gworfy7m76pvk	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 03:16:28.407	\N
cmdpechlw000iworfsqjk56d6	\N	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 03:18:52.197	\N
cmdpejojk000mworftw516lgh	cmdpe2dpl0003worfdjvd82dq	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdpejoj6000kworfpafh7jvh", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 03:24:27.777	\N
cmdpeznxx0002woh3tx56jysh	\N	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 03:36:53.493	\N
cmdpfsrh60001wod5wcpycva8	\N	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 03:59:31.098	\N
cmdpg3eaw0001wo34h7b28hfh	cmdpe2dpl0003worfdjvd82dq	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	MILESTONE_RELEASED	{"amount": "100000000", "releasedBy": "admin", "milestoneIndex": 0}	\N	\N	2025-07-30 04:07:47.24	\N
cmdpg9ivv0007wolw3o6g4gsi	cmdpg9ivc0003wolwn0jxk7sr	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "29", "escrowPda": "3AfuQExm1zQ9pTMKdYL2Zd3p9XozsyHhKFGwkCW3AQRx", "signature": "Mo7fRA4umP9EBAuW7ptBaHMLyqpoXdnXR6cJqqEFXNH75Cs2XxLp6o9JXSYvn4KE482b3tNDQttGNfiPYnG2vH1"}	\N	\N	2025-07-30 04:12:33.115	\N
cmdpgaz3n000ewolw7io6pi0w	\N	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:13:40.787	\N
cmdpgblli000gwolwqu9rv4xq	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:14:09.943	\N
cmdpgc4vv000kwolwoolhs6i9	cmdpg9ivc0003wolwn0jxk7sr	0x567e21c4b29661c3c7fac79154fca5531aa923c0	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdpgc4vg000iwolwf2j2ja4l", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:14:34.939	\N
cmdpgdtyc000mwolwehwvzzgt	\N	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:15:54.085	\N
cmdpgo8o90001wovxthnow6tr	\N	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:23:59.721	\N
cmdpgpa290003wovxrrlamebp	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:24:48.178	\N
cmdphlzg00001wo1bh92e5lb5	\N	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:50:14.065	\N
cmdphmlyh0009wo1bozkqt1b1	cmdphmly10005wo1bcqquxu0r	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "30", "escrowPda": "HBMb1EscuGvFwSpx1fYGH8N9JrHWDLcZXshrpU7i8N9k", "signature": "5tJCFeBwhsWwToJuDDhasRYkFXGmpkjkzgTULJfmFXPZcfGo8apMPmhoM2vsxjAmDqGtsW3fbfja1KHhjrZQ8jwW"}	\N	\N	2025-07-30 04:50:43.242	\N
cmdphmy0d000gwo1bckdjudub	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:50:58.861	\N
cmdphn73v000kwo1boeua4fev	cmdphmly10005wo1bcqquxu0r	0x567e21c4b29661c3c7fac79154fca5531aa923c0	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdphn73i000iwo1bumzta3uc", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:51:10.651	\N
cmdphnlow000mwo1bj3va6lon	\N	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 04:51:29.552	\N
cmdpi8sa10001wo3xqmwyrpso	cmdphmly10005wo1bcqquxu0r	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	MILESTONE_RELEASED	{"note": "Off-chain release - no blockchain transaction", "amount": "1000000000", "releasedBy": "admin", "milestoneIndex": 0}	\N	\N	2025-07-30 05:07:57.866	\N
cmdpihpr00001woyufhhdmw6n	\N	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:14:54.493	\N
cmdpiidyo0009woyu3pcdlldx	cmdpiidy80005woyuc9c9zsde	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "31", "escrowPda": "FEyNwuNnScjNCdTe3XMbM3h1m3CfZo72uARqnhmXpTtL", "signature": "vN77e8ZVuf3WnAN6uGKp6GS4DoYWohSRHd4Tco45aVYtq1CxRFuLnTrJ4AdQJnR8QcJfR3GNFphC82KF7dMU41V"}	\N	\N	2025-07-30 05:15:25.872	\N
cmdpij9ta000gwoyuvrtvwgoh	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:16:07.15	\N
cmdpijjs5000kwoyukj0i6oe3	cmdpiidy80005woyuc9c9zsde	0x567e21c4b29661c3c7fac79154fca5531aa923c0	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdpijjrp000iwoyu8tcunn5i", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:16:20.07	\N
cmdpijnya000mwoyu462xk252	cmdpiidy80005woyuc9c9zsde	0x567e21c4b29661c3c7fac79154fca5531aa923c0	MILESTONE_RELEASED	{"note": "Off-chain release - no blockchain transaction", "amount": "100000000", "releasedBy": "admin", "milestoneIndex": 0}	\N	\N	2025-07-30 05:16:25.474	\N
cmdpisoxi0001wob9io0qir0x	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:23:26.646	\N
cmdpj1h8m0007wokv23a7c92e	cmdpj1h860003wokv9tv64des	0x567e21c4b29661c3c7fac79154fca5531aa923c0	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "32", "escrowPda": "9Jeqx3pwf4ZM9PCAUFugUUtRQWTb8LooVogbCDpyq86F", "signature": "RLAaUJG6Pb2vBJeJd4gDbKJ52ytX9obDaXr3Jcw2M88NYaML4H5rNrRCtoxV7Y4kBxT4dvru3va1n7afRKmzNUL"}	\N	\N	2025-07-30 05:30:16.582	\N
cmdpj1sot000ewokvdqddk7jc	\N	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:30:31.422	\N
cmdpj25r1000iwokvje498ivw	cmdpj1h860003wokv9tv64des	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdpj25qn000gwokvp2i1ulf0", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:30:48.35	\N
cmdpj2iry000kwokv4n9ba25f	\N	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:31:05.23	\N
cmdpj2mdp000mwokvkieriug3	cmdpj1h860003wokv9tv64des	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	MILESTONE_RELEASED	{"note": "Off-chain release - no blockchain transaction", "amount": "1000000000", "releasedBy": "admin", "milestoneIndex": 0}	\N	\N	2025-07-30 05:31:09.901	\N
cmdpj76hg0001wod8phgp377b	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:34:42.58	\N
cmdpj7tew0009wod85leae6n7	cmdpj7teg0005wod8ii17qs47	0x567e21c4b29661c3c7fac79154fca5531aa923c0	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "33", "escrowPda": "37WMhqBhXntccaBxjdpWwyTPj5v94XpMN5FsNfaw925R", "signature": "58FbXfoJse55EjQKTKZmoDYGRbyKQzomw4GcubV6nepj37TXnVg7zfhQNCu7TSE1zP3YyRS1eU7WFsupChaYQNLd"}	\N	\N	2025-07-30 05:35:12.297	\N
cmdpj82mn000gwod8xrnar1j6	\N	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:35:24.239	\N
cmdpj8jph000kwod851z8yw2s	cmdpj7teg0005wod8ii17qs47	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdpj8jp2000iwod85z8urqe9", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:35:46.374	\N
cmdpj8rxi000mwod8le3lfnv2	\N	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 05:35:57.03	\N
cmdpj8uqd000owod8p5ebbnmp	cmdpj7teg0005wod8ii17qs47	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	MILESTONE_RELEASED	{"note": "Off-chain release - no blockchain transaction", "amount": "100000000", "releasedBy": "admin", "milestoneIndex": 0}	\N	\N	2025-07-30 05:36:00.661	\N
cmdq76i1n000wwod8oo7k7vem	cmdq76i17000swod8gyby2ieo	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "34", "escrowPda": "DAmixjoiFo5f5ubppzXXSqRY5CXyxgQyBsdYkFAP7YCd", "signature": "5Bnr2fJzFC2G5pnSxMA1pAzfyY2xGuTnZd8SQU57xD5hj3EFEHmBGF6pM3wXwHtB9djr9xvPLhvn2hTh8h2Z4zZe"}	\N	\N	2025-07-30 16:46:01.691	\N
cmdq7at180001wol2oy1te8eq	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 16:49:22.556	\N
cmdq7axkx0005wol2demtgkhy	cmdq76i17000swod8gyby2ieo	0x567e21c4b29661c3c7fac79154fca5531aa923c0	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdq7axki0003wol2u7jiez9x", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 16:49:28.449	\N
cmdq7fscz0001wou4xcynstxn	\N	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 16:53:14.963	\N
cmdq7lp720003wou4yhzi6qxb	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 16:57:50.798	\N
cmdq7odoa000bwou4wnmh96eg	cmdq7odo20007wou4d4pwpv6v	0x567e21c4b29661c3c7fac79154fca5531aa923c0	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "35", "escrowPda": "4irucC5qqeQLhHM4264rEnAoezhUDvrnUSA9cCKLdNwA", "signature": "28oDapgDLNCSqU7KGA4Nf4GqfZzctjWmYGdHu1fG7bs5HBcte7ppmKDtyaBJEVmZA7CE3BQSV1mYDvXJ5RJxUtek"}	\N	\N	2025-07-30 16:59:55.834	\N
cmdq7paks000iwou4qndbka5w	\N	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:00:38.476	\N
cmdq7yfid0001woi0vehva0i0	\N	0x567e21c4b29661c3c7fac79154fca5531aa923c0	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:07:44.774	\N
cmdq7zqln0009woi0ploxaehn	cmdq7zql80005woi02q3snv13	0x567e21c4b29661c3c7fac79154fca5531aa923c0	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "36", "escrowPda": "5LW9pzciG2etEL7DqhQiZNNJeVAH5wcQNnBhwwLVyGUA", "signature": "5hfKLGRzFUkjqCfaXr8hLmzWRoGc1Ake3BS5LaFWMwUC5mZcVrJKvqN7QnSQ6V4BRmJFiu9rKutw7baBSUscz9rp"}	\N	\N	2025-07-30 17:08:45.804	\N
cmdq807rm000gwoi0l75krslf	\N	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:09:08.051	\N
cmdq8ddje0003woaau8hbnrr7	\N	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:19:22.059	\N
cmdq8e000000bwoaatg4jdxns	cmdq8dzzk0007woaaqgh3b4pb	cksvsdgnkwr9onaduus2qxam4jzay4mw3xcfz9l4e3du	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "37", "escrowPda": "3vgdsC1uLRPm9qgMitM3QKUwcdMNxWinh8Zbp7VD335E", "signature": "2eqELUn3wMUodN4ZkdiLt5cTC1fU4pLeVsC9nq4ng5F7a3pwacYekzffuGh9yBdQ5WXiGXU3tt4eTJqBsPSCiZQT"}	\N	\N	2025-07-30 17:19:51.169	\N
cmdq8elcm000jwoaa3j7u4g6t	\N	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:20:18.839	\N
cmdq9d9gs0002wolax1b5twad	\N	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:47:16.396	\N
cmdq9dtqn0005wolaok8r05eg	\N	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:47:42.672	\N
cmdq9jc9o0002woi4k3m24tgt	\N	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:51:59.964	\N
cmdq9oirz0003wov7zahsf1b7	cmdq8dzzk0007woaaqgh3b4pb	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdq9oirj0001wov71t8x2tcl", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:56:01.679	\N
cmdq9pan80007wov7epwj08s7	\N	gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:56:37.797	\N
cmdq9qa3s000awov7q3w7cucj	\N	gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 17:57:23.753	\N
cmdq9yg9j0002woffmld6qk9x	\N	gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:03:44.983	\N
cmdqajvuf0002wo6q7mee3c85	\N	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:20:24.951	\N
cmdqaklk6000awo6qozv0ij64	cmdqakljs0006wo6q7mcolvy0	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "38", "escrowPda": "CE79GbsGF3ETHyNtRYE92gcXGC7gg4uzVQrDmRkCrdTi", "signature": "3oQ1wFLJtncGGSd8Zsmh7u53jM7KSLde5bC4PTkc7rxyYMy755c5uwn6osXibZ9wgFCGDM6ECeCg3UW8p9VV3w6x"}	\N	\N	2025-07-30 18:20:58.279	\N
cmdqal17n000iwo6qb752kuhy	\N	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:21:18.563	\N
cmdqal5rl000mwo6qrdpjgj2d	cmdqakljs0006wo6q7mcolvy0	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdqal5rg000kwo6qvez59wod", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:21:24.465	\N
cmdqalfcr000pwo6qz3fbdmx0	\N	gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:21:36.892	\N
cmdqappem000swo6qmps2lz36	\N	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:24:56.543	\N
cmdqaqb730010wo6qii4pt1kf	cmdqaqb6o000wwo6q9rapz0ij	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "39", "escrowPda": "5EvVWEw1Jf1QvSVey4VNchrjDuBy6LQ6SPyjavcRD1UT", "signature": "5qbYwaBmvwnFeUzreMT97bro5MohD7pffVsjVT14qE9Q7krD1wNi1Ub7K3tSuRrzSnAd8ZqojqxzqWfe4ckq4FT"}	\N	\N	2025-07-30 18:25:24.784	\N
cmdqaqn2g0018wo6q3oowmj4j	\N	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:25:40.168	\N
cmdqaqs0r001cwo6qvbdcr5nr	cmdqaqb6o000wwo6q9rapz0ij	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdqaqs0c001awo6qr95uzmuf", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:25:46.587	\N
cmdqar1i8001fwo6qpy9ssxlz	\N	gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:25:58.881	\N
cmdqayqwr001iwo6qe29edt9d	\N	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:31:58.395	\N
cmdqazz0r001qwo6q4xgdnubp	cmdqazz0e001mwo6q1tucc9h6	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "40", "escrowPda": "ADpqAMcBuCqhQH7DDJpisQkk555sa3dKrk9ssGbZ2BWX", "signature": "2ErF6GGcLnqcNrbsYUb8kDPtC1mWDNEjdzYAkAqiZYCffqPovrttkwtTmjZwvs4tgBqT2M21tYBeiFrMN7ncVNsL"}	\N	\N	2025-07-30 18:32:55.564	\N
cmdqb0f6z001ywo6q992hzw7v	\N	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:33:16.524	\N
cmdqb0j9j0022wo6q7eikklmn	cmdqazz0e001mwo6q1tucc9h6	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdqb0j950020wo6qzs6yjtk0", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:33:21.8	\N
cmdqb0s310025wo6qkd5a8v8b	\N	gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:33:33.229	\N
cmdqbq6ez0002wohkbtzz9vcy	\N	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:53:18.204	\N
cmdqbqnzo000awohk4l9ahemq	cmdqbqnz80006wohkuy9e0vbr	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	ESCROW_CREATED	{"chain": "solana-devnet", "escrowId": "41", "escrowPda": "8Fc5JBkqfP5TyTPL2Kxk6HHUxCvkyGefhrSZieRZpkLc", "signature": "4qpxyeo3pQbQb8d9U7ZWYfmWnSYPndTpdZ5moWJfJVCaq6wwinucvBywDH4VMj7qDJ6JEVtjSAFHUKqKDT45uATR"}	\N	\N	2025-07-30 18:53:40.98	\N
cmdqbreac000iwohkc6h4u9qo	\N	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:54:15.061	\N
cmdqbrixr000mwohkqsbkd6y6	cmdqbqnz80006wohkuy9e0vbr	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdqbrixc000kwohkptrgno78", "milestoneTitle": "Milestone 1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:54:21.087	\N
cmdqbrsxv000pwohkl8ogs9m3	\N	gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz	USER_LOGIN	{"method": "phantom", "chainType": "solana", "originalAddress": "gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 18:54:34.051	\N
cmdqf3rj00003woinnnaannb3	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 20:27:50.941	\N
cmdqgw04h0007woinfb5oedwt	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 21:17:48.065	\N
cmdqh3ba3000bwoino87zzvhb	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 21:23:29.116	\N
cmdqhayid000fwoininidqt6p	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 21:29:25.813	\N
cmdqhvh0r0003woakqmqmsim4	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 21:45:22.924	\N
cmdqhvwf70007woakxjpqek0a	\N	0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 21:45:42.884	\N
cmdqhw20v000bwoak01jv3dsb	cmdqhmup90003wog99jfy4i49	0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdqhw20f0009woak9bat084g", "milestoneTitle": "Full Payment"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 21:45:50.143	\N
cmdqi0y7b000fwoakao82n4sw	\N	0x1ce8396337ac19a259cf3ab9ced83814700762f6	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x1ce8396337ac19a259cf3ab9ced83814700762f6"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 21:49:38.471	\N
cmdqi14vv000hwoaku8i346k6	cmdqhmup90003wog99jfy4i49	0x1ce8396337ac19a259cf3ab9ced83814700762f6	MILESTONE_RELEASED	{"note": "Off-chain release - no blockchain transaction", "amount": "1000000", "releasedBy": "admin", "milestoneIndex": 0}	\N	\N	2025-07-30 21:49:47.132	\N
cmdqiojtv0003wo3k94nalgi3	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:07:59.587	\N
cmdqj6luh0003woblp1d8ykcq	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:22:02.01	\N
cmdqjeycv0007woblrkmvyrpq	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:28:31.471	\N
cmdqjfdvv000bwoblncdbybc1	\N	0x1ce8396337ac19a259cf3ab9ced83814700762f6	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x1ce8396337ac19a259cf3ab9ced83814700762f6"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:28:51.596	\N
cmdqjg3k4000fwobltx57p5nx	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:29:24.868	\N
cmdqjrlj40003woe3vhfwf2a1	\N	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x25edb55571a963e0a4910fd59f44226ed7eb0c00"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:38:21.376	\N
cmdqjzk9v0006wobklanslao4	cmdqjzk9q0003wobksp7libjj	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	ESCROW_CREATED	{"projectName": "asdfdsfadfas", "totalAmount": "1"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:44:32.995	\N
cmdqk10q6000awobk5bvhhijk	\N	0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:45:40.975	\N
cmdqk1bp0000ewobk6uxwlpsq	cmdqjzk9q0003wobksp7libjj	0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa	DELIVERABLE_SUBMITTED	{"milestoneId": 0, "submissionId": "cmdqk1bol000cwobkngkjym92", "milestoneTitle": "Full Payment"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:45:55.189	\N
cmdqk1n0v000iwobktwhpiygj	\N	0x1ce8396337ac19a259cf3ab9ced83814700762f6	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x1ce8396337ac19a259cf3ab9ced83814700762f6"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:46:09.871	\N
cmdqka13v0003wo9kjuzugy02	\N	0x1ce8396337ac19a259cf3ab9ced83814700762f6	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x1ce8396337ac19a259cf3ab9ced83814700762f6"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:52:41.372	\N
cmdqkciew0003woqbwpfk92c0	\N	0x1ce8396337ac19a259cf3ab9ced83814700762f6	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x1ce8396337ac19a259cf3ab9ced83814700762f6"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 22:54:37.113	\N
cmdqknqrn0007woqbf4ycmvhl	\N	0x1ce8396337ac19a259cf3ab9ced83814700762f6	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x1ce8396337ac19a259cf3ab9ced83814700762f6"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 23:03:21.155	\N
cmdql103h000bwoqbuilrxwu6	\N	0x33742d3feede42eeb82e65a0155bd46b693a69f5	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x33742d3feede42eeb82e65a0155bd46b693a69f5"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 23:13:39.774	\N
cmdqldtma000fwoqboxh9wbuk	\N	0x1ce8396337ac19a259cf3ab9ced83814700762f6	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x1ce8396337ac19a259cf3ab9ced83814700762f6"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 23:23:37.907	\N
cmdqlkq5j000jwoqb8k3hanqa	\N	0x1ce8396337ac19a259cf3ab9ced83814700762f6	USER_LOGIN	{"method": "metamask", "chainType": "evm", "originalAddress": "0x1ce8396337ac19a259cf3ab9ced83814700762f6"}	::ffff:127.0.0.1	Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0	2025-07-30 23:29:00.007	\N
\.


--
-- Data for Name: ChainConfig; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChainConfig" (id, "chainId", "chainName", "chainType", "rpcUrl", "wsUrl", "explorerUrl", "nativeCurrency", "blockTime", "isTestnet", "isActive", "contractAddresses", metadata, "createdAt", "updatedAt") FROM stdin;
cmdnjpzkl0000wojm3sm3ve8e	base	Base	evm	https://0xrpc.io/base	\N	https://basescan.org	{"name": "Ether", "symbol": "ETH", "decimals": 18}	2	f	t	{"factory": ""}	\N	2025-07-28 20:13:47.734	2025-07-28 20:13:47.734
cmdnjpzkz0001wojmuwhpufja	base-sepolia	Base Sepolia	evm	https://sepolia.base.org	\N	https://sepolia.basescan.org	{"name": "Ether", "symbol": "ETH", "decimals": 18}	2	t	t	{"factory": ""}	\N	2025-07-28 20:13:47.747	2025-07-28 20:13:47.747
cmdnjpzl30002wojmp8gxn9sc	solana-mainnet	Solana	solana	https://api.mainnet-beta.solana.com	\N	https://explorer.solana.com	{"name": "Solana", "symbol": "SOL", "decimals": 9}	0.4	f	t	{"programId": ""}	{"cluster": "mainnet-beta", "supportedTokens": [{"name": "USD Coin", "symbol": "USDC", "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "decimals": 6}, {"name": "Tether USD", "symbol": "USDT", "address": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "decimals": 6}]}	2025-07-28 20:13:47.751	2025-07-28 20:13:47.751
cmdnjpzl70003wojmnujqebod	solana-devnet	Solana Devnet	solana	https://api.devnet.solana.com	\N	https://explorer.solana.com?cluster=devnet	{"name": "Solana", "symbol": "SOL", "decimals": 9}	0.4	t	t	{"programId": ""}	{"cluster": "devnet", "supportedTokens": []}	2025-07-28 20:13:47.755	2025-07-28 20:13:47.755
\.


--
-- Data for Name: ChainHealth; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChainHealth" (id, "chainId", status, latency, "blockHeight", "checkedAt", error) FROM stdin;
\.


--
-- Data for Name: Dispute; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Dispute" (id, "escrowId", "disputeType", "raisedBy", reason, evidence, status, resolution, "resolvedBy", "createdAt", "updatedAt", "resolvedAt") FROM stdin;
cmdnlp2nw001lwohrzcx5fgid	cmdnlp2cw0013wohry816hicu	QUALITY_DISPUTE	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	Deliverables incomplete - missing most requirements	\N	OPEN	\N	\N	2025-07-28 21:09:04.316	2025-07-28 21:09:04.316	\N
cmdnmmqrf000vwoppjt1rb5g0	cmdnmmqf1000dwoppg9r43w2q	QUALITY_DISPUTE	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	Deliverables incomplete - missing most requirements	\N	OPEN	\N	\N	2025-07-28 21:35:15.195	2025-07-28 21:35:15.195	\N
\.


--
-- Data for Name: Escrow; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Escrow" (id, "contractAddress", "factoryAddress", "chainId", "blockNumber", "transactionHash", "projectName", "dealType", "customDealType", "dealDescription", "startDate", "endDate", "projectAddress", "kolAddress", "tokenAddress", "tokenSymbol", "tokenDecimals", "totalAmount", "releasedAmount", status, "requireVerification", "verificationMethod", "disputeResolutionMethod", "arbitratorAddress", "createdAt", "updatedAt", "completedAt", "cancelledAt", "claimedAmount", requirements, "adminControlled", "chainData", "chainEscrowId", "lastSyncedAt", "platformFeeBps", chain, "escrowTokenAccount") FROM stdin;
cmdnlmue20006wohrwo6pyi10	0x19852dc844d	\N	base	1000000	0x19852dc844d19852dc844d	Simple Test	SPONSORSHIP	\N	Simple test escrow	2025-07-28 21:07:20.269	2025-08-27 21:07:20.269	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913	USDC	6	1000000000	0	ACTIVE	f	\N	\N	\N	2025-07-28 21:07:20.282	2025-07-28 21:07:20.282	\N	\N	0	\N	f	{}	0x19852dc844d	\N	\N	base-sepolia	\N
cmdnlnbco000jwohrzmaa37d7	0x19852dcda2d00000000000000000000000000000	\N	base	1000000	0x19852dcda2d19852dcda2d	Simple Test	SPONSORSHIP	\N	Simple test escrow	2025-07-28 21:07:42.253	2025-08-27 21:07:42.253	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913	USDC	6	1000000000	0	ACTIVE	f	\N	\N	\N	2025-07-28 21:07:42.264	2025-07-28 21:07:42.264	\N	\N	0	\N	f	{}	0x19852dcda2d00000000000000000000000000000	\N	\N	base-sepolia	\N
cmdnlp2cw0013wohry816hicu	0x19852de192b00000000000000000000000000000	\N	base	1000000	0x19852de192b00000000000000000000000000000000000000000000000000000	Milestone Test Project	SPONSORSHIP	\N	Testing milestone submission and release flow	2025-07-28 21:09:03.915	2025-09-26 21:09:03.915	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913	USDC	6	3000000000	0	DISPUTED	t	SINGLE	\N	\N	2025-07-28 21:09:03.921	2025-07-28 21:09:04.327	\N	\N	0	\N	f	{}	0x19852de192b00000000000000000000000000000	\N	\N	base-sepolia	\N
cmdnmmqf1000dwoppg9r43w2q	0x19852f6113500000000000000000000000000000	\N	base	1000000	0x19852f6113500000000000000000000000000000000000000000000000000000	Milestone Test Project	SPONSORSHIP	\N	Testing milestone submission and release flow	2025-07-28 21:35:14.741	2025-09-26 21:35:14.741	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913	USDC	6	3000000000	0	DISPUTED	t	SINGLE	\N	\N	2025-07-28 21:35:14.749	2025-07-28 21:35:15.204	\N	\N	0	\N	f	{}	0x19852f6113500000000000000000000000000000	\N	\N	base-sepolia	\N
cmdnmqwo8001nwoppdsbb3vpr	0x19852f909e100000000000000000000000000000	\N	base	1938956	0xa8b74a9ab7b688526496f2db8ab9918f1b5817a72f7dde1e100e9b744250a488	Base Chain Test Project	SPONSORSHIP	\N	Complete system test on Base chain	2025-07-28 21:38:29.474	2025-10-26 21:38:29.474	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913	USDC	6	5000000000	0	ACTIVE	t	SINGLE	\N	\N	2025-07-28 21:38:29.481	2025-07-28 21:38:29.481	\N	\N	0	\N	f	{}	0x19852f909e100000000000000000000000000000	\N	\N	base-sepolia	\N
cmdnmqwoj001xwopp5an5emxn	\N	\N	solana-mainnet	250039354	b3309af7c3f505c86e02c01f390f6a01f31f1a539cc68d1ec36191daa17a2ae5	Solana Chain Test	AMBASSADOR	\N	Testing Solana integration	2025-07-28 21:38:29.487	2025-08-27 21:38:29.487	Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB	GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW	EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v	USDC	6	2000000000	0	ACTIVE	f	\N	\N	\N	2025-07-28 21:38:29.491	2025-07-28 21:38:29.491	\N	\N	0	\N	f	{"pdas": {"vault": "VaultPDA1111111111111111111111111111111111", "escrow": "EscrowPDA111111111111111111111111111111111"}, "programId": "EscrowProgram111111111111111111111111111111"}	solana-escrow-1753738709487	\N	\N	base-sepolia	\N
cmdnmrada002twopph4ti72zb	0x19852f94f3700000000000000000000000000000	\N	base	1664481	0xcfa68157414c1087fdebb8ffced9712c5f87bbfe7dc70c5098145700d9e154f7	Base Chain Test Project	SPONSORSHIP	\N	Complete system test on Base chain	2025-07-28 21:38:47.223	2025-10-26 21:38:47.223	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913	USDC	6	5000000000	0	ACTIVE	t	SINGLE	\N	\N	2025-07-28 21:38:47.23	2025-07-28 21:38:47.23	\N	\N	0	\N	f	{}	0x19852f94f3700000000000000000000000000000	\N	\N	base-sepolia	\N
cmdnmradk0033wopptvti58ry	\N	\N	solana-mainnet	250098795	ce3ad464d45380e498954cc18dcba6910bd15a6c6e1676b30460d3ddbbf5e695	Solana Chain Test	AMBASSADOR	\N	Testing Solana integration	2025-07-28 21:38:47.236	2025-08-27 21:38:47.236	Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB	GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW	EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v	USDC	6	2000000000	0	ACTIVE	f	\N	\N	\N	2025-07-28 21:38:47.241	2025-07-28 21:38:47.241	\N	\N	0	\N	f	{"pdas": {"vault": "VaultPDA1111111111111111111111111111111111", "escrow": "EscrowPDA111111111111111111111111111111111"}, "programId": "EscrowProgram111111111111111111111111111111"}	solana-escrow-1753738727236	\N	\N	base-sepolia	\N
cmdnmt1bw000mwognwkclm5d6	0x19852fa8df400000000000000000000000000000	\N	base	1530192	0x12fe02e5b182efd9031724614ea47cfb6de5c3ae8047ac54e521ba6e3e765e35	Base Chain Test Project	SPONSORSHIP	\N	Complete system test on Base chain	2025-07-28 21:40:08.821	2025-10-26 21:40:08.821	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913	USDC	6	5000000000	0	ACTIVE	t	SINGLE	\N	\N	2025-07-28 21:40:08.828	2025-07-28 21:40:08.828	\N	\N	0	\N	f	{}	0x19852fa8df400000000000000000000000000000	\N	\N	base-sepolia	\N
cmdnmt1c6000wwognufxvnvbf	\N	\N	solana-mainnet	250074621	8e3bb7cb77b17ab79a84b58001b4f5f36598cb7cc8d6c910132b138e3722d86d	Solana Chain Test	AMBASSADOR	\N	Testing Solana integration	2025-07-28 21:40:08.834	2025-08-27 21:40:08.834	Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB	GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW	EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v	USDC	6	2000000000	0	ACTIVE	f	\N	\N	\N	2025-07-28 21:40:08.838	2025-07-28 21:40:08.838	\N	\N	0	\N	f	{"pdas": {"vault": "VaultPDA1111111111111111111111111111111111", "escrow": "EscrowPDA111111111111111111111111111111111"}, "programId": "EscrowProgram111111111111111111111111111111"}	solana-escrow-1753738808834	\N	\N	base-sepolia	\N
cmdpao6ud0003wocydm02t87x	0x38229e88ca6b9fe996e125949363b8aae62850b4	0x0000000000000000000000000000000000000000	901	0	5pDxb6K9TrsZG6GqGwLh3jBQNMHqUvZu2zFMbRbeLvWn9nZSUjkJHqjudrwfWwSG6THfUvm8vVDjtBxkhTsF7Skx	dfsafasd	Other	\N	asdfasdf	2025-07-30 01:35:59.653	2025-08-29 01:35:59.653	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	0	ACTIVE	f	\N	\N	\N	2025-07-30 01:35:59.653	2025-07-30 01:35:59.653	\N	\N	0	\N	f	\N	21	\N	\N	base-sepolia	\N
cmdpba7pd0006woycjgbwn7da	0x6210ea94791c877be8568377a78aaf024704c8fc	0x0000000000000000000000000000000000000000	901	0	4sWAkPfYvBNMTxhrzWkdfZHQHTPFyung7Xc3n6HHzn7r5bmSksHx5uyyCUCdhKJXymQX6mGcL6TrcvBAP9k2TjPV	gfsdgfsd	Other	\N	asdfasdffdas	2025-07-30 01:53:07.201	2025-08-29 01:53:07.201	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	0	ACTIVE	f	\N	\N	\N	2025-07-30 01:53:07.202	2025-07-30 01:53:07.202	\N	\N	0	\N	f	\N	22	\N	\N	base-sepolia	\N
cmdpbjs1s0003wop81q5ye84x	0xc5fcfcf8341dcb4179a8d21e30aab47f637d6926	0x0000000000000000000000000000000000000000	901	0	4d512McjcBfxHrgL1wK3EwetaLZqGS9NnUcvWAVtJTeNvgqtE4Sp6axNTsp9UhGtKDhx6unZFLp4i2sFYaptQiQf	dsfafasd	Other	\N	asdfasfasd	2025-07-30 02:00:33.472	2025-08-29 02:00:33.472	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	0	ACTIVE	f	\N	\N	\N	2025-07-30 02:00:33.473	2025-07-30 02:00:33.473	\N	\N	0	\N	f	\N	23	\N	\N	base-sepolia	\N
cmdpcov850007wogndj8otwin	0xf6660e1e94640eb70dd39065ea11e4b50d16015a	0x0000000000000000000000000000000000000000	901	0	9hgiffRmu5preTsXeuoawsTqXvohhbgbmfu6reD53PbSU8bbikhLkQFnU7sgntWCaJr3YAL4XCmHivDg3CnBLAH	sdfgdsfg	Other	\N	sdfgsdfg	2025-07-30 02:32:30.484	2025-08-29 02:32:30.484	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	204000000	0	ACTIVE	f	\N	\N	\N	2025-07-30 02:32:30.485	2025-07-30 02:32:30.485	\N	\N	0	{}	f	\N	24	\N	\N	base-sepolia	\N
cmdpdiqvg0003wolre5fhzdo8	0x2a9479c51dbe74b7f85b28d3f1ea428df95a08b7	0x0000000000000000000000000000000000000000	901	0	5ksK7foF2rXCqJH8pQSmBdJcJNfthKaR2hc5tqbjAWTBnvJ7txrHZvhLA4PMfmG52cE1S67gFWdbmbNG5BXPuR9V	sdfgsdgfr	Other	\N	sdfgsdfg	2025-07-30 02:55:44.523	2025-08-29 02:55:44.523	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	0	ACTIVE	f	\N	\N	\N	2025-07-30 02:55:44.524	2025-07-30 02:55:44.524	\N	\N	0	{}	f	\N	25	\N	\N	base-sepolia	\N
cmdpdot9u0003wow0ou1cwo4e	0x8f63de93d353391bbec3de5096a98f64c3856288	0x0000000000000000000000000000000000000000	901	0	5TDBQsBAU1U4iSa6xd2kanfipR82RfK2mT1ewsuJnzWTaPr2tbMtgeFwtYPkPRPcoUqMLg7vtA22dRoiNx9chRuw	sdafgsadf	Other	\N	asdfasdfsad	2025-07-30 03:00:27.57	2025-08-29 03:00:27.57	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	0	ACTIVE	f	\N	\N	\N	2025-07-30 03:00:27.57	2025-07-30 03:00:27.57	\N	\N	0	{}	f	\N	26	\N	\N	base-sepolia	\N
cmdpdwt4g0003woerft8sii3p	0x145948f86e6fe0309ea91636b48a2434fee068d1	0x0000000000000000000000000000000000000000	901	0	DMFpxaDETNjMZF288Wo1Ge2nYg2498xdVoZGqUpUiUE4jdGgQLvvSMdb7KT3y9j95rqaNfvrQ8ijdWkYCoMxpMK	asdfasdf	Other	\N	asdfsadfsadf	2025-07-30 03:06:40.623	2025-08-29 03:06:40.623	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	0	ACTIVE	f	\N	\N	\N	2025-07-30 03:06:40.624	2025-07-30 03:06:40.624	\N	\N	0	{}	f	\N	27	\N	\N	base-sepolia	\N
cmdpe2dpl0003worfdjvd82dq	0xd38274e46a80417212cd1120c038f924e877a358	0x0000000000000000000000000000000000000000	901	0	2Cj7LnS5YgjEeeEYJDSLagP1EnvMQVbNeXL7WmiDDRdzvnyY5REt9FsTt4ExZcEZEJoF75Su3db2rNKuhnKAzUKh	asdfsadfasd	Other	\N	asdfasdf	2025-07-30 03:11:00.584	2025-08-29 03:11:00.584	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	100000000	ACTIVE	f	\N	\N	\N	2025-07-30 03:11:00.585	2025-07-30 04:07:47.236	\N	\N	0	{}	f	\N	28	\N	\N	base-sepolia	\N
cmdphmly10005wo1bcqquxu0r	0x459a74d572277e9e0a1b92292334a8ace561c1d5	0x0000000000000000000000000000000000000000	901	0	5tJCFeBwhsWwToJuDDhasRYkFXGmpkjkzgTULJfmFXPZcfGo8apMPmhoM2vsxjAmDqGtsW3fbfja1KHhjrZQ8jwW	asdfasdf	Other	\N	asdfasdfsa	2025-07-30 04:50:43.225	2025-08-29 04:50:43.225	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	1020000000	1000000000	ACTIVE	f	\N	\N	\N	2025-07-30 04:50:43.226	2025-07-30 05:07:57.861	\N	\N	0	{}	f	\N	30	\N	\N	base-sepolia	\N
cmdpg9ivc0003wolwn0jxk7sr	\N	0x0000000000000000000000000000000000000000	901	0	Mo7fRA4umP9EBAuW7ptBaHMLyqpoXdnXR6cJqqEFXNH75Cs2XxLp6o9JXSYvn4KE482b3tNDQttGNfiPYnG2vH1	5 billion rocks	Other	\N	ukrainan misile	2025-07-30 04:12:33.096	2025-08-29 04:12:33.096	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	0	ACTIVE	f	\N	\N	\N	2025-07-30 04:12:33.097	2025-07-30 05:00:21.649	\N	\N	0	{}	f	\N	29	\N	\N	solana-devnet	\N
cmdpiidy80005woyuc9c9zsde	0xdb0d8afd031b2c403fca7be402ddc7562c862285	0x0000000000000000000000000000000000000000	901	0	vN77e8ZVuf3WnAN6uGKp6GS4DoYWohSRHd4Tco45aVYtq1CxRFuLnTrJ4AdQJnR8QcJfR3GNFphC82KF7dMU41V	asdfasdfasd	Other	\N	asdfasdfas	2025-07-30 05:15:25.855	2025-08-29 05:15:25.855	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	100000000	ACTIVE	f	\N	\N	\N	2025-07-30 05:15:25.856	2025-07-30 05:16:25.47	\N	\N	0	{}	f	\N	31	\N	\N	base-sepolia	\N
cmdpj1h860003wokv9tv64des	0xf9f26a6d741de3d2bcd623be583781df64b4c81c	0x0000000000000000000000000000000000000000	901	0	RLAaUJG6Pb2vBJeJd4gDbKJ52ytX9obDaXr3Jcw2M88NYaML4H5rNrRCtoxV7Y4kBxT4dvru3va1n7afRKmzNUL	grdgfdfgds	Other	\N	sdfgsfgdsdfgsdfgsdfg	2025-07-30 05:30:16.565	2025-08-29 05:30:16.565	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	1020000000	1000000000	ACTIVE	f	\N	\N	\N	2025-07-30 05:30:16.566	2025-07-30 05:31:09.897	\N	\N	0	{}	f	\N	32	\N	\N	base-sepolia	\N
cmdpj7teg0005wod8ii17qs47	0x2ca028401d2453d8ad0db9f82cc95b6b1fe80094	0x0000000000000000000000000000000000000000	901	0	58FbXfoJse55EjQKTKZmoDYGRbyKQzomw4GcubV6nepj37TXnVg7zfhQNCu7TSE1zP3YyRS1eU7WFsupChaYQNLd	fgdsdfghsdfghsgdf	Other	\N	gsdfsdfgsdfgsgfdfgsdsdfg	2025-07-30 05:35:12.28	2025-08-29 05:35:12.28	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	100000000	ACTIVE	f	\N	\N	\N	2025-07-30 05:35:12.281	2025-07-30 05:36:00.658	\N	\N	0	{}	f	\N	33	\N	\N	base-sepolia	\N
cmdq76i17000swod8gyby2ieo	0x5e06f128fb6d75f1587c43c9dc7b9da05f1160af	0x0000000000000000000000000000000000000000	901	0	5Bnr2fJzFC2G5pnSxMA1pAzfyY2xGuTnZd8SQU57xD5hj3EFEHmBGF6pM3wXwHtB9djr9xvPLhvn2hTh8h2Z4zZe	dfsgfsdg	Other	\N	sdfgsdfgsdfg	2025-07-30 16:46:01.674	2025-08-29 16:46:01.674	0xd1e1e96368246d8c91907fa35587bfb82b66b22c	0x567e21c4b29661c3c7fac79154fca5531aa923c0	0xe246c49d3cda5b8a46d7075e667e1b0b4ed4e51f	SOL	9	102000000	0	ACTIVE	f	\N	\N	\N	2025-07-30 16:46:01.675	2025-07-30 16:46:01.675	\N	\N	0	{}	f	\N	34	\N	\N	base-sepolia	\N
cmdq7odo20007wou4d4pwpv6v	4irucC5qqeQLhHM4264rEnAoezhUDvrnUSA9cCKLdNwA	0x0000000000000000000000000000000000000000	901	0	28oDapgDLNCSqU7KGA4Nf4GqfZzctjWmYGdHu1fG7bs5HBcte7ppmKDtyaBJEVmZA7CE3BQSV1mYDvXJ5RJxUtek	gfhdhfgdfhgdfghd	Other	\N	gfhdfghgfhddfghhfgdhfgd	2025-07-30 16:59:55.826	2025-08-29 16:59:55.826	0x567e21c4b29661c3c7fac79154fca5531aa923c0	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	So11111111111111111111111111111111111111112	SOL	9	102000000	0	ACTIVE	t	\N	\N	\N	2025-07-30 16:59:55.827	2025-07-30 16:59:55.827	\N	\N	0	{}	t	\N	35	\N	\N	solana-devnet	\N
cmdq7zql80005woi02q3snv13	5LW9pzciG2etEL7DqhQiZNNJeVAH5wcQNnBhwwLVyGUA	0x0000000000000000000000000000000000000000	901	0	5hfKLGRzFUkjqCfaXr8hLmzWRoGc1Ake3BS5LaFWMwUC5mZcVrJKvqN7QnSQ6V4BRmJFiu9rKutw7baBSUscz9rp	popwsweer	Other	\N	sdfsdfaadsfsdfasdfasdfa	2025-07-30 17:08:45.787	2025-08-29 17:08:45.787	0x567e21c4b29661c3c7fac79154fca5531aa923c0	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	So11111111111111111111111111111111111111112	SOL	9	102000000	0	ACTIVE	t	\N	\N	\N	2025-07-30 17:08:45.788	2025-07-30 17:08:45.788	\N	\N	0	{}	t	\N	36	\N	\N	solana-devnet	\N
cmdq8dzzk0007woaaqgh3b4pb	3vgdsC1uLRPm9qgMitM3QKUwcdMNxWinh8Zbp7VD335E	0x0000000000000000000000000000000000000000	901	0	2eqELUn3wMUodN4ZkdiLt5cTC1fU4pLeVsC9nq4ng5F7a3pwacYekzffuGh9yBdQ5WXiGXU3tt4eTJqBsPSCiZQT	sdadsfaasdf	Other	\N	sadfadfsfasdsdfadsf	2025-07-30 17:19:51.152	2025-08-29 17:19:51.152	cksvsdgnkwr9onaduus2qxam4jzay4mw3xcfz9l4e3du	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	So11111111111111111111111111111111111111112	SOL	9	1020000000	0	ACTIVE	t	\N	\N	\N	2025-07-30 17:19:51.153	2025-07-30 17:19:51.153	\N	\N	0	{}	t	\N	37	\N	\N	solana-devnet	\N
cmdqakljs0006wo6q7mcolvy0	CE79GbsGF3ETHyNtRYE92gcXGC7gg4uzVQrDmRkCrdTi	0x0000000000000000000000000000000000000000	901	0	3oQ1wFLJtncGGSd8Zsmh7u53jM7KSLde5bC4PTkc7rxyYMy755c5uwn6osXibZ9wgFCGDM6ECeCg3UW8p9VV3w6x	asdfsadfdsa	Other	\N	dfsasdfasdfasdaf	2025-07-30 18:20:58.264	2025-08-29 18:20:58.264	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	So11111111111111111111111111111111111111112	SOL	9	102000000	0	ACTIVE	t	\N	\N	\N	2025-07-30 18:20:58.265	2025-07-30 18:20:58.265	\N	\N	0	{}	t	\N	38	\N	\N	solana-devnet	\N
cmdqaqb6o000wwo6q9rapz0ij	5EvVWEw1Jf1QvSVey4VNchrjDuBy6LQ6SPyjavcRD1UT	0x0000000000000000000000000000000000000000	901	0	5qbYwaBmvwnFeUzreMT97bro5MohD7pffVsjVT14qE9Q7krD1wNi1Ub7K3tSuRrzSnAd8ZqojqxzqWfe4ckq4FT	asfdsdaffsda	Other	\N	asdffdsaafsddsf	2025-07-30 18:25:24.768	2025-08-29 18:25:24.768	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	So11111111111111111111111111111111111111112	SOL	9	1530000000	0	ACTIVE	t	\N	\N	\N	2025-07-30 18:25:24.769	2025-07-30 18:25:24.769	\N	\N	0	{}	t	\N	39	\N	\N	solana-devnet	\N
cmdqazz0e001mwo6q1tucc9h6	ADpqAMcBuCqhQH7DDJpisQkk555sa3dKrk9ssGbZ2BWX	0x0000000000000000000000000000000000000000	901	0	2ErF6GGcLnqcNrbsYUb8kDPtC1mWDNEjdzYAkAqiZYCffqPovrttkwtTmjZwvs4tgBqT2M21tYBeiFrMN7ncVNsL	asdffdsasdaf	Other	\N	dsafasfdfasdsadffsd	2025-07-30 18:32:55.55	2025-08-29 18:32:55.55	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	So11111111111111111111111111111111111111112	SOL	9	510000000	0	ACTIVE	t	\N	\N	\N	2025-07-30 18:32:55.55	2025-07-30 18:32:55.55	\N	\N	0	{}	t	\N	40	\N	\N	solana-devnet	4trop27Lq9SHw8yHe8XvGrHdhqcxDjNmWRjV4EXWvJp1
cmdqbqnz80006wohkuy9e0vbr	8Fc5JBkqfP5TyTPL2Kxk6HHUxCvkyGefhrSZieRZpkLc	0x0000000000000000000000000000000000000000	901	0	4qpxyeo3pQbQb8d9U7ZWYfmWnSYPndTpdZ5moWJfJVCaq6wwinucvBywDH4VMj7qDJ6JEVtjSAFHUKqKDT45uATR	hello	Other	\N	hello	2025-07-30 18:53:40.963	2025-08-29 18:53:40.963	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	So11111111111111111111111111111111111111112	SOL	9	1020000000	1000000000	ACTIVE	t	\N	\N	\N	2025-07-30 18:53:40.964	2025-07-30 18:53:40.964	\N	\N	0	{}	t	\N	41	\N	\N	solana-devnet	7d1QYku1oyPMtGNrDhLK6HpMVjFh6Y7nnx11nsU4VhN3
cmdqhmup90003wog99jfy4i49	0xa7eea1ec35840f4f1da9c84ba1a6618fe34ba0fe	0xdfa01a79fb8bb816bc77ae9cc6c2404b87c2cd18	84532	29071346	0x7e622eae7966e2fef86675d10e75178253d6b78181a0400b43aa6ffa5755c32b	Test Project	promotional	\N	Test escrow	2025-07-30 21:38:40.749	2026-07-30 21:38:40.749	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa	0x036cbd53842c5426634e7929541ec2318f3dcf7e	USDC	6	1000000	1000000	COMPLETED	f	\N	\N	\N	2025-07-30 21:38:40.75	2025-07-30 21:49:47.128	\N	\N	0	\N	f	\N		\N	\N	base-sepolia	\N
cmdqjzk9q0003wobksp7libjj	0x2af23bf10505f93092dd9c03e222a94de8c3be70	0xdfa01a79fb8bb816bc77ae9cc6c2404b87c2cd18	84532	29073592	0x57c7b95ae519dda0b95cdd248b587bd2d22c69da6d79a4839fbca689365659f3	asdfdsfadfas	promotional	\N	fdsaafsddfsadfsa	2025-07-30 22:44:26	2026-07-30 22:44:26	0x25edb55571a963e0a4910fd59f44226ed7eb0c00	0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa	0x036cbd53842c5426634e7929541ec2318f3dcf7e	USDC	6	1	0	ACTIVE	f	\N	\N	\N	2025-07-30 22:44:32.99	2025-07-30 22:44:32.99	\N	\N	0	\N	f	\N	0x2af23bf10505f93092dd9c03e222a94de8c3be70	\N	\N	base-sepolia	\N
\.


--
-- Data for Name: Milestone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Milestone" (id, "escrowId", "milestoneIndex", title, description, amount, percentage, "releaseDate", conditions, released, verified, "releasedAt", "verifiedAt", claimed, "claimedAt", "updatedAt", "verificationStatus") FROM stdin;
cmdnlmue20007wohrvaknga2j	cmdnlmue20006wohrwo6pyi10	0	Test Milestone	Simple test milestone	1000000000	100	2025-08-04 21:07:20.269	{}	f	f	\N	\N	f	\N	2025-07-28 21:07:20.282	\N
cmdnlnbco000kwohr8uivoif4	cmdnlnbco000jwohrzmaa37d7	0	Test Milestone	Simple test milestone	1000000000	100	2025-08-04 21:07:42.253	{}	f	f	\N	\N	f	\N	2025-07-28 21:07:42.264	\N
cmdnlp2cw0016wohrln9jm8hj	cmdnlp2cw0013wohry816hicu	2	Final Delivery	Complete campaign with analytics	1000000000	33.34	2025-08-27 21:09:03.915	{"Final report","Analytics dashboard"}	f	f	\N	\N	f	\N	2025-07-28 21:09:03.921	\N
cmdnlp2cw0014wohra8zn499p	cmdnlp2cw0013wohry816hicu	0	Initial Setup	Set up social media accounts and initial content	1000000000	33.33	2025-08-04 21:09:03.915	{"Create Twitter thread","Post Instagram story"}	f	f	\N	\N	f	\N	2025-07-28 21:09:03.931	PENDING
cmdnlp2cw0015wohrcvmg7zfe	cmdnlp2cw0013wohry816hicu	1	Campaign Launch	Launch main campaign	1000000000	33.33	2025-08-11 21:09:03.915	{"10+ posts","1000+ engagements"}	f	f	\N	\N	f	\N	2025-07-28 21:09:04.323	DISPUTED
cmdnmmqf1000gwoppulcp7fhb	cmdnmmqf1000dwoppg9r43w2q	2	Final Delivery	Complete campaign with analytics	1000000000	33.34	2025-08-27 21:35:14.741	{"Final report","Analytics dashboard"}	f	f	\N	\N	f	\N	2025-07-28 21:35:14.749	\N
cmdnmmqf1000ewoppchi0qrq8	cmdnmmqf1000dwoppg9r43w2q	0	Initial Setup	Set up social media accounts and initial content	1000000000	33.33	2025-08-04 21:35:14.741	{"Create Twitter thread","Post Instagram story"}	f	f	\N	\N	f	\N	2025-07-28 21:35:14.763	PENDING
cmdnmmqf1000fwoppba7qznww	cmdnmmqf1000dwoppg9r43w2q	1	Campaign Launch	Launch main campaign	1000000000	33.33	2025-08-11 21:35:14.741	{"10+ posts","1000+ engagements"}	f	f	\N	\N	f	\N	2025-07-28 21:35:15.202	DISPUTED
cmdnmqwo8001pwoppfxymq65b	cmdnmqwo8001nwoppdsbb3vpr	1	Phase 2: Execution	Main campaign execution	2000000000	40	2025-08-27 21:38:29.474	{"10+ posts","Community engagement"}	f	f	\N	\N	f	\N	2025-07-28 21:38:29.481	\N
cmdnmqwo8001qwoppj1a94dw3	cmdnmqwo8001nwoppdsbb3vpr	2	Phase 3: Completion	Final delivery and reporting	1500000000	30	2025-09-26 21:38:29.474	{"Final report","Analytics provided"}	f	f	\N	\N	f	\N	2025-07-28 21:38:29.481	\N
cmdnmqwoj001ywoppukrwiecz	cmdnmqwoj001xwopp5an5emxn	0	Single Milestone	Complete Solana test	2000000000	100	2025-08-12 21:38:29.487	{}	f	f	\N	\N	f	\N	2025-07-28 21:38:29.491	\N
cmdnmqwo8001owoppygd88itw	cmdnmqwo8001nwoppdsbb3vpr	0	Phase 1: Setup	Initial setup and configuration	1500000000	30	2025-08-07 21:38:29.474	{"Setup complete","Initial content posted"}	f	f	\N	\N	f	\N	2025-07-28 21:38:29.715	PENDING
cmdnmrada002vwoppzy7skb9h	cmdnmrada002twopph4ti72zb	1	Phase 2: Execution	Main campaign execution	2000000000	40	2025-08-27 21:38:47.223	{"10+ posts","Community engagement"}	f	f	\N	\N	f	\N	2025-07-28 21:38:47.23	\N
cmdnmrada002wwoppt7v9v8xm	cmdnmrada002twopph4ti72zb	2	Phase 3: Completion	Final delivery and reporting	1500000000	30	2025-09-26 21:38:47.223	{"Final report","Analytics provided"}	f	f	\N	\N	f	\N	2025-07-28 21:38:47.23	\N
cmdnmradk0034wopp3thu7gi3	cmdnmradk0033wopptvti58ry	0	Single Milestone	Complete Solana test	2000000000	100	2025-08-12 21:38:47.236	{}	f	f	\N	\N	f	\N	2025-07-28 21:38:47.241	\N
cmdnmrada002uwopphrvrjpp0	cmdnmrada002twopph4ti72zb	0	Phase 1: Setup	Initial setup and configuration	1500000000	30	2025-08-07 21:38:47.223	{"Setup complete","Initial content posted"}	f	f	\N	\N	f	\N	2025-07-28 21:38:47.462	PENDING
cmdnmt1bw000owognwq7uuxs8	cmdnmt1bw000mwognwkclm5d6	1	Phase 2: Execution	Main campaign execution	2000000000	40	2025-08-27 21:40:08.821	{"10+ posts","Community engagement"}	f	f	\N	\N	f	\N	2025-07-28 21:40:08.828	\N
cmdnmt1bw000pwognnk73gosm	cmdnmt1bw000mwognwkclm5d6	2	Phase 3: Completion	Final delivery and reporting	1500000000	30	2025-09-26 21:40:08.821	{"Final report","Analytics provided"}	f	f	\N	\N	f	\N	2025-07-28 21:40:08.828	\N
cmdnmt1c6000xwogngqvj5ig3	cmdnmt1c6000wwognufxvnvbf	0	Single Milestone	Complete Solana test	2000000000	100	2025-08-12 21:40:08.834	{}	f	f	\N	\N	f	\N	2025-07-28 21:40:08.838	\N
cmdnmt1bw000nwogntscxydmz	cmdnmt1bw000mwognwkclm5d6	0	Phase 1: Setup	Initial setup and configuration	1500000000	30	2025-08-07 21:40:08.821	{"Setup complete","Initial content posted"}	f	f	\N	\N	f	\N	2025-07-28 21:40:09.077	PENDING
cmdq7zqlj0007woi0ch9rz5gk	cmdq7zql80005woi02q3snv13	0	Milestone 1	Complete payment upon deal completion	100000000	98.03	2025-08-29 17:08:45.799	\N	f	f	\N	\N	f	\N	2025-07-30 17:08:45.8	\N
cmdpe2dpx0005worfn22tdy5x	cmdpe2dpl0003worfdjvd82dq	0	Milestone 1	Complete payment upon deal completion	100000000	98.03	2025-08-29 03:11:00.597	\N	t	t	2025-07-30 04:07:47.224	2025-07-30 04:07:47.224	f	\N	2025-07-30 04:07:47.224	PENDING
cmdphmlyd0007wo1bg2q35nzn	cmdphmly10005wo1bcqquxu0r	0	Milestone 1	Complete payment upon deal completion	1000000000	98.03	2025-08-29 04:50:43.237	\N	t	t	2025-07-30 05:07:57.849	2025-07-30 05:07:57.849	f	\N	2025-07-30 05:07:57.85	PENDING
cmdpj1h8i0005wokvwqn7g1rl	cmdpj1h860003wokv9tv64des	0	Milestone 1	Complete payment upon deal completion	1000000000	98.03	2025-08-29 05:30:16.578	\N	t	t	2025-07-30 05:31:09.885	2025-07-30 05:31:09.885	f	\N	2025-07-30 05:31:09.886	PENDING
cmdpiidyk0007woyuxahotx3w	cmdpiidy80005woyuc9c9zsde	0	Milestone 1	Complete payment upon deal completion	100000000	98.03	2025-08-29 05:15:25.868	\N	t	t	2025-07-30 05:16:25.458	2025-07-30 05:16:25.458	f	\N	2025-07-30 05:16:25.459	PENDING
cmdpj7tes0007wod8hwfl2c2g	cmdpj7teg0005wod8ii17qs47	0	Milestone 1	Complete payment upon deal completion	100000000	98.03	2025-08-29 05:35:12.292	\N	t	t	2025-07-30 05:36:00.646	2025-07-30 05:36:00.646	f	\N	2025-07-30 05:36:00.647	PENDING
cmdpg9ivr0005wolwbootmqpb	cmdpg9ivc0003wolwn0jxk7sr	0	Milestone 1	Complete payment upon deal completion	100000000	98.03	2025-08-29 04:12:33.111	\N	f	t	\N	2025-07-30 05:27:56.554	f	\N	2025-07-30 05:27:56.555	PENDING
cmdq76i1j000uwod8j404hr6b	cmdq76i17000swod8gyby2ieo	0	Milestone 1	Complete payment upon deal completion	100000000	98.03	2025-08-29 16:46:01.686	\N	f	f	\N	\N	f	\N	2025-07-30 16:49:28.445	PENDING
cmdq7odo70009wou4kvcx7ubs	cmdq7odo20007wou4d4pwpv6v	0	Milestone 1	Complete payment upon deal completion	100000000	98.03	2025-08-29 16:59:55.83	\N	f	f	\N	\N	f	\N	2025-07-30 16:59:55.831	\N
cmdq8dzzw0009woaatsofybka	cmdq8dzzk0007woaaqgh3b4pb	0	Milestone 1	Complete payment upon deal completion	1000000000	98.03	2025-08-29 17:19:51.164	\N	f	f	\N	\N	f	\N	2025-07-30 17:56:01.674	PENDING
cmdqaklk30008wo6qcy6so6qm	cmdqakljs0006wo6q7mcolvy0	0	Milestone 1	Complete payment upon deal completion	100000000	98.03	2025-08-29 18:20:58.274	\N	f	f	\N	\N	f	\N	2025-07-30 18:21:24.462	PENDING
cmdqaqb70000ywo6qi0mgvjy2	cmdqaqb6o000wwo6q9rapz0ij	0	Milestone 1	Complete payment upon deal completion	1500000000	98.03	2025-08-29 18:25:24.78	\N	f	f	\N	\N	f	\N	2025-07-30 18:25:46.583	PENDING
cmdqazz0o001owo6qq6pq91ej	cmdqazz0e001mwo6q1tucc9h6	0	Milestone 1	Complete payment upon deal completion	500000000	98.03	2025-08-29 18:32:55.56	\N	f	f	\N	\N	f	\N	2025-07-30 18:33:21.796	PENDING
cmdqbqnzk0008wohku0253rr8	cmdqbqnz80006wohkuy9e0vbr	0	Milestone 1	Complete payment upon deal completion	1000000000	98.03	2025-08-29 18:53:40.975	\N	t	f	2025-07-30 19:31:14	\N	f	\N	2025-07-30 18:54:21.083	PENDING
cmdqhmup90004wog9uk25xgk7	cmdqhmup90003wog99jfy4i49	0	Full Payment	Complete payment upon deal completion	1000000	100	2025-08-29 21:38:40.749	\N	t	t	2025-07-30 21:49:47.116	2025-07-30 21:49:47.116	f	\N	2025-07-30 21:49:47.117	PENDING
cmdqjzk9q0004wobkux7vep7v	cmdqjzk9q0003wobksp7libjj	0	Full Payment	Complete payment upon deal completion	1.00	100	2025-08-29 22:44:26	{}	t	t	2025-07-30 23:31:26.279	2025-07-30 23:31:26.292	f	\N	2025-07-30 23:31:26.293	PENDING
\.


--
-- Data for Name: MilestoneSubmission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MilestoneSubmission" (id, "milestoneId", "kolAddress", description, "proofType", "proofUrl", "socialPlatform", metrics, status, feedback, "reviewedBy", "reviewedAt", "createdAt", "updatedAt") FROM stdin;
cmdnlp2d5001bwohrnf0y1v75	cmdnlp2cw0014wohra8zn499p	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	Milestone 1 completed successfully:\n- Twitter thread: https://twitter.com/example/thread/123\n- Instagram story: https://instagram.com/stories/example/456\n- Total engagement: 2,500+\n- Reach: 10,000+	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-28 21:09:03.929	2025-07-28 21:09:03.929
cmdnlp2nj001hwohr84hr0c0t	cmdnlp2cw0015wohrcvmg7zfe	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	Partial work only - ran out of time	LINK		\N	\N	DISPUTED	\N	\N	\N	2025-07-28 21:09:04.303	2025-07-28 21:09:04.32
cmdnmmqfb000lwopptihm2p6l	cmdnmmqf1000ewoppchi0qrq8	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	Milestone 1 completed successfully:\n- Twitter thread: https://twitter.com/example/thread/123\n- Instagram story: https://instagram.com/stories/example/456\n- Total engagement: 2,500+\n- Reach: 10,000+	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-28 21:35:14.759	2025-07-28 21:35:14.759
cmdnmmqr2000rwoppjurp2w7a	cmdnmmqf1000fwoppba7qznww	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	Partial work only - ran out of time	LINK		\N	\N	DISPUTED	\N	\N	\N	2025-07-28 21:35:15.182	2025-07-28 21:35:15.198
cmdnmqwug0022woppst9smbro	cmdnmqwo8001owoppygd88itw	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	Milestone completed successfully:\n- Setup completed on 7/29/2025\n- Initial content posted: https://twitter.com/example/status/123456\n- Community response: 500+ engagements\n- All conditions met	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-28 21:38:29.704	2025-07-28 21:38:29.704
cmdnmrajf0038wopphwf1neje	cmdnmrada002uwopphrvrjpp0	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	Milestone completed successfully:\n- Setup completed on 7/29/2025\n- Initial content posted: https://twitter.com/example/status/123456\n- Community response: 500+ engagements\n- All conditions met	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-28 21:38:47.452	2025-07-28 21:38:47.452
cmdnmt1ii0011wogn7tcs7qp6	cmdnmt1bw000nwogntscxydmz	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc	Milestone completed successfully:\n- Setup completed on 7/29/2025\n- Initial content posted: https://twitter.com/example/status/123456\n- Community response: 500+ engagements\n- All conditions met	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-28 21:40:09.067	2025-07-28 21:40:09.067
cmdpejoj6000kworfpafh7jvh	cmdpe2dpx0005worfn22tdy5x	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	sdfsadf	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 03:24:27.762	2025-07-30 03:24:27.762
cmdpgc4vg000iwolwf2j2ja4l	cmdpg9ivr0005wolwbootmqpb	0x567e21c4b29661c3c7fac79154fca5531aa923c0	23142314	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 04:14:34.924	2025-07-30 04:14:34.924
cmdphn73i000iwo1bumzta3uc	cmdphmlyd0007wo1bg2q35nzn	0x567e21c4b29661c3c7fac79154fca5531aa923c0	zxvsadfgasfasdf	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 04:51:10.638	2025-07-30 04:51:10.638
cmdpijjrp000iwoyu8tcunn5i	cmdpiidyk0007woyuxahotx3w	0x567e21c4b29661c3c7fac79154fca5531aa923c0	poroof	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 05:16:20.054	2025-07-30 05:16:20.054
cmdpj25qn000gwokvp2i1ulf0	cmdpj1h8i0005wokvwqn7g1rl	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	prof	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 05:30:48.336	2025-07-30 05:30:48.336
cmdpj8jp2000iwod85z8urqe9	cmdpj7tes0007wod8hwfl2c2g	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51	prof	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 05:35:46.359	2025-07-30 05:35:46.359
cmdq7axki0003wol2u7jiez9x	cmdq76i1j000uwod8j404hr6b	0x567e21c4b29661c3c7fac79154fca5531aa923c0	sdfg	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 16:49:28.435	2025-07-30 16:49:28.435
cmdq9oirj0001wov71t8x2tcl	cmdq8dzzw0009woaatsofybka	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	yay	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 17:56:01.664	2025-07-30 17:56:01.664
cmdqal5rg000kwo6qvez59wod	cmdqaklk30008wo6qcy6so6qm	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	prof	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 18:21:24.461	2025-07-30 18:21:24.461
cmdqaqs0c001awo6qr95uzmuf	cmdqaqb70000ywo6qi0mgvjy2	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	profa	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 18:25:46.572	2025-07-30 18:25:46.572
cmdqb0j950020wo6qzs6yjtk0	cmdqazz0o001owo6qq6pq91ej	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	wear	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 18:33:21.785	2025-07-30 18:33:21.785
cmdqbrixc000kwohkptrgno78	cmdqbqnzk0008wohku0253rr8	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13	asdfg	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 18:54:21.072	2025-07-30 18:54:21.072
cmdqhw20f0009woak9bat084g	cmdqhmup90004wog9uk25xgk7	0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa	reta	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 21:45:50.127	2025-07-30 21:45:50.127
cmdqk1bol000cwobkngkjym92	cmdqjzk9q0004wobkux7vep7v	0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa	profersor	LINK		\N	\N	PENDING	\N	\N	\N	2025-07-30 22:45:55.173	2025-07-30 22:45:55.173
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, "userId", type, title, message, data, read, "readAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Settings" (id, "adminAddresses", "adminPin", "maintenanceMode", announcement, "createdAt", "updatedAt", "dailyReport", "defaultCurrency", "disputeRaised", "emailNotifications", "escrowCompleted", "escrowCreated", "ipWhitelist", "maxEscrowAmount", "maxLoginAttempts", "minEscrowAmount", "platformFee", "platformName", "requireVerification", "sessionTimeout", "twoFactorRequired", "userId", "verificationRequired") FROM stdin;
\.


--
-- Data for Name: SyncLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SyncLog" (id, "chainId", "escrowId", operation, "blockNumber", "transactionHash", status, error, attempts, data, "createdAt", "processedAt") FROM stdin;
\.


--
-- Data for Name: SyncStatus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SyncStatus" (id, "chainId", "lastBlockNumber", "lastSyncedAt", status, error, "consecutiveErrors", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, address, nonce, "createdAt", "updatedAt", "lastLogin", name, email, avatar, bio, department, "lastActive", role, "chainType") FROM stdin;
cmdpffghy0000woacud0t7rlc	0xd1e1e96368246d6c9f907fa35587bfb82b66b22c	\N	2025-07-30 03:49:10.342	2025-07-30 03:49:10.342	\N	\N	\N	\N	\N	\N	2025-07-30 03:49:10.342	admin	evm
cmdpbok940001woflds0tndmn	0xabcdefabcdefabcdefabcdefabcdefabcdefabcd	\N	2025-07-30 02:04:16.648	2025-07-30 02:04:16.648	\N	\N	\N	\N	\N	\N	2025-07-30 02:04:16.648	kol	solana
cmdpao6u10001wocythv43hng	0x567e21c4b29661c3c7fac79154fca5531aa923c0		2025-07-30 01:35:59.641	2025-07-30 17:08:45.816	2025-07-30 17:08:45.816	\N	\N	\N	\N	\N	2025-07-30 01:35:59.641	admin	solana
cmdpj1h9b0009wokv7rzvl6z3	wnqsvkcrwd8tvnhxu8bv1qgxdynnvwpfok1buowph13	\N	2025-07-30 05:30:16.607	2025-07-30 17:08:45.82	2025-07-30 17:08:45.82	\N	\N	\N	\N	\N	2025-07-30 05:30:16.607	team	evm
cmdqhyjbf0000wo1snqkdpc1o	0x1ce8396337ac19a259cf3ab9ced83814700762f6		2025-07-30 21:47:45.867	2025-07-30 23:29:00.003	2025-07-30 23:28:59.985	\N	\N	\N	\N	\N	2025-07-30 21:47:45.867	admin	evm
cmdpb9ffi0000woyc349pgtg0	0x82a5e3f5dd5721a81816b82244d7ef28d2fa6a51		2025-07-30 01:52:30.558	2025-07-30 17:09:08.041	2025-07-30 17:09:08.041	\N	\N	\N	\N	\N	2025-07-30 01:52:30.558	team	solana
cmdq8dc650000woaab7h15t19	CKsVsDGnkwR9oNadUus2qXAm4jzAy4mW3xcFZ9L4e3du		2025-07-30 17:19:20.285	2025-07-30 18:53:41.002	2025-07-30 18:53:41.002	\N	\N	\N	\N	\N	2025-07-30 17:19:20.285	team	solana
cmdnkr3gs0001wox6jk8nv5ai	0x1234567890123456789012345678901234567890	460	2025-07-28 20:42:39.053	2025-07-28 20:42:39.053	\N	\N	\N	\N	\N	\N	2025-07-28 20:42:39.053	team	evm
cmdnkr3gu0002wox6t251dre3	0x2345678901234567890123456789012345678901	236941	2025-07-28 20:42:39.053	2025-07-28 20:42:39.053	\N	\N	\N	\N	\N	\N	2025-07-28 20:42:39.053	team	evm
cmdnkr3gz0003wox6bukm6l4b	0x3456789012345678901234567890123456789012	100766	2025-07-28 20:42:39.059	2025-07-28 20:42:39.059	\N	\N	\N	\N	\N	\N	2025-07-28 20:42:39.059	kol	evm
cmdnkr3gz0004wox6dm521jkx	0x4567890123456789012345678901234567890123	241436	2025-07-28 20:42:39.059	2025-07-28 20:42:39.059	\N	\N	\N	\N	\N	\N	2025-07-28 20:42:39.059	kol	evm
cmdnkr3h10005wox6o4567zl4	0x5678901234567890123456789012345678901234	282572	2025-07-28 20:42:39.059	2025-07-28 20:42:39.059	\N	\N	\N	\N	\N	\N	2025-07-28 20:42:39.059	kol	evm
cmdnkr3h40007wox6460i6ojd	0x7890123456789012345678901234567890123456	888718	2025-07-28 20:42:39.065	2025-07-28 20:42:39.065	\N	\N	\N	\N	\N	\N	2025-07-28 20:42:39.065	verifier	evm
cmdnkr3h40006wox6ma82p32u	0x6789012345678901234567890123456789012345	756288	2025-07-28 20:42:39.065	2025-07-28 20:42:39.065	\N	\N	\N	\N	\N	\N	2025-07-28 20:42:39.065	verifier	evm
cmdnmqwmn001dwopp07wxpsxm	0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266		2025-07-28 21:38:29.423	2025-07-28 21:40:08.758	2025-07-28 21:40:08.756	\N	\N	\N	\N	\N	2025-07-28 21:38:29.423	team	evm
cmdnlk3840012wopc4444yv3p	0x70997970c51812dc3a010c7d01b50e0d17dc79c8	0x833f3d55db18dd311378b419c6dfc646a4f9da7852c6ed571dee930d6b84f4c3	2025-07-28 21:05:11.763	2025-07-30 22:36:55.39	2025-07-30 22:36:55.389	Test Project Owner	test@example.com	\N	Testing the escrow platform	\N	2025-07-28 21:05:11.763	team	evm
cmdnmqwmu001gwoppv4cbbbr2	0x15d34aaf54267db7d7c367839aaf71a00a2c6a65		2025-07-28 21:38:29.431	2025-07-28 21:40:08.767	2025-07-28 21:40:08.764	\N	\N	\N	\N	\N	2025-07-28 21:38:29.431	team	evm
cmdq76i29000ywod8z6bb83br	cksvsdgnkwr9onaduus2qxam4jzay4mw3xcfz9l4e3du	\N	2025-07-30 16:46:01.714	2025-07-30 17:19:51.188	2025-07-30 17:19:51.188	\N	\N	\N	\N	\N	2025-07-30 16:46:01.714	team	evm
cmdnlkro9001jwopca4xw8ebw	0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc		2025-07-28 21:05:43.449	2025-07-28 21:40:08.824	2025-07-28 21:40:08.824	\N	\N	\N	\N	\N	2025-07-28 21:05:43.449	team	evm
cmdnlk3830011wopc7o9flz0v	0x90f79bf6eb2c4f870365e785982e1f101e93b906		2025-07-28 21:05:11.763	2025-07-28 21:40:08.826	2025-07-28 21:40:08.826	\N	\N	\N	\N	\N	2025-07-28 21:05:11.763	team	evm
cmdnmqwog001uwoppi4fsy8qb	Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB	\N	2025-07-28 21:38:29.488	2025-07-28 21:40:08.835	2025-07-28 21:40:08.835	\N	\N	\N	\N	\N	2025-07-28 21:38:29.488	team	solana
cmdpezmk00000woh3duldmng1	0xd1e1e96368246d8c91907fa35587bfb82b66b22c		2025-07-30 03:36:51.697	2025-07-30 16:53:14.952	2025-07-30 16:53:14.951	\N	\N	\N	\N	\N	2025-07-30 03:36:51.697	admin	solana
cmdnmqwoi001vwoppnsockpee	GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW	\N	2025-07-28 21:38:29.49	2025-07-28 21:40:08.837	2025-07-28 21:40:08.836	\N	\N	\N	\N	\N	2025-07-28 21:38:29.49	team	solana
cmdqhb9u1000hwoino4tgorxi	0x4b81b527f6a3166ceec898fa4c92b8a3fdcc11aa		2025-07-30 21:29:40.49	2025-07-30 22:45:40.973	2025-07-30 22:45:40.97	\N	\N	\N	\N	\N	2025-07-30 21:29:40.49	team	evm
cmdq7odnr0005wou4zti92lz3	wNqsvKCrwD8tvnHxu8bV1QgXdYNNVwpfoK1buowph13		2025-07-30 16:59:55.815	2025-07-30 18:54:15.057	2025-07-30 18:54:15.044	\N	\N	\N	\N	\N	2025-07-30 16:59:55.815	kol	solana
cmdq9p9730004wov7re3h2p7q	gXvyGi2hkTo6fTZbS1cE47LMmtoa9CkUY1Y241Bcmqz		2025-07-30 17:56:35.92	2025-07-30 18:54:34.049	2025-07-30 18:54:34.046	\N	\N	\N	\N	\N	2025-07-30 17:56:35.92	admin	solana
cmdnkr3go0000wox6cvi8fsg9	0x33742d3feede42eeb82e65a0155bd46b693a69f5		2025-07-28 20:42:39.049	2025-07-30 23:13:39.773	2025-07-30 23:13:39.77	\N	\N	\N	\N	\N	2025-07-28 20:42:39.049	admin	evm
cmdnmx8ns0000womhs3ucwe2d	0x25edb55571a963e0a4910fd59f44226ed7eb0c00		2025-07-28 21:43:24.953	2025-07-30 22:44:32.986	2025-07-30 22:44:32.985	\N	\N	\N	\N	\N	2025-07-28 21:43:24.953	team	evm
\.


--
-- Data for Name: Verification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Verification" (id, "escrowId", "milestoneId", "verifierId", "userAddress", action, signature, "transactionHash", comment, "createdAt") FROM stdin;
\.


--
-- Data for Name: Verifier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Verifier" (id, "escrowId", address, "addedAt", "isActive") FROM stdin;
cmdnlp2cw0017wohrmcwvo5v9	cmdnlp2cw0013wohry816hicu	0x90f79bf6eb2c4f870365e785982e1f101e93b906	2025-07-28 21:09:03.921	t
cmdnmmqf1000hwoppqllp43q8	cmdnmmqf1000dwoppg9r43w2q	0x90f79bf6eb2c4f870365e785982e1f101e93b906	2025-07-28 21:35:14.749	t
cmdnmqwo8001rwopp058i3hls	cmdnmqwo8001nwoppdsbb3vpr	0x90f79bf6eb2c4f870365e785982e1f101e93b906	2025-07-28 21:38:29.481	t
cmdnmrada002xwoppsmg9y3ar	cmdnmrada002twopph4ti72zb	0x90f79bf6eb2c4f870365e785982e1f101e93b906	2025-07-28 21:38:47.23	t
cmdnmt1bw000qwognpunguqa0	cmdnmt1bw000mwognwkclm5d6	0x90f79bf6eb2c4f870365e785982e1f101e93b906	2025-07-28 21:40:08.828	t
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
09b6c5db-d94a-4ea2-84f0-152b67a8142c	5b05b839875627975b82bcc195dd060031ea1cfa1c8018dc6b67ea3b09cdf56f	2025-07-28 21:26:45.919949+03	20250725104432_init	\N	\N	2025-07-28 21:26:45.909401+03	1
57f9506e-a1ee-41e4-81d1-3c3c13ca5236	66204d22c2a7702f87c22d5b9dafc7091a2a723dcd2707bc617db80d1554e325	2025-07-28 21:26:45.925382+03	20250728_add_notifications	\N	\N	2025-07-28 21:26:45.920913+03	1
b2d9775f-fd2f-49d2-8aba-4305a3b9ece8	95edfb90292f4ede02d5e5580890bd7621f6fc95c9abae8211e99933ed7cacbd	2025-07-28 21:26:45.933314+03	20250728_add_submission_status	\N	\N	2025-07-28 21:26:45.926378+03	1
b79f64b5-36e6-4f57-a9bb-4c7408ca8e57	a39ad44017428b137a753956190397a940eaff8cabaf15177fe0e5c9ad9ef034	\N	20250729_add_multi_chain_support	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250729_add_multi_chain_support\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "chainEscrowId" of relation "Escrow" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"chainEscrowId\\" of relation \\"Escrow\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7478), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250729_add_multi_chain_support"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20250729_add_multi_chain_support"\n             at schema-engine/commands/src/commands/apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:236	2025-07-30 06:45:47.139906+03	2025-07-30 04:30:37.72543+03	0
933849a8-1e55-4c6b-90a7-08c4c43393a5	a39ad44017428b137a753956190397a940eaff8cabaf15177fe0e5c9ad9ef034	2025-07-30 06:45:47.150763+03	20250729_add_multi_chain_support		\N	2025-07-30 06:45:47.150763+03	0
\.


--
-- Name: Activity Activity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id);


--
-- Name: ChainConfig ChainConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChainConfig"
    ADD CONSTRAINT "ChainConfig_pkey" PRIMARY KEY (id);


--
-- Name: ChainHealth ChainHealth_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChainHealth"
    ADD CONSTRAINT "ChainHealth_pkey" PRIMARY KEY (id);


--
-- Name: Dispute Dispute_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Dispute"
    ADD CONSTRAINT "Dispute_pkey" PRIMARY KEY (id);


--
-- Name: Escrow Escrow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Escrow"
    ADD CONSTRAINT "Escrow_pkey" PRIMARY KEY (id);


--
-- Name: MilestoneSubmission MilestoneSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MilestoneSubmission"
    ADD CONSTRAINT "MilestoneSubmission_pkey" PRIMARY KEY (id);


--
-- Name: Milestone Milestone_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Milestone"
    ADD CONSTRAINT "Milestone_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Settings Settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Settings"
    ADD CONSTRAINT "Settings_pkey" PRIMARY KEY (id);


--
-- Name: SyncLog SyncLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SyncLog"
    ADD CONSTRAINT "SyncLog_pkey" PRIMARY KEY (id);


--
-- Name: SyncStatus SyncStatus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SyncStatus"
    ADD CONSTRAINT "SyncStatus_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Verification Verification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_pkey" PRIMARY KEY (id);


--
-- Name: Verifier Verifier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verifier"
    ADD CONSTRAINT "Verifier_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Activity_chainId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Activity_chainId_idx" ON public."Activity" USING btree ("chainId");


--
-- Name: Activity_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Activity_createdAt_idx" ON public."Activity" USING btree ("createdAt");


--
-- Name: Activity_escrowId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Activity_escrowId_idx" ON public."Activity" USING btree ("escrowId");


--
-- Name: Activity_userAddress_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Activity_userAddress_idx" ON public."Activity" USING btree ("userAddress");


--
-- Name: ChainConfig_chainId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ChainConfig_chainId_key" ON public."ChainConfig" USING btree ("chainId");


--
-- Name: ChainConfig_chainType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChainConfig_chainType_idx" ON public."ChainConfig" USING btree ("chainType");


--
-- Name: ChainConfig_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChainConfig_isActive_idx" ON public."ChainConfig" USING btree ("isActive");


--
-- Name: ChainHealth_chainId_checkedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChainHealth_chainId_checkedAt_idx" ON public."ChainHealth" USING btree ("chainId", "checkedAt");


--
-- Name: Dispute_escrowId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Dispute_escrowId_idx" ON public."Dispute" USING btree ("escrowId");


--
-- Name: Dispute_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Dispute_status_idx" ON public."Dispute" USING btree (status);


--
-- Name: Escrow_chainId_chainEscrowId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Escrow_chainId_chainEscrowId_key" ON public."Escrow" USING btree ("chainId", "chainEscrowId");


--
-- Name: Escrow_chainId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_chainId_idx" ON public."Escrow" USING btree ("chainId");


--
-- Name: Escrow_chainId_kolAddress_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_chainId_kolAddress_idx" ON public."Escrow" USING btree ("chainId", "kolAddress");


--
-- Name: Escrow_chainId_projectAddress_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_chainId_projectAddress_idx" ON public."Escrow" USING btree ("chainId", "projectAddress");


--
-- Name: Escrow_chainId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_chainId_status_idx" ON public."Escrow" USING btree ("chainId", status);


--
-- Name: Escrow_chain_address_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_chain_address_idx" ON public."Escrow" USING btree (chain, "contractAddress");


--
-- Name: Escrow_chain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_chain_idx" ON public."Escrow" USING btree (chain);


--
-- Name: Escrow_kolAddress_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_kolAddress_idx" ON public."Escrow" USING btree ("kolAddress");


--
-- Name: Escrow_lastSyncedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_lastSyncedAt_idx" ON public."Escrow" USING btree ("lastSyncedAt");


--
-- Name: Escrow_projectAddress_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_projectAddress_idx" ON public."Escrow" USING btree ("projectAddress");


--
-- Name: Escrow_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Escrow_status_idx" ON public."Escrow" USING btree (status);


--
-- Name: MilestoneSubmission_kolAddress_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MilestoneSubmission_kolAddress_idx" ON public."MilestoneSubmission" USING btree ("kolAddress");


--
-- Name: MilestoneSubmission_milestoneId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MilestoneSubmission_milestoneId_idx" ON public."MilestoneSubmission" USING btree ("milestoneId");


--
-- Name: MilestoneSubmission_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MilestoneSubmission_status_idx" ON public."MilestoneSubmission" USING btree (status);


--
-- Name: Milestone_escrowId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Milestone_escrowId_idx" ON public."Milestone" USING btree ("escrowId");


--
-- Name: Milestone_escrowId_milestoneIndex_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Milestone_escrowId_milestoneIndex_key" ON public."Milestone" USING btree ("escrowId", "milestoneIndex");


--
-- Name: Milestone_released_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Milestone_released_idx" ON public."Milestone" USING btree (released);


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree ("createdAt");


--
-- Name: Notification_read_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_read_idx" ON public."Notification" USING btree (read);


--
-- Name: Notification_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_type_idx" ON public."Notification" USING btree (type);


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree ("userId");


--
-- Name: Settings_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Settings_userId_key" ON public."Settings" USING btree ("userId");


--
-- Name: SyncLog_chainId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SyncLog_chainId_idx" ON public."SyncLog" USING btree ("chainId");


--
-- Name: SyncLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SyncLog_createdAt_idx" ON public."SyncLog" USING btree ("createdAt");


--
-- Name: SyncLog_escrowId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SyncLog_escrowId_idx" ON public."SyncLog" USING btree ("escrowId");


--
-- Name: SyncLog_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SyncLog_status_idx" ON public."SyncLog" USING btree (status);


--
-- Name: SyncLog_transactionHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SyncLog_transactionHash_idx" ON public."SyncLog" USING btree ("transactionHash");


--
-- Name: SyncStatus_chainId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SyncStatus_chainId_key" ON public."SyncStatus" USING btree ("chainId");


--
-- Name: SyncStatus_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SyncStatus_status_idx" ON public."SyncStatus" USING btree (status);


--
-- Name: User_address_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_address_idx" ON public."User" USING btree (address);


--
-- Name: User_address_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_address_key" ON public."User" USING btree (address);


--
-- Name: User_chainType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_chainType_idx" ON public."User" USING btree ("chainType");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: Verification_escrowId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verification_escrowId_idx" ON public."Verification" USING btree ("escrowId");


--
-- Name: Verification_milestoneId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verification_milestoneId_idx" ON public."Verification" USING btree ("milestoneId");


--
-- Name: Verification_userAddress_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verification_userAddress_idx" ON public."Verification" USING btree ("userAddress");


--
-- Name: Verifier_address_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verifier_address_idx" ON public."Verifier" USING btree (address);


--
-- Name: Verifier_escrowId_address_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Verifier_escrowId_address_key" ON public."Verifier" USING btree ("escrowId", address);


--
-- Name: Verifier_escrowId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Verifier_escrowId_idx" ON public."Verifier" USING btree ("escrowId");


--
-- Name: Activity Activity_escrowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES public."Escrow"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Activity Activity_userAddress_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES public."User"(address) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Dispute Dispute_escrowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Dispute"
    ADD CONSTRAINT "Dispute_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES public."Escrow"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Escrow Escrow_kolAddress_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Escrow"
    ADD CONSTRAINT "Escrow_kolAddress_fkey" FOREIGN KEY ("kolAddress") REFERENCES public."User"(address) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Escrow Escrow_projectAddress_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Escrow"
    ADD CONSTRAINT "Escrow_projectAddress_fkey" FOREIGN KEY ("projectAddress") REFERENCES public."User"(address) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MilestoneSubmission MilestoneSubmission_milestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MilestoneSubmission"
    ADD CONSTRAINT "MilestoneSubmission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES public."Milestone"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Milestone Milestone_escrowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Milestone"
    ADD CONSTRAINT "Milestone_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES public."Escrow"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Settings Settings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Settings"
    ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SyncLog SyncLog_escrowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SyncLog"
    ADD CONSTRAINT "SyncLog_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES public."Escrow"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SyncStatus SyncStatus_chainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SyncStatus"
    ADD CONSTRAINT "SyncStatus_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES public."ChainConfig"("chainId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Verification Verification_escrowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES public."Escrow"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Verification Verification_milestoneId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES public."Milestone"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Verification Verification_userAddress_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES public."User"(address) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Verification Verification_verifierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES public."Verifier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Verifier Verifier_escrowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Verifier"
    ADD CONSTRAINT "Verifier_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES public."Escrow"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


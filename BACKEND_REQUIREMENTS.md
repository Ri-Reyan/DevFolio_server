<div align="center">

# 📋 DevFolio — Backend Requirements

**What the backend must do, who can do it, and in what order we build it**

![Doc](https://img.shields.io/badge/doc-requirements-1b8a76?style=for-the-badge)
![Scope](https://img.shields.io/badge/scope-Phase%201%20MVP-0d3b36?style=for-the-badge)
![Audience](https://img.shields.io/badge/audience-developers%20%2B%20QA-blue?style=for-the-badge)

</div>

> **Reading guide:** This document defines _behaviour and rules_ only. It contains no database schemas, ORM code, request/response payloads or infrastructure design. Those live in `BACKEND_SPEC.md`.
> Every business rule has an ID (e.g. `AUTH-04`) so it can be referenced in tickets, PRs and test cases.
> Numeric limits marked ⚙️ are **defaults** and must be configurable without a code change.

---

## 📑 Contents

1. [Product Scope & Functional Goals](#1-product-scope--functional-goals)
2. [User Roles, Permissions & Access Hierarchy](#2-user-roles-permissions--access-hierarchy)
3. [Core Business Logic & Feature Requirements](#3-core-business-logic--feature-requirements)
4. [Feature & API Capability Checklist](#4-feature--api-capability-checklist)
5. [Backend Implementation Roadmap](#5-backend-implementation-roadmap)
6. [Open Decisions](#6-open-decisions)

---

## 1. Product Scope & Functional Goals

### 1.1 What the backend is for

DevFolio helps a job seeker **prove** their skills instead of just claiming them. The backend powers two tracks that share one account:

| Track                  | What the user gets                                                                   | Core promise                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 🧾 **Resume Track**    | A resume built from the user's real GitHub projects and measured website performance | AI never invents facts. Every bullet is traceable to repo data, a performance score, or the user's own profile |
| 🎤 **Interview Track** | A text-based mock interview on one technology, ending with an expertise percentage   | The score comes only from the candidate's own answers, using a fixed rubric                                    |

### 1.2 Functional goals (Phase 1 / MVP)

| #   | Goal                                                       | Success looks like                                                    |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| G1  | Let people sign up safely and sign in with email or GitHub | Verified account in under 2 minutes                                   |
| G2  | Collect a complete profile once, reuse it everywhere       | Onboarding saved step-by-step; nothing lost if the user leaves midway |
| G3  | Turn two GitHub projects into a proof-based resume         | Resume ready with live progress; every bullet has evidence            |
| G4  | Tailor a resume to a job description                       | Match score and gap report returned with the resume                   |
| G5  | Run a 10-question interview and score it fairly            | Percentage + per-question feedback after the last answer              |
| G6  | Show everything in one dashboard                           | Past resumes, past interviews, remaining daily quota                  |
| G7  | Keep users' data private and the platform abuse-resistant  | Strict ownership checks, rate limits, URL safety checks               |

### 1.3 Out of scope for Phase 1

Voice or avatar interviews · coding-problem module · cross-domain "overall" interview · DOCX export · cover letters · more than 2 projects per resume · payments/subscriptions · public shareable resume page. (See [§5](#5-backend-implementation-roadmap) for when each arrives.)

### 1.4 Guiding principles

1. **No fabrication.** AI output is only accepted if it can be traced to real source data.
2. **Ownership first.** A user can only ever see or change their own data.
3. **Slow work runs in the background.** Anything that can take more than a few seconds (scraping, performance tests, AI generation, answer scoring) must not block a request. The user sees live progress instead.
4. **Fail visibly, never silently.** Every failure gives the user a clear reason and a next step.
5. **Safe by default.** Untrusted input (URLs, JD text, interview answers) is never trusted.

---

## 2. User Roles, Permissions & Access Hierarchy

### 2.1 Roles

| Role                     | Who                                                | How the role is obtained                                         |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------------------------- |
| 👤 **Guest**             | Anyone not signed in                               | Default                                                          |
| 🙋 **User (unverified)** | Registered with email, OTP not yet confirmed       | Self-registration                                                |
| ✅ **User (verified)**   | Confirmed email, or signed in through GitHub       | OTP confirmation or GitHub sign-in                               |
| 🛡️ **Admin**             | Platform team member who manages interview content | **Never self-registered.** See [§3.1.1](#311-registration-paths) |

### 2.2 Access hierarchy

```
Admin            ── Only Admin Panel
  └─ User (verified)  ── use both tracks, manage own profile and own data
       └─ User (unverified) ── verify email, resend OTP, nothing else
            └─ Guest        ── register, log in, reset password, health check
```

> Higher roles inherit lower-role abilities **for their own account**. Admin status never grants access to another user's personal content (see §2.4).

### 2.3 Permission matrix

| Capability                                        | Guest | User (unverified) | User (verified) | Admin |
| ------------------------------------------------- | :---: | :---------------: | :-------------: | :---: |
| Register / log in / reset password                |  ✅   |        ✅         |       ✅        |  ✅   |
| Verify email (OTP)                                |   —   |        ✅         |        —        |   —   |
| View / edit own profile                           |  ❌   |        ❌         |       ✅        |  ✅   |
| Connect GitHub, sync repos                        |  ❌   |        ❌         |       ✅        |  ❌   |
| Create resume job (needs completed profile)       |  ❌   |        ❌         |       ✅        |  ❌   |
| View / edit / export / delete own resume versions |  ❌   |        ❌         |       ✅        |  ❌   |
| Start interview (needs completed profile)         |  ❌   |        ❌         |       ✅        |  ❌   |
| View own interview history and reports            |  ❌   |        ❌         |       ✅        |  ❌   |
| View own dashboard                                |  ❌   |        ❌         |       ✅        |  ✅   |
| Create / edit / deactivate interview questions    |  ❌   |        ❌         |       ❌        |  ✅   |
| List all questions (including answer key)         |  ❌   |        ❌         |       ❌        |  ✅   |
| Suspend / reactivate accounts _(proposed, §6)_    |  ❌   |        ❌         |       ❌        |  ✅   |
| Promote / demote admins _(proposed, §6)_          |  ❌   |        ❌         |       ❌        |  ✅   |

### 2.4 Who can act on whom

| Actor                       | May act on                                                                      | May **not** act on                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| User                        | Only their own profile, repos, resume jobs/versions, interview sessions/answers | Any other user's data. A request for someone else's resource behaves as "not found" (the API never confirms it exists) |
| Admin                       | Question bank; account status _(proposed)_                                      | A user's resumes, answers or profile content (privacy by default)                                                      |
| System (background workers) | Only the data belonging to the job it is processing                             | Data of other users                                                                                                    |

### 2.5 Account states

| State                    | Can sign in?                       | What they can do                      |
| ------------------------ | ---------------------------------- | ------------------------------------- |
| **Pending verification** | Only after OTP is confirmed        | Confirm OTP, request a new OTP        |
| **Active**               | Yes                                | Full access for their role            |
| **Suspended**            | No (existing sessions are revoked) | Nothing. Clear message shown on login |

---

## 3. Core Business Logic & Feature Requirements

### 3.1 Account Lifecycle & Authentication

#### 3.1.1 Registration paths

| Path                                     | Who uses it                  | Result                                                                                                                                 |
| ---------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Self-registration (email + password)** | Anyone                       | Account created as _Pending verification_; OTP emailed                                                                                 |
| **GitHub sign-in / sign-up**             | Anyone with a GitHub account | Account created as _Active_ immediately; email taken from GitHub's verified primary email                                              |
| **Admin creation**                       | Platform team only           | **No public endpoint.** First admin is created by a secure server-side setup step; later admins only by an existing admin _(proposed)_ |

#### 3.1.2 Registration & OTP rules

| ID        | Rule                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTH-01` | Email is normalised (trimmed, lower-case) before any check. One email = one account                                                                                            |
| `AUTH-02` | Passwords: 8–128 characters, at least one letter and one digit. Stored only as a strong one-way hash, never reversible, never logged                                           |
| `AUTH-03` | Terms of service must be accepted at registration                                                                                                                              |
| `AUTH-04` | A 6-digit OTP is emailed on registration. ⚙️ Valid **10 minutes**, **5 wrong attempts** then the code is dead and a new one is needed                                          |
| `AUTH-05` | ⚙️ Resend cooldown **60 seconds**; maximum **5 OTPs per hour** per email                                                                                                       |
| `AUTH-06` | Resending OTP must **not reveal** whether an email is registered (same response either way)                                                                                    |
| `AUTH-07` | Registering with an email that already has a **verified** account → clear "already registered" error. With an **unverified** account → a fresh OTP is sent instead of an error |
| `AUTH-08` | Successful OTP confirmation activates the account **and signs the user in** (no second login step)                                                                             |
| `AUTH-09` | Unverified users trying to log in are blocked and automatically sent a new OTP                                                                                                 |

#### 3.1.3 Sessions & tokens

| ID        | Rule                                                                                                                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH-10` | Sign-in gives a short-lived access token ⚙️ **15 min** and a long-lived refresh credential ⚙️ **7 days** kept in a secure, browser-inaccessible cookie                                                                                             |
| `AUTH-11` | **Refresh rotation:** every refresh issues a _new_ refresh credential and retires the old one. If a retired credential is ever used again, that is treated as theft → **all sessions from that login are revoked** and the user must sign in again |
| `AUTH-12` | Logout ends the current session. "Log out everywhere" ends all sessions for the account                                                                                                                                                            |
| `AUTH-13` | ⚙️ **5 failed logins** lock the account for **15 minutes**. Wrong-email and wrong-password return the **same** error (no account enumeration)                                                                                                      |
| `AUTH-14` | Suspending an account revokes all its sessions immediately                                                                                                                                                                                         |

#### 3.1.4 Password reset & change

| ID        | Rule                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------- |
| `AUTH-15` | "Forgot password" always answers the same way whether or not the email exists                   |
| `AUTH-16` | Reset link is single-use, ⚙️ valid **30 minutes**; max ⚙️ **3 requests per hour** per email     |
| `AUTH-17` | A successful reset revokes **all** existing sessions and sends a "password changed" email       |
| `AUTH-18` | Changing a password while signed in requires the current password and ends all _other_ sessions |
| `AUTH-19` | A GitHub-only account (no password) can add a password through the reset flow                   |

#### 3.1.5 GitHub OAuth rules

| ID         | Rule                                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OAUTH-01` | Ask GitHub for the **minimum permission** (public profile + email only). Private-repo access is a later, opt-in feature                                                                                |
| `OAUTH-02` | Every OAuth attempt is tied to a one-time, short-lived (10 min) security token; mismatched or reused tokens are rejected                                                                               |
| `OAUTH-03` | Two intents exist: **Login** (sign in / sign up) and **Connect** (attach GitHub to the already signed-in account)                                                                                      |
| `OAUTH-04` | If GitHub's verified email matches an existing **verified** account, the GitHub identity is linked to it. If it matches an **unverified** account, linking is refused (prevents account pre-hijacking) |
| `OAUTH-05` | One GitHub identity can belong to **one** account only. Connecting an identity already used elsewhere → conflict error                                                                                 |
| `OAUTH-06` | GitHub access tokens are stored encrypted and are never returned to the client or written to logs                                                                                                      |
| `OAUTH-07` | After OAuth the user is redirected back to the app **without tokens in the URL**; the app then obtains its session through the normal refresh step                                                     |
| `OAUTH-08` | After a successful Login or Connect, a repository sync starts automatically                                                                                                                            |

---

### 3.2 Profile & Onboarding

| ID        | Rule                                                                                                                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROF-01` | Onboarding has **4 steps** plus an expertise choice: ① Basics (full name, age 13–100, gender, country) ② Education (1–5 entries) ③ Experience (0–10 entries, **skippable**) ④ Skills (1–30) and Languages (1–8) ⑤ Expertise technology |
| `PROF-02` | Each step saves independently as a draft. Leaving midway loses nothing; the user resumes at the last unlocked step                                                                                                                     |
| `PROF-03` | A step replaces its previous data as a whole (editing = resubmitting that step)                                                                                                                                                        |
| `PROF-04` | Onboarding is **complete** only when steps ①, ②, ④ and the expertise choice are done. Step ③ may be skipped                                                                                                                            |
| `PROF-05` | Resume and interview features are **locked** until onboarding is complete (clear "finish your profile" message)                                                                                                                        |
| `PROF-06` | Expertise technology must be one of the **active** technologies offered by the platform                                                                                                                                                |
| `PROF-07` | Avatar: JPG/PNG/WEBP, max 2 MB. The previous avatar is deleted when replaced                                                                                                                                                           |

---

### 3.3 GitHub Repository Sync

| ID      | Rule                                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GH-01` | Sync fetches the user's **public** repositories and keeps a local copy of the basic details (name, description, language, topics, last push, link) |
| `GH-02` | Sync runs in the background; the user sees `QUEUED → RUNNING → DONE/FAILED`                                                                        |
| `GH-03` | ⚙️ A manual re-sync is allowed **once every 60 seconds**                                                                                           |
| `GH-04` | Repos deleted or made private on GitHub disappear from the list at the next sync                                                                   |
| `GH-05` | If GitHub's rate limit is hit, the sync waits until GitHub says it can continue (up to 3 attempts), then reports a clear failure                   |
| `GH-06` | Listing repos is served from the saved copy (fast), with search and sorting by recent activity                                                     |

---

### 3.4 Resume Track

#### 3.4.1 Creating a resume job

| ID       | Rule                                                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RES-01` | Preconditions: verified email, completed profile, GitHub connected, repos synced                                                                                 |
| `RES-02` | The user chooses a mode: **Generic** (best-practice resume) or **JD-tailored** (needs a job description of ⚙️ 50–10,000 characters; title and company optional)  |
| `RES-03` | The user selects **exactly 2** distinct projects they own, each with a **live URL** (http/https only)                                                            |
| `RES-04` | A user can have **only one active resume job** at a time (queued or running). A second request returns a conflict that points at the active job                  |
| `RES-05` | ⚙️ Daily quota: **1 resume jobs per rolling 24 h** per user                                                                                                      |
| `RES-06` | Repeating the _same_ request with the same idempotency key returns the original job instead of creating a duplicate (protects against double-clicks and retries) |

#### 3.4.2 The pipeline (what happens after the user submits)

```
                ┌─▶ A. Read the project (README, structure, key files) ─┐
 Submit ─▶ QUEUED                                                        ├─▶ C. Understand JD ─▶ D. Write resume ─▶ E. Verify ─▶ DONE
                └─▶ B. Test each live URL (performance, accessibility,  ─┘     (JD mode only)
                       best-practices, SEO)
```

| Stage                   | What must happen                                                                                      | If it goes wrong                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **A. Project analysis** | Read README, folder structure and important files of both repos; build searchable knowledge from them | Repo deleted/private → job fails with `REPO_UNAVAILABLE`. Repo too empty to describe → fails with `INSUFFICIENT_REPO_DATA`          |
| **B. Performance test** | Run a website audit on each live URL                                                                  | URL down, too slow, or blocked → **that test is skipped, the user is told, and the resume is still produced** without those numbers |
| **C. JD analysis**      | Extract requirements, mark each _must-have_ or _nice-to-have_, match them to the project knowledge    | JD unusable → fall back to a clear error asking the user to edit the JD                                                             |
| **D. Resume writing**   | AI writes structured resume content using **only** profile data, project knowledge and test results   | AI temporarily down → retry automatically (3 attempts), then fail with `AI_UNAVAILABLE`                                             |
| **E. Verification**     | Check every bullet against the sources (see `RES-10`)                                                 | Unverifiable bullets are removed; too few left → job fails with a clear reason                                                      |

A and B run **in parallel**. Progress (0–100 %) and per-stage status are visible live.

#### 3.4.3 Resume rules

| ID       | Rule                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RES-07` | **Live URL safety:** only http/https; localhost, private/internal network addresses and cloud-metadata addresses are rejected, **including after redirects**. The audit runs in an isolated environment                                                                              |
| `RES-08` | **Cancel window:** a job can be cancelled until the _writing_ stage starts. After that it cannot be cancelled (AI cost already incurred)                                                                                                                                             |
| `RES-09` | Failed GitHub or AI calls retry automatically with increasing wait times; users are never asked to retry manually for transient errors                                                                                                                                               |
| `RES-10` | **No-fabrication check:** every bullet must point to its evidence (a piece of project content, a test result, or a profile field). Any number in a bullet (scores, counts) must match the source **exactly**. Performance numbers always come from the test data, never from AI text |
| `RES-11` | Each finished job creates a **resume version** with a per-user serial number (v1, v2, …)                                                                                                                                                                                             |
| `RES-12` | **JD mode** also returns a **match score (0–100)** and a **gap report**. Score = weighted share of met requirements, must-haves count double                                                                                                                                         |
| `RES-13` | Users review AI bullets: **accept**, **reject** or **edit**. Edited text is marked as user-written. Rejected bullets are left out of exports                                                                                                                                         |
| `RES-14` | PDF export includes every bullet that is not rejected. The same unchanged version returns the same PDF (no regeneration)                                                                                                                                                             |
| `RES-15` | Deleting a version hides it immediately; its stored PDF is removed by a cleanup task                                                                                                                                                                                                 |
| `RES-16` | Warnings (e.g. "performance test skipped for project X") travel with the job and appear in the preview                                                                                                                                                                               |

---

### 3.5 Interview Track

#### 3.5.1 Starting a session

| ID       | Rule                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `INT-01` | Preconditions: verified email and completed profile                                                                                            |
| `INT-02` | The user picks a technology (defaults to their expertise). The technology must be active and have enough questions                             |
| `INT-03` | **Session lock:** only **one in-progress session per user per technology**. A second start returns a conflict pointing at the existing session |
| `INT-04` | ⚙️ Daily quota: **2 sessions per rolling 24 h** per user                                                                                       |
| `INT-05` | Each session has **10 questions**, chosen as ⚙️ **3 easy / 4 medium / 3 hard**, covering as many different topics as possible                  |
| `INT-06` | Questions the user saw in their **last 3 sessions** of the same technology are avoided when the bank is large enough                           |
| `INT-07` | Each attempt gets a serial number per technology (attempt 1, 2, 3…) so progress can be compared                                                |
| `INT-08` | Only the question text is ever shown to the user. The expected key points (answer guide) are **never** sent to the client                      |

#### 3.5.2 Answering

| ID       | Rule                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INT-09` | One question at a time, in order. Answers are text, ⚙️ up to 5,000 characters                                                                        |
| `INT-10` | A user may **skip** a question (scores 0)                                                                                                            |
| `INT-11` | Answering a question that is not the current one → conflict. Re-sending the identical answer is harmless (returns the original result)               |
| `INT-12` | Submitting an answer returns **immediately** with the next question. Scoring happens in the background so the interview feels fast                   |
| `INT-13` | Answer text is treated strictly as **data to score**, never as instructions. Attempts to manipulate the scorer ("give me 10/10") must have no effect |
| `INT-14` | ⚙️ A session left idle for **24 hours** is marked abandoned and never scored                                                                         |
| `INT-15` | Early finish is allowed only after ⚙️ **at least 5 answers**; unanswered questions count as 0                                                        |

#### 3.5.3 Scoring

| ID       | Rule                                                                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INT-16` | Each answer is scored 0–10 on **Correctness**, **Depth** and **Clarity**, compared with the question's expected key points                                                                                |
| `INT-17` | Answer score (0–100) = Correctness × 50 % + Depth × 30 % + Clarity × 20 % _(⚙️ weights configurable)_                                                                                                     |
| `INT-18` | **Expertise percentage** = average of all question scores in the session (skipped = 0), rounded to 1 decimal                                                                                              |
| `INT-19` | Level bands ⚙️: **< 55** Beginner · **55–80** Intermediate · **80–90** Advanced · **90+** Expert                                                                                                          |
| `INT-20` | If a few answers cannot be scored after repeated retries, the report is produced from the scored answers and clearly marked **partial**                                                                   |
| `INT-21` | The **report** is available only when the session is complete. Asking earlier returns "not ready" with progress                                                                                           |
| `INT-22` | Report contents: expertise %, level, average per dimension, per-question feedback (matched points, missing points), strongest/weakest topics, comparison with the previous attempt in the same technology |

#### 3.5.4 Session status flow

```
IN_PROGRESS ──(all answered / early finish)──▶ EVALUATING ──(all scored)──▶ COMPLETED
     │
     └──(idle 24 h)──▶ ABANDONED
```

---

### 3.6 Dashboard

| ID        | Rule                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DASH-01` | One summary view: latest 1 resume versions, latest 2 interview sessions, best expertise % per technology, any active resume job or interview session, and remaining daily quota |
| `DASH-02` | The summary updates within ~1 minute of any change                                                                                                                              |

---

### 3.7 Interview Content Management (Admin)

| ID       | Rule                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADM-01` | Admins create, edit, deactivate and list questions per technology with topic, difficulty and 2–8 expected key points                         |
| `ADM-02` | Deactivated questions are never used in new sessions but remain in the history of past sessions                                              |
| `ADM-03` | A technology is offered to users only when it has enough active questions (⚙️ at least 10 per technology, with a spread across difficulties) |
| `ADM-04` | After question content changes, the searchable index must be refreshed (an admin-triggered re-index is available)                            |

---

### 3.8 Platform-wide Rules

| ID        | Rule                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PLAT-01` | **Rate limiting** on all endpoints; much stricter on login, OTP, password reset and anything that triggers AI work. Exceeded limits tell the user how long to wait |
| `PLAT-02` | **Consistent responses:** every success and every error follows one standard shape; every response carries a request ID for support                                |
| `PLAT-03` | **Validation:** every input is validated before any work happens; errors list which fields are wrong                                                               |
| `PLAT-04` | **Privacy:** no passwords, tokens, OTPs or answer text in logs. Users can delete their resume versions at any time                                                 |
| `PLAT-05` | **Long lists** are paginated; no endpoint returns unbounded data                                                                                                   |
| `PLAT-06` | **Live progress** for resume jobs is available by streaming; plain polling must also work as a fallback                                                            |
| `PLAT-07` | A health check endpoint reports whether the service and its dependencies are up                                                                                    |

### 3.9 Notifications (Email)

| Event                                        | Recipient | When                                         |
| -------------------------------------------- | --------- | -------------------------------------------- |
| Verification code (OTP)                      | New user  | Registration, resend, login while unverified |
| Welcome                                      | New user  | After first verification / GitHub sign-up    |
| Password reset link                          | User      | Forgot password                              |
| Password changed                             | User      | After reset or change                        |
| Resume ready                                 | User      | Resume job completed                         |
| Resume failed                                | User      | Resume job failed (with reason)              |
| Interview report ready                       | User      | Session completed and scored                 |
| Account suspended / reactivated _(proposed)_ | User      | Admin action                                 |

Email delivery failures retry automatically and never block the main action.

---

## 4. Feature & API Capability Checklist

> Roles: **Public** = no sign-in · **User** = verified user · **User\*** = unverified user allowed · **Admin** = admin only.
> All routes are under `/api/v1`. ☐ = to build. _Payloads are intentionally not listed here._

### 4.1 Authentication

|  ☐  | Method | Route                    | Description                                 | Allowed roles                    | Phase |
| :-: | ------ | ------------------------ | ------------------------------------------- | -------------------------------- | :---: |
|  ☐  | POST   | `/auth/register`         | Create account, send OTP                    | Public                           |   1   |
|  ☐  | POST   | `/auth/verify-otp`       | Confirm email, activate, sign in            | Public (User\*)                  |   1   |
|  ☐  | POST   | `/auth/resend-otp`       | Send a new OTP (cooldown applies)           | Public (User\*)                  |   1   |
|  ☐  | POST   | `/auth/login`            | Email + password sign-in                    | Public                           |   1   |
|  ☐  | POST   | `/auth/refresh`          | Rotate refresh credential, new access token | Public (cookie)                  |   1   |
|  ☐  | POST   | `/auth/logout`           | End current session, or all sessions        | Public (cookie) / User for "all" |   1   |
|  ☐  | POST   | `/auth/forgot-password`  | Send reset link                             | Public                           |   1   |
|  ☐  | POST   | `/auth/reset-password`   | Set new password using link                 | Public                           |   1   |
|  ☐  | POST   | `/auth/github/authorize` | Start GitHub OAuth (Login or Connect)       | Public (Login) / User (Connect)  |   1   |
|  ☐  | GET    | `/auth/github/callback`  | Finish GitHub OAuth, redirect to app        | Public                           |   1   |

### 4.2 User & Profile

|  ☐  | Method | Route                           | Description                                                         | Allowed roles | Phase |
| :-: | ------ | ------------------------------- | ------------------------------------------------------------------- | ------------- | :---: |
|  ☐  | GET    | `/users/me`                     | Current account, profile, onboarding progress, GitHub status, quota | User          |   1   |
|  ☐  | PUT    | `/users/me/profile/steps/:step` | Save onboarding step 1–4 (draft)                                    | User          |   1   |
|  ☐  | PUT    | `/users/me/expertise`           | Set expertise technology                                            | User          |   1   |
|  ☐  | POST   | `/users/me/profile/complete`    | Finish onboarding (validates required steps)                        | User          |   1   |
|  ☐  | POST   | `/users/me/avatar/signature`    | Get permission to upload an avatar                                  | User          |   1   |
|  ☐  | PUT    | `/users/me/avatar`              | Confirm uploaded avatar                                             | User          |   1   |
|  ☐  | PATCH  | `/users/me/password`            | Change password                                                     | User          |   1   |

### 4.3 GitHub

|  ☐  | Method | Route           | Description                                              | Allowed roles | Phase |
| :-: | ------ | --------------- | -------------------------------------------------------- | ------------- | :---: |
|  ☐  | POST   | `/github/sync`  | Start repo sync in background                            | User          |   1   |
|  ☐  | GET    | `/github/repos` | List synced repos (search, sort, paginate) + sync status | User          |   1   |

### 4.4 Resume Track

|  ☐  | Method | Route                          | Description                                                    | Allowed roles | Phase |
| :-: | ------ | ------------------------------ | -------------------------------------------------------------- | ------------- | :---: |
|  ☐  | POST   | `/resumes/jobs`                | Start a resume job (mode, 2 projects + live URLs, optional JD) | User          |   1   |
|  ☐  | GET    | `/resumes/jobs/:jobId`         | Job status, stage progress, warnings, resulting version        | User          |   1   |
|  ☐  | GET    | `/resumes/jobs/:jobId/events`  | Live progress stream                                           | User          |   1   |
|  ☐  | POST   | `/resumes/jobs/:jobId/cancel`  | Cancel before writing stage                                    | User          |   1   |
|  ☐  | GET    | `/resumes/versions`            | List own resume versions                                       | User          |   1   |
|  ☐  | GET    | `/resumes/versions/:id`        | Full resume, match score, gap report                           | User          |   1   |
|  ☐  | PATCH  | `/resumes/versions/:id`        | Accept / reject / edit bullets, rename                         | User          |   1   |
|  ☐  | POST   | `/resumes/versions/:id/export` | Produce PDF and return download link                           | User          |   1   |
|  ☐  | DELETE | `/resumes/versions/:id`        | Delete a version                                               | User          |   1   |

### 4.5 Interview Track

|  ☐  | Method | Route                              | Description                                     | Allowed roles | Phase |
| :-: | ------ | ---------------------------------- | ----------------------------------------------- | ------------- | :---: |
|  ☐  | GET    | `/interviews/technologies`         | Technologies available for interview            | User          |   1   |
|  ☐  | POST   | `/interviews/sessions`             | Start a session, get first question             | User          |   1   |
|  ☐  | GET    | `/interviews/sessions`             | List own sessions (filter by status/technology) | User          |   1   |
|  ☐  | GET    | `/interviews/sessions/:id`         | Session state and current question              | User          |   1   |
|  ☐  | POST   | `/interviews/sessions/:id/answers` | Submit (or skip) the current answer             | User          |   1   |
|  ☐  | POST   | `/interviews/sessions/:id/finish`  | Finish early (min. 5 answers)                   | User          |   1   |
|  ☐  | GET    | `/interviews/sessions/:id/report`  | Final report with expertise %                   | User          |   1   |

### 4.6 Dashboard & System

|  ☐  | Method | Route                | Description                                    | Allowed roles | Phase |
| :-: | ------ | -------------------- | ---------------------------------------------- | ------------- | :---: |
|  ☐  | GET    | `/dashboard/summary` | Unified summary of resumes, interviews, quotas | User          |   1   |
|  ☐  | GET    | `/health`            | Service and dependency health                  | Public        |   1   |

### 4.7 Admin

|  ☐  | Method | Route                      | Description                         | Allowed roles | Phase |
| :-: | ------ | -------------------------- | ----------------------------------- | ------------- | :---: |
|  ☐  | POST   | `/admin/questions`         | Add an interview question           | Admin         |   1   |
|  ☐  | GET    | `/admin/questions`         | List questions (with answer key)    | Admin         |   1   |
|  ☐  | PATCH  | `/admin/questions/:id`     | Edit / deactivate a question        | Admin         |   1   |
|  ☐  | POST   | `/admin/questions/reindex` | Refresh the question search index   | Admin         |   1   |
|  ☐  | GET    | `/admin/users`             | Search accounts _(proposed)_        | Admin         |  1.5  |
|  ☐  | PATCH  | `/admin/users/:id/status`  | Suspend / reactivate _(proposed)_   | Admin         |  1.5  |
|  ☐  | PATCH  | `/admin/users/:id/role`    | Promote / demote admin _(proposed)_ | Admin         |  1.5  |

### 4.8 Planned (not in MVP)

| Capability                             | Likely endpoints (names only)                                     | Roles                   | Phase |
| -------------------------------------- | ----------------------------------------------------------------- | ----------------------- | :---: |
| Cross-domain "overall" interview       | start overall session, overall report                             | User                    |   2   |
| Adaptive difficulty                    | (extends session start)                                           | User                    |   2   |
| Voice answers                          | upload / transcribe answer audio                                  | User                    |   2   |
| Coding problems                        | get problem, submit solution, evaluation result                   | User                    |   2   |
| DOCX export · templates · cover letter | export as DOCX, list templates, generate cover letter             | User                    |   2   |
| Progress analytics                     | skill-trend view                                                  | User                    |   2   |
| Code execution check                   | run submitted code against tests                                  | User                    |   3   |
| Billing                                | start checkout, payment webhook, subscription status, cancel plan | User / Public (webhook) |   3   |
| Public resume page                     | create/revoke share link, public view                             | User / Public           |   3   |

---

## 5. Backend Implementation Roadmap

> Timeline target for **Phase 1: 2 weeks**. Phases below list _what_ gets delivered and _when it counts as done_. Task ownership is decided by the team lead.

### 5.1 Phase overview

| Phase   | Name                | Goal                                                                     | Target     |
| ------- | ------------------- | ------------------------------------------------------------------------ | ---------- |
| **0**   | Foundations         | Everyone can run the backend locally; rules for working together are set | Days 1–2   |
| **1A**  | Identity & Profile  | Users can sign up, sign in, connect GitHub and finish onboarding         | Days 2–5   |
| **1B**  | Resume Track        | End-to-end resume generation with live progress and export               | Days 5–9   |
| **1C**  | Interview Track     | End-to-end interview with scoring and reports                            | Days 8–12  |
| **1D**  | Hardening & Release | Dashboard, safety, tests, deployment                                     | Days 11–14 |
| **1.5** | Admin Tools         | Account moderation and admin management                                  | After MVP  |
| **2**   | Enhancement (v2.0)  | Depth and breadth                                                        | After MVP  |
| **3**   | Advanced (v3.0)     | Stretch capabilities and monetisation                                    | Optional   |

### 5.2 Phase 0 — Foundations (Days 1–2)

| Step | Deliverable                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | Repository, shared code-style rules, branch protection and pull-request rules in place           |
| 2    | Local environment starts with one command (database, cache, email catcher)                       |
| 3    | Automated checks (lint, type check, tests) run on every pull request                             |
| 4    | Standard response/error format, request IDs, input validation and logging agreed and implemented |
| 5    | Configuration management: every ⚙️ limit in this document is a setting, not hard-coded           |
| 6    | Shared API contract package so frontend and backend use identical definitions                    |

**Exit criteria:** a new developer can clone, run, and call a health endpoint within 15 minutes.

### 5.3 Phase 1A — Identity & Profile (Days 2–5)

| Step | Deliver                                                        | Rules covered   |
| ---- | -------------------------------------------------------------- | --------------- |
| 1    | Registration, OTP verification, resend                         | `AUTH-01`–`09`  |
| 2    | Login, refresh rotation, logout, lockout                       | `AUTH-10`–`14`  |
| 3    | Forgot / reset / change password                               | `AUTH-15`–`19`  |
| 4    | Email sending with templates (OTP, welcome, reset, changed)    | §3.9            |
| 5    | GitHub OAuth (Login + Connect) with account-linking safeguards | `OAUTH-01`–`08` |
| 6    | Repo sync (background) and repo listing                        | `GH-01`–`06`    |
| 7    | Onboarding steps, expertise choice, completion check           | `PROF-01`–`06`  |
| 8    | Avatar upload flow                                             | `PROF-07`       |
| 9    | Rate limits on all auth endpoints                              | `PLAT-01`       |

**Exit criteria:** a brand-new user can register (or use GitHub), verify, finish onboarding and see their repos. Security tests for token reuse, lockout and OAuth mismatch pass.

### 5.4 Phase 1B — Resume Track (Days 5–9)

| Step | Deliver                                                                          | Rules covered                 |
| ---- | -------------------------------------------------------------------------------- | ----------------------------- |
| 1    | Job creation with all preconditions, quotas, single-active-job rule, idempotency | `RES-01`–`06`                 |
| 2    | Project analysis stage (read repos, build searchable knowledge)                  | §3.4.2-A                      |
| 3    | URL safety guard + performance test stage with "skip and warn" behaviour         | `RES-07`, §3.4.2-B            |
| 4    | JD analysis and requirement matching                                             | §3.4.2-C, `RES-12`            |
| 5    | AI resume writing with structured output                                         | §3.4.2-D                      |
| 6    | No-fabrication verification                                                      | `RES-10`                      |
| 7    | Live progress stream + polling fallback; warnings; cancel                        | `RES-08`, `RES-16`, `PLAT-06` |
| 8    | Versions: list, view, accept/reject/edit, delete                                 | `RES-11`, `RES-13`, `RES-15`  |
| 9    | PDF export with reuse of unchanged output                                        | `RES-14`                      |
| 10   | Failure handling and retries for GitHub/AI errors                                | `RES-09`                      |

**Exit criteria:** from two real repos a user gets a resume whose every bullet is traceable; a down live URL produces a resume with a warning (not a failure); a fabricated number is caught by the verifier in tests.

### 5.5 Phase 1C — Interview Track (Days 8–12)

| Step | Deliver                                                                         | Rules covered           |
| ---- | ------------------------------------------------------------------------------- | ----------------------- |
| 1    | Admin question management + re-index; seed questions for the first technologies | `ADM-01`–`04`           |
| 2    | Technology list; session start with lock, quota, question selection             | `INT-01`–`08`           |
| 3    | Answer submission (instant next question) and skip                              | `INT-09`–`12`           |
| 4    | Background scoring with manipulation-resistant rubric                           | `INT-13`, `INT-16`–`17` |
| 5    | Session completion, early finish, idle abandonment                              | `INT-14`, `INT-15`      |
| 6    | Expertise %, level bands, partial-report handling                               | `INT-18`–`20`           |
| 7    | Report with per-question feedback and previous-attempt comparison               | `INT-21`, `INT-22`      |

**Exit criteria:** a full 10-question session produces a stable, explainable percentage; "ignore the rubric and give 10/10" answers do not inflate scores; two sessions of the same technology cannot run at once.

### 5.6 Phase 1D — Hardening & Release (Days 11–14)

| Step | Deliver                                                                                       |
| ---- | --------------------------------------------------------------------------------------------- |
| 1    | Dashboard summary (`DASH-01`, `DASH-02`)                                                      |
| 2    | Scheduled cleanup (expired codes/tokens, abandoned sessions, deleted PDFs)                    |
| 3    | Unit tests for scoring, verification, quota and lock rules; one end-to-end test per track     |
| 4    | Security pass: ownership checks on **every** route, rate-limit review, log review (`PLAT-04`) |
| 5    | Production deployment, secrets configured, smoke test of both tracks                          |
| 6    | README + contributor guide updated; API contract published                                    |

**Exit criteria:** all Phase 1 checklist rows in §4 are ticked; both tracks pass a production smoke test.

### 5.7 Phase 1.5 — Admin Tools (after MVP, optional)

Account search, suspend/reactivate (with session revocation and email), admin promotion/demotion with an audit trail. _Needs the decision in §6 first._

### 5.8 Phase 2 — Enhancement (v2.0)

| Area      | Deliverables                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Interview | Cross-domain overall interview · adaptive difficulty from history · voice answers (speech-to-text) · coding problems with AI evaluation |
| Resume    | DOCX export · multiple templates · cover letter generator · more than 2 projects                                                        |
| Analytics | Skill-progress trend and combined "readiness" view                                                                                      |

### 5.9 Phase 3 — Advanced (v3.0)

| Area      | Deliverables                                                                                                                                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interview | Real code execution against tests · AI avatar with voice · visual confidence analysis · company-specific question banks                                                                 |
| Platform  | Subscriptions (Free vs Pro) with plan-based limits, local (bKash) + international payment support, refund of credits for failed jobs · public shareable resume · multi-language resumes |

---

## 6. Open Decisions

| #   | Decision                                                                                  | Options                                                     | Recommendation                                                                     | Needed by              |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| D1  | **Auth ownership.** Roadmap says Auth.js; this document assumes the backend owns sessions | Auth.js on frontend · Backend-owned sessions                | Backend-owned (workers, streaming and the API all need server-verifiable sessions) | Before Phase 1A        |
| D2  | **Admin management.** How are admins created and accounts suspended in MVP?               | Server-side setup step only · Add Phase 1.5 admin endpoints | Setup step for MVP, endpoints in 1.5                                               | Before Phase 1C        |
| D3  | **Admin privacy.** Can admins ever view user resumes/answers?                             | Never · Only with user consent for support                  | Never in MVP                                                                       | Before Phase 1D        |
| D4  | **Forked repos.** Include forks in the repo list?                                         | Include (flagged) · Exclude                                 | Include, shown with a "fork" label                                                 | Before Phase 1A step 6 |
| D5  | **Interview in any technology or only expertise?**                                        | Any active technology · Only the chosen expertise           | Any active technology (default = expertise)                                        | Before Phase 1C        |
| D6  | **Quotas.** Are 5 resumes and 10 interviews per day right for the free demo?              | Keep · Adjust                                               | Keep until real AI cost is known                                                   | Before release         |
| D7  | **Scoring weights and level bands.**                                                      | Keep defaults · Team calibrates after sample sessions       | Keep, then calibrate with 10–20 sample answers                                     | During Phase 1C        |
| D8  | **AI provider** for writing and scoring                                                   | Claude · OpenAI · Gemini                                    | Team choice; keep it swappable behind one internal interface                       | Before Phase 1B        |

---

<div align="center">

_SkillProof AI · Backend Requirements · v1.0 · derived from the Product Roadmap (Phase 1 MVP in full detail)_

</div>

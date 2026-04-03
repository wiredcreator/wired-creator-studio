# Compiled Student Profiles Design

**Date:** 2026-04-02
**Status:** Approved
**Depends on:** AI Documents system (2026-04-02-ai-documents-design.md)

## Overview

A template-based system for generating per-student coaching profiles from questionnaire data. Admins create a global "Student Profile Template" AI Document with variable markers (`{{C1}}`-`{{C16}}` for Content DNA, `{{P1}}`-`{{P17}}` for Personal Baseline). The system compiles this template per-student by substituting their questionnaire answers and running the result through Claude to produce a structured profile. The compiled profile is then injected into all AI generation calls as context.

## Data Model Changes

### AIDocument Category

Add `'student_profile'` to `AI_DOCUMENT_CATEGORIES` in `src/models/AIDocument.ts`.

Documents in this category are templates, not static content. They contain variable markers that get resolved per-student. They are never injected raw into prompts.

### BrandBrain Model

Add a new field to `src/models/BrandBrain.ts`:

```
compiledProfile: {
  content: String,         // the filled-in profile text (Claude's output)
  templateUpdatedAt: Date, // the template's updatedAt when this was compiled
  compiledAt: Date         // when compilation happened
}
```

### Variable Syntax

Two variable types, matching the Student Profile Template document. Variables map to questionnaire `questionId` values in storage order.

**Content DNA: `{{C1}}` through `{{C16}}`**

| Variable | questionId | Question |
|----------|-----------|----------|
| `{{C1}}` | `yourStory` | What do you do and how did you end up here? |
| `{{C2}}` | `winsAndMilestones` | What are the biggest wins, results, or milestones? |
| `{{C3}}` | `contentGoal` | What do you want your content to actually lead to? |
| `{{C4}}` | `offerAndContent` | What do you sell or plan to sell? |
| `{{C5}}` | `goToPersonFor` | What do people always come to you for? |
| `{{C6}}` | `talkWithoutPreparing` | What could you talk about for 30 minutes without preparing? |
| `{{C7}}` | `audienceAndProblem` | Who do you want to reach, and what problem are you solving? |
| `{{C8}}` | `uniquePerspective` | What makes your perspective different? |
| `{{C9}}` | `personalStories` | 2-3 personal stories that shaped who you are |
| `{{C10}}` | `knownForAndAgainst` | What do you want to be known FOR and AGAINST? |
| `{{C11}}` | `contentHistory` | Have you tried making content before? |
| `{{C12}}` | `timeAndEnergy` | How much time and energy do you have for content? |
| `{{C13}}` | `easyVsDraining` | What parts feel easy, what parts feel draining? |
| `{{C14}}` | `naturalFormat` | What format feels most natural? |
| `{{C15}}` | `coreMessage` | One core message about you |
| `{{C16}}` | `writtenSamples` | Written content samples (optional) |

**Personal Baseline: `{{P1}}` through `{{P17}}`**

| Variable | questionId | Question |
|----------|-----------|----------|
| `{{P1}}` | `location-city` | What city do you live in? |
| `{{P2}}` | `location-state` | What state are you in? |
| `{{P3}}` | `typical-day` | Walk us through a typical weekday and weekend |
| `{{P4}}` | `fixed-commitments` | What commitments can't be moved? |
| `{{P5}}` | `consistency-blockers` | What keeps getting in the way of consistency? |
| `{{P6}}` | `stuck-response` | What do you do when you feel stuck or overwhelmed? |
| `{{P7}}` | `adhd-management` | ADHD diagnosis and management |
| `{{P8}}` | `past-systems` | What tools/systems have you tried before? |
| `{{P9}}` | `existing-habits` | Anything you're already consistent with? |
| `{{P10}}` | `motivation-rewards` | What rewards or experiences get you going? |
| `{{P11}}` | `physical-space` | What does your physical space look like? |
| `{{P12}}` | `phone-relationship` | Relationship with phone and social media |
| `{{P13}}` | `sleep-energy` | How are you sleeping, how's your energy? |
| `{{P14}}` | `accountability-person` | Someone who could check in on you? |
| `{{P15}}` | `upcoming-disruptions` | Anything that might make it harder to show up? |
| `{{P16}}` | `success-definition` | What does success look like at the end? |
| `{{P17}}` | `anything-else` | Anything else you want us to know? |

If a questionnaire answer is missing (skipped or optional), the marker is replaced with "(not provided)".

## Compilation Flow

### The `compileStudentProfile(userId)` Function

Located in a new file `src/lib/ai/compile-profile.ts`.

1. Fetch the global `student_profile` AI Document (the template). If none exists, return early (no-op).
2. Fetch the student's Content DNA responses (Q1-Q16) and Personal Baseline responses (Q1-Q17) from the database.
3. Parse the template content for `{{C1}}`...`{{C16}}` and `{{P1}}`...`{{P17}}` markers.
4. Replace each marker with the student's raw answer text. Missing answers become "(not provided)".
5. Send the populated template to Claude in one API call. The template's own instructions tell Claude how to format each field.
6. Store Claude's output in `brandBrain.compiledProfile`:
   - `content` = Claude's response
   - `templateUpdatedAt` = the template document's `updatedAt`
   - `compiledAt` = now
7. Track AI usage via existing `trackAIUsage` system.

### When Compilation Triggers

**After onboarding (new student):**
- Student completes both questionnaires
- Frontend fires `POST /api/compile-profile` as a separate, fire-and-forget request
- Compilation runs asynchronously; does not block the student from entering the dashboard

**After admin updates the template:**
- Admin clicks a "Recompile All Students" button on the admin AI Documents page
- Frontend loops through students one at a time, firing individual compile requests per student
- Each request is its own API call (no Vercel timeout issues)

**During generation (passive):**
- `buildSystemPrompt` never triggers compilation inline
- It injects whatever compiled profile exists
- If no compiled profile exists (student was very fast, or template was just created), generation proceeds without it

## Injection into Generation Calls

### Changes to `buildSystemPrompt`

Current injection order:
1. Base system prompt
2. Global AI Documents for the category
3. User AI Documents for the category

New injection order:
1. Base system prompt
2. Global AI Documents for the category (excludes `student_profile` category)
3. **Compiled student profile** (if exists for this user)
4. User AI Documents for the category

The compiled profile is injected as:
```
## Student Profile
{compiledContent}
```

It is injected for **every category** (idea_generation, script_generation, title_generation, etc.). The `student_profile` category documents are never injected raw; they only serve as templates for compilation.

**Performance:** The BrandBrain lookup for the compiled profile should be parallelized with the existing AIDocument queries using `Promise.all` to avoid sequential DB round-trips.

## API Routes

### `POST /api/compile-profile`

- Auth: authenticated user (student compiling own profile after onboarding) or admin
- Body: `{ userId?: string }` (admin can specify userId, students compile their own)
- Calls `compileStudentProfile(userId)`
- Returns `{ success: true, compiledAt: Date }` or `{ error: string }`

### `POST /api/admin/compile-all-profiles`

- Auth: admin only
- Fetches all students who have completed both questionnaires
- Returns `{ userIds: string[] }` (only students with completed onboarding)
- The frontend loops through and calls `/api/compile-profile` for each
- Individual failures are logged but don't stop the loop; frontend shows success/fail count when done
- This endpoint just returns the student list; actual compilation happens per-student via individual calls

## UI Changes

### Admin AI Documents Page

- Add `student_profile: 'Student Profile Template'` to `CATEGORY_LABELS`
- When creating/editing a document with this category, show a helper note: "Template document. Use {{C1}}-{{C16}} for Content DNA answers and {{P1}}-{{P17}} for Personal Baseline answers."
- Add a "Recompile All Students" button that appears when a `student_profile` document exists. Triggers the recompile loop.

### Admin Student Detail Page

- In the Brand Brain tab or a visible section, show the compiled profile status:
  - If compiled: show content preview, compiled date, whether it's current or stale
  - "Recompile" button to force-recompile for that specific student
- If no compiled profile: show "Not yet compiled" with a "Compile Now" button

### Onboarding Completion

- After both questionnaires are submitted and existing processing completes (tone of voice generation, personal baseline processing), fire `POST /api/compile-profile` from the frontend

### No Student-Facing Changes

Students never see or interact with the compiled profile.

## Design Decisions

- **No inline compilation during generation.** Vercel's serverless timeout makes sequential Claude calls risky. Compilation is always a separate request.
- **Compiled profile injected into all categories.** At ~1,000 tokens, the profile is small enough that universal injection is simpler than selective per-category logic. Every AI feature benefits from knowing the student's niche, audience, ADHD profile, etc.
- **Timestamp-based staleness, not version numbers.** Compare template's `updatedAt` against `compiledProfile.templateUpdatedAt`. Simpler than maintaining explicit version counters.
- **Template never injected raw.** `student_profile` category is excluded from normal document injection in `buildSystemPrompt`. Only the compiled output is injected.
- **Missing answers handled gracefully.** "(not provided)" replacement ensures Claude can still generate a partial profile if a student skipped optional questions.

## What Stays Unchanged

- All existing AI Document functionality (static documents, per-user documents)
- The questionnaire models and onboarding flow (no schema changes)
- The Brand Brain context assembly (`brand-brain-context.ts`) continues to work alongside the compiled profile
- All existing generation function signatures

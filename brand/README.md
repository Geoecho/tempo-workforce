# Tempo launch kit

## Positioning

**Name:** Tempo  
**Tagline:** Every shift. In sync.  
**One-liner:** A simple place to organize crews, record time, and estimate pay across sites.  
**Audience:** Event operators, factory managers, warehouse leads, and field teams.

## Visual identity

| Role | Color | Hex |
| --- | --- | --- |
| Primary | Forest green | `#254E3D` |
| Background | Soft off-white | `#F8F9F5` |
| Accent | Sage | `#D5E2CB` |
| Card tint | Pale sage | `#E9F0E2` |
| Body text | Deep charcoal | `#202C27` |

Use regular-weight sans-serif headlines, open space, and thin separators. Keep the `tempo` wordmark lowercase, without a period. The three rounded bars lean left by 22 degrees. The [SVG logo](tempo-logo.svg) and [standalone mark](tempo-mark.svg) are scalable sources; the [app icon](app-icon.png), [feed artwork](instagram-feed.png), and [story artwork](instagram-story.png) use the same identity. Avoid neon colors, heavy headings, and decorative numbered labels.

Regenerate the icon family and social artwork with `node scripts/generate-brand.cjs`. The script uses Sharp; `TEMPO_SHARP_MODULE` can point to a Sharp installation outside this repository.

## Instagram profile

**Display name:** Tempo | Teams, Time & Pay  
**Bio:** Every shift. In sync. Organize teams, track time, and see pay estimates in one calm workspace. Preview below ↓  
**Website field:** `https://i-want-you-to-make-a-six.vercel.app/welcome`

## First feed post

Upload `instagram-feed.png` as the first post.

**Caption:**

> Meet Tempo. A calmer way to keep teams, shifts, time, and pay in sync. Built for the people behind events, factories, warehouses, and field work. Our interactive preview is live—explore it through the link in bio. What part of crew management takes the most time for you?

**Hashtags:** `#WorkforceManagement #ShiftPlanning #EventCrew #TimeTracking #TeamOperations #WarehouseManagement #TempoApp`

## Story

Upload `instagram-story.png`, then add Instagram's **Link** sticker to the preview URL above. Suggested sticker label: **Explore the preview**.

## Follow-up post ideas

1. **Crew overview:** Show the People & teams screen. Caption: “A clear view of your crew, roles, rates, and a quick way to call when plans change.”
2. **Check-in:** Show the site QR and worker scan screens. Caption: “From arrival to checkout, every shift has a clear time record.”
3. **Pay clarity:** Show the checkout result. Caption: “Workers see an estimated payout at checkout, with payable time capped at 10 hours per day in this preview.”

For public promotion, describe Tempo as an **interactive prototype** and pay totals as **estimated earnings**. The public landing page uses sample records for its interactive preview; signed-in workspaces use Supabase.

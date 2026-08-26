# Show Analyst Name on Attention Items

## Goal
Replace the generic "Mine" badge on dashboard attention items with the actual analyst name (Business Analyst or Submitter) so the label is meaningful.

## Changes
1. **Update `src/lib/derive.ts`**
   - In `attentionItems`, change the returned object from `{ record, reasons, mine }` to `{ record, reasons, ownerName }`.
   - Set `ownerName` to the matching value: `a.data['businessAnalyst']` if that equals the current user, otherwise `a.data['submittedBy']`.
   - Keep the sort that surfaces the current user's items first.

2. **Update `src/routes/index.tsx`**
   - Destructure `ownerName` instead of `mine`.
   - Replace the "Mine" `StatusBadge` with one showing `ownerName`, keeping the same primary-colored styling.

## Acceptance
- Dashboard attention list no longer shows "Mine".
- Each attention item displays the responsible analyst's name as a badge.
- Current user's items still appear first in the list.

# Activity Timeline Constraint Verification

This document defines the invariants that must be maintained for Activity Timelines.
These constraints ensure timelines remain **read-only evidence** with no side effects.

## Hard Constraints

Activity Timelines must NEVER:

1. **Affect Billing** - No inserts/updates to `case_finances` when timeline is added
2. **Affect Budgets** - No budget consumption calculations reference timeline data
3. **Create Activities** - Timeline entries are NOT inserted into `case_activities`
4. **Appear on Calendars** - Timeline entries have no `due_date` or event fields
5. **Modify Updates When Excluded** - Setting `includeActivityTimelines=false` in exports
   must NOT delete or alter any `case_updates` records

## Data Model

```
case_updates
├── id (uuid)
├── title (text)
├── description (text)
├── update_type (text)
├── activity_timeline (jsonb) ← Stored inline, NOT a foreign key
└── ...other fields

Timeline JSON structure:
[
  { "time": "09:00", "description": "Subject departed residence" },
  { "time": "10:30", "description": "Subject arrived at workplace" }
]
```

## Invariants to Test

### 1. No Billing Impact
```sql
-- Before and after adding timeline, count should be identical
SELECT COUNT(*) FROM case_finances WHERE case_id = ?;
```

### 2. No Budget Impact
```sql
-- Budget calculations should never reference activity_timeline
-- Verify case_finances.hours and case_finances.amount are not affected
```

### 3. No Activity Creation
```sql
-- Timeline entries should NOT appear in case_activities
SELECT * FROM case_activities 
WHERE case_id = ? 
AND created_at > [timeline_added_timestamp];
-- Should return 0 rows related to timeline entries
```

### 4. No Calendar Entries
```sql
-- Timelines have no schedulable fields
-- case_activities with due_date should not be created from timelines
SELECT * FROM case_activities 
WHERE case_id = ? AND due_date IS NOT NULL
AND title LIKE '%[timeline entry text]%';
-- Should return 0 rows
```

### 5. Export Exclusion Preserves Data
```typescript
// When exporting with includeActivityTimelines=false:
// 1. Updates should still be included
// 2. activity_timeline field is simply not rendered
// 3. No DELETE or UPDATE queries to case_updates should occur
```

## Code Locations

| File | Constraint Enforcement |
|------|------------------------|
| `src/lib/docxVariables.ts` | Timeline only affects `{{Updates.with_timelines}}` output |
| `src/components/analytics/reports/ReportExportMenu.tsx` | Read-only formatting, no mutations |
| `src/components/case-detail/UpdateForm.tsx` | Timeline stored as inline JSON only |
| `src/lib/caseSummaryData.ts` | Read-only fetch for PDF generation |

## Future Considerations

If automated tests are added, they should verify:

1. Creating an update with timeline does NOT increase `case_finances` count
2. Creating an update with timeline does NOT increase `case_activities` count  
3. Exporting with `includeActivityTimelines=false` produces same `case_updates` count
4. Budget summary API responses are identical before/after adding timeline
5. Calendar queries return no timeline-derived entries

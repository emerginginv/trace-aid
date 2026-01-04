# CaseWyze Import System - Official Templates v1.0

## ⚠️ Important Principles

1. **CaseWyze is the source of truth** - External systems must conform to CaseWyze
2. **Use exact column names** - Do not rename, add, or remove columns
3. **Follow import order** - Import files in numerical order (01 through 12)
4. **External Record IDs are required** - Every record needs a unique identifier

---

## 📋 Import Order (CRITICAL)

Import files in this exact order to maintain referential integrity:

| Order | File | Depends On |
|-------|------|------------|
| 01 | Organization.csv | None |
| 02 | Clients.csv | Organization |
| 03 | Contacts.csv | Clients |
| 04 | Cases.csv | Clients, Contacts |
| 05 | Subjects.csv | None (standalone entities) |
| 06 | CaseSubjects.csv | Cases, Subjects |
| 07 | Updates.csv | Cases |
| 08 | Events.csv | Cases |
| 09 | TimeEntries.csv | Cases, Subjects (optional) |
| 10 | Expenses.csv | Cases, Subjects (optional) |
| 11 | Budgets.csv | Cases |
| 12 | BudgetAdjustments.csv | Cases |

---

## 📝 Column Naming Rules

- Column names are **case-sensitive** and must match exactly
- Use **snake_case** (e.g., `external_record_id`, not `ExternalRecordId`)
- **Required columns** must have non-empty values
- **Optional columns** can be left empty but the column must exist in the file

---

## 📅 Date Formats (Accepted)

| Format | Example | Recommended |
|--------|---------|-------------|
| ISO 8601 | `2024-03-15` | ✅ Yes |
| US Format | `03/15/2024` | Accepted |
| EU Format | `15-03-2024` | Accepted |

---

## 🕐 DateTime Formats

| Format | Example |
|--------|---------|
| ISO 8601 | `2024-03-15T14:30:00` |
| With timezone | `2024-03-15T14:30:00Z` |

---

## 💰 Currency Formats

- Use decimal numbers **without** currency symbols
- ✅ Correct: `1500.00`
- ❌ Wrong: `$1,500.00`
- Negative values allowed: `-250.50`

---

## ✓ Boolean Values

| True | False |
|------|-------|
| `true`, `yes`, `1`, `TRUE`, `YES` | `false`, `no`, `0`, `FALSE`, `NO` |

---

## ❌ Common Mistakes to Avoid

1. **Importing out of order** - Cases cannot reference Clients that don't exist yet
2. **Duplicate external_record_id** - Each ID must be unique within its entity type
3. **Missing required columns** - All required columns must exist in the file header
4. **Invalid references** - `external_case_id` must match an existing `external_record_id` in Cases.csv
5. **Invalid date formats** - Use accepted formats only
6. **Currency symbols in amounts** - Remove `$`, `,` and other formatting
7. **Trailing/leading whitespace** - Trim all values
8. **Wrong file encoding** - Use UTF-8 encoding

---

## 🔗 External Record ID Guidelines

- Must be unique per entity type
- Can be any string (alphanumeric recommended)
- Used to link related records across files
- Preserved for audit trail and potential rollback
- Examples: `CLT-001`, `CASE-2024-001`, `EXP-00123`

---

## 📊 Picklist Values

These fields accept specific values. Unknown values may be rejected or create new entries.

### Case Status
- `open`
- `in_progress`
- `on_hold`
- `closed`

### Subject Type
- `person`
- `business`
- `vehicle`
- `property`
- `other`

### Activity Type
- `task`
- `event`
- `call`
- `meeting`
- `deadline`

### Activity Status
- `to_do`
- `in_progress`
- `completed`

### Budget Adjustment Type
- `hours`
- `dollars`

### Expense Categories (Common)
- `Mileage`
- `Meals`
- `Lodging`
- `Equipment`
- `Database Fees`
- `Background Check`
- `Court Filing`
- `Travel`
- `Other`

### Update Types (Common)
- `Surveillance Report`
- `Interview Summary`
- `Background Check`
- `Status Update`
- `Final Report`
- `Client Communication`
- `Other`

---

## 📁 File Requirements

- **Encoding:** UTF-8 (with or without BOM)
- **Delimiter:** Comma (`,`)
- **Quote Character:** Double quote (`"`) for fields containing commas
- **Line Ending:** CRLF or LF
- **Header Row:** Required (first row must contain column names)

---

## 📋 Template Files Summary

| File | Purpose | Required Columns |
|------|---------|------------------|
| 01_Organization.csv | Organization setup | external_record_id, name |
| 02_Clients.csv | Client/Account records | external_record_id, name |
| 03_Contacts.csv | Contact persons | external_record_id, first_name, last_name |
| 04_Cases.csv | Case records | external_record_id, case_number, title |
| 05_Subjects.csv | Subject entities | external_record_id, name, subject_type |
| 06_CaseSubjects.csv | Link subjects to cases | external_record_id, external_case_id, external_subject_id |
| 07_Updates.csv | Case updates/notes | external_record_id, external_case_id, title, update_type |
| 08_Events.csv | Activities/tasks | external_record_id, external_case_id, activity_type, title |
| 09_TimeEntries.csv | Time records | external_record_id, external_case_id, date, hours, description |
| 10_Expenses.csv | Expense records | external_record_id, external_case_id, date, amount, description |
| 11_Budgets.csv | Initial budgets | external_record_id, external_case_id |
| 12_BudgetAdjustments.csv | Budget changes | external_record_id, external_case_id, adjustment_type, new_value, reason |

---

## ❓ Getting Help

If you encounter issues during import:

1. Check that all required columns are present
2. Verify external_record_id values are unique
3. Confirm referenced records exist (e.g., Cases before Updates)
4. Validate date and number formats
5. Review the error log for specific record failures

---

*CaseWyze Import Templates v1.0*

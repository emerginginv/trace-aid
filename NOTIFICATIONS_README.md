# Notifications System

The notifications system provides real-time alerts to users about important events in the case management application.

## Database Table

Notifications are stored in the `notifications` table with the following structure:

- `id`: UUID primary key
- `user_id`: UUID reference to the user
- `type`: Notification type (task, case, activity, user, expense, settings)
- `title`: Short notification title
- `message`: Detailed notification message
- `related_id`: Optional UUID of related entity (case, task, etc.)
- `related_type`: Optional type of related entity
- `link`: Optional navigation link
- `priority`: Priority level (low, medium, high)
- `read`: Boolean flag for read status
- `timestamp`: When the notification was created

## How to Create Notifications

### Using Helper Functions

The easiest way to create notifications is using the pre-built helper functions:

```typescript
import { NotificationHelpers } from '@/lib/notifications';

// When a task is assigned
await NotificationHelpers.taskAssigned('CASE-00123', caseId);

// When a case status changes
await NotificationHelpers.caseStatusChanged('CASE-00123', 'In Progress', caseId);

// When a file is uploaded
await NotificationHelpers.fileUploaded(3, 'CASE-00123', caseId);

// When an expense is approved
await NotificationHelpers.expenseApproved(450.00, expenseId);
```

### Creating Custom Notifications

For custom notifications, use the `createNotification` function:

```typescript
import { createNotification } from '@/lib/notifications';

await createNotification({
  type: 'task',
  title: 'Custom Notification',
  message: 'This is a custom notification message',
  relatedId: 'some-entity-id',
  relatedType: 'case',
  link: '/cases/some-id',
  priority: 'high',
});
```

## Notification Types

- **task**: Task-related notifications (assigned, due soon, completed)
- **case**: Case management notifications (status changes, assignments)
- **activity**: Activity log notifications (updates, file uploads)
- **user**: User management notifications (new users, role changes)
- **expense**: Financial notifications (approvals, rejections)
- **settings**: System configuration notifications (picklist updates)

## Priority Levels

- **low**: Informational notifications (file uploads, new updates)
- **medium**: Important updates (status changes, expense approvals)
- **high**: Urgent notifications (task assignments, approaching deadlines)

## Real-time Updates

The notifications page automatically updates in real-time when new notifications are added. This is powered by Supabase Realtime subscriptions.

## Integration Examples

### When Creating a New Case

```typescript
// In your case creation code
const { data: newCase, error } = await supabase
  .from('cases')
  .insert({ ...caseData })
  .select()
  .single();

if (!error && newCase) {
  await NotificationHelpers.caseAssigned(newCase.case_number, newCase.id);
}
```

### When Updating Case Status

```typescript
// In your case update code
const { error } = await supabase
  .from('cases')
  .update({ status: newStatus })
  .eq('id', caseId);

if (!error) {
  await NotificationHelpers.caseStatusChanged(caseNumber, newStatus, caseId);
}
```

### When a Task is Due Soon

You can set up scheduled checks (e.g., with Edge Functions) to create notifications:

```typescript
// In a scheduled task/edge function
const dueSoonTasks = await supabase
  .from('case_activities')
  .select('*')
  .gte('due_date', today)
  .lte('due_date', tomorrow)
  .eq('completed', false);

for (const task of dueSoonTasks.data || []) {
  await NotificationHelpers.taskDueSoon(task.title, task.case_id);
}
```

## Testing Notifications

To test the notifications system, you can manually insert test notifications:

```typescript
import { createNotification } from '@/lib/notifications';

// Create a test notification
await createNotification({
  type: 'task',
  title: 'Test Notification',
  message: 'This is a test notification to verify the system works',
  priority: 'medium',
  link: '/dashboard',
});
```

Or use the Supabase SQL editor to insert directly:

```sql
INSERT INTO notifications (user_id, type, title, message, priority, read)
VALUES (
  'your-user-id',
  'task',
  'Test Notification',
  'Testing the notification system',
  'medium',
  false
);
```

## Best Practices

1. **Use appropriate priority levels**: Reserve "high" for truly urgent notifications
2. **Include navigation links**: Help users quickly access related content
3. **Keep messages concise**: Users should understand the notification at a glance
4. **Use helper functions**: They ensure consistency across the application
5. **Test realtime updates**: Verify notifications appear immediately without refresh

## Row Level Security

The notifications table has RLS policies that ensure:
- Users can only see their own notifications
- Users can only update/delete their own notifications
- The system can create notifications for users

These policies are automatically enforced by Supabase.

import { supabase } from "@/integrations/supabase/client";

export const createNotification = async ({
  userId,
  organizationId,
  type,
  title,
  message,
  priority = "medium",
  link,
  relatedId,
  relatedType,
}: {
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  priority?: "low" | "medium" | "high";
  link?: string;
  relatedId?: string;
  relatedType?: string;
}) => {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      organization_id: organizationId,
      type,
      title,
      message,
      priority,
      link,
      related_id: relatedId,
      related_type: relatedType,
      read: false,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

// Notify all organization members except the actor
export const notifyOrganizationMembers = async ({
  organizationId,
  excludeUserId,
  type,
  title,
  message,
  priority = "medium",
  link,
  relatedId,
  relatedType,
}: {
  organizationId: string;
  excludeUserId?: string;
  type: string;
  title: string;
  message: string;
  priority?: "low" | "medium" | "high";
  link?: string;
  relatedId?: string;
  relatedType?: string;
}) => {
  try {
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId);

    if (!members) return;

    const notifications = members
      .filter((m) => m.user_id !== excludeUserId)
      .map((m) => ({
        user_id: m.user_id,
        organization_id: organizationId,
        type,
        title,
        message,
        priority,
        link,
        related_id: relatedId,
        related_type: relatedType,
        read: false,
      }));

    if (notifications.length > 0) {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;
    }
  } catch (error) {
    console.error("Error notifying organization members:", error);
  }
};

// Specific notification helpers
export const NotificationHelpers = {
  caseCreated: async (
    caseData: { id: string; title: string; case_number: string },
    userId: string,
    organizationId: string
  ) => {
    await notifyOrganizationMembers({
      organizationId,
      excludeUserId: userId,
      type: "case",
      title: "New Case Created",
      message: `Case ${caseData.case_number}: ${caseData.title} has been created`,
      priority: "medium",
      link: `/cases/${caseData.id}`,
      relatedId: caseData.id,
      relatedType: "case",
    });
  },

  caseStatusChanged: async (
    caseData: { id: string; title: string; case_number: string; status: string },
    userId: string,
    organizationId: string
  ) => {
    await notifyOrganizationMembers({
      organizationId,
      excludeUserId: userId,
      type: "case",
      title: "Case Status Updated",
      message: `Case ${caseData.case_number} status changed to ${caseData.status}`,
      priority: "medium",
      link: `/cases/${caseData.id}`,
      relatedId: caseData.id,
      relatedType: "case",
    });
  },

  taskCreated: async (
    taskData: { id: string; title: string; case_id: string },
    assignedUserId: string | null,
    userId: string,
    organizationId: string
  ) => {
    if (assignedUserId && assignedUserId !== userId) {
      await createNotification({
        userId: assignedUserId,
        organizationId,
        type: "task",
        title: "New Task Assigned",
        message: `You have been assigned: ${taskData.title}`,
        priority: "high",
        link: `/cases/${taskData.case_id}`,
        relatedId: taskData.id,
        relatedType: "task",
      });
    }
  },

  taskCompleted: async (
    taskData: { id: string; title: string; case_id: string },
    userId: string,
    organizationId: string
  ) => {
    await notifyOrganizationMembers({
      organizationId,
      excludeUserId: userId,
      type: "task",
      title: "Task Completed",
      message: `Task completed: ${taskData.title}`,
      priority: "low",
      link: `/cases/${taskData.case_id}`,
      relatedId: taskData.id,
      relatedType: "task",
    });
  },

  expenseSubmitted: async (
    expenseData: { id: string; description: string; amount: number; case_id: string },
    userId: string,
    organizationId: string
  ) => {
    // Notify admins
    const { data: admins } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "admin");

    if (admins) {
      const notifications = admins.map((admin) => ({
        user_id: admin.user_id,
        organization_id: organizationId,
        type: "expense",
        title: "New Expense Submitted",
        message: `${expenseData.description} - $${expenseData.amount}`,
        priority: "medium" as const,
        link: `/expenses/${expenseData.id}`,
        related_id: expenseData.id,
        related_type: "expense",
        read: false,
      }));

      await supabase.from("notifications").insert(notifications);
    }
  },

  expenseStatusChanged: async (
    expenseData: { id: string; description: string; status: string },
    submittedByUserId: string,
    organizationId: string
  ) => {
    await createNotification({
      userId: submittedByUserId,
      organizationId,
      type: "expense",
      title: `Expense ${expenseData.status}`,
      message: `Your expense "${expenseData.description}" has been ${expenseData.status}`,
      priority: "high",
      link: `/expenses/${expenseData.id}`,
      relatedId: expenseData.id,
      relatedType: "expense",
    });
  },

  caseUpdateAdded: async (
    updateData: { id: string; title: string; case_id: string },
    userId: string,
    organizationId: string
  ) => {
    await notifyOrganizationMembers({
      organizationId,
      excludeUserId: userId,
      type: "case",
      title: "New Case Update",
      message: updateData.title,
      priority: "medium",
      link: `/cases/${updateData.case_id}`,
      relatedId: updateData.id,
      relatedType: "update",
    });
  },

  userInvited: async (
    inviteData: { email: string; role: string },
    organizationId: string
  ) => {
    const { data: admins } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "admin");

    if (admins) {
      const notifications = admins.map((admin) => ({
        user_id: admin.user_id,
        organization_id: organizationId,
        type: "user",
        title: "User Invited",
        message: `${inviteData.email} has been invited as ${inviteData.role}`,
        priority: "low" as const,
        link: "/settings",
        related_type: "user_invite",
        read: false,
      }));

      await supabase.from("notifications").insert(notifications);
    }
  },
};

import type { MetricDefinition } from "../types";

/**
 * Attachment/storage metric definitions
 */
export const ATTACHMENT_METRICS: MetricDefinition[] = [
  // ============= Case Attachment Metrics =============
  {
    id: "attachments.case_attachment_count",
    name: "Case Attachments",
    description: "Total number of files attached to cases",
    category: "storage",
    dataType: "count",
    unit: "count",
    sourceTable: "case_attachments",
    calculation: {
      type: "simple_count",
      table: "case_attachments",
    },
    auditInfo: {
      formula: "COUNT(case_attachments)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "attachments.case_storage_bytes",
    name: "Case Storage",
    description: "Total storage used by case attachments",
    category: "storage",
    dataType: "sum",
    unit: "bytes",
    sourceTable: "case_attachments",
    calculation: {
      type: "sum",
      table: "case_attachments",
      field: "file_size",
    },
    auditInfo: {
      formula: "SUM(case_attachments.file_size)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Subject Attachment Metrics =============
  {
    id: "attachments.subject_attachment_count",
    name: "Subject Attachments",
    description: "Total number of files attached to subjects",
    category: "storage",
    dataType: "count",
    unit: "count",
    sourceTable: "subject_attachments",
    calculation: {
      type: "simple_count",
      table: "subject_attachments",
    },
    auditInfo: {
      formula: "COUNT(subject_attachments)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "attachments.subject_storage_bytes",
    name: "Subject Storage",
    description: "Total storage used by subject attachments",
    category: "storage",
    dataType: "sum",
    unit: "bytes",
    sourceTable: "subject_attachments",
    calculation: {
      type: "sum",
      table: "subject_attachments",
      field: "file_size",
    },
    auditInfo: {
      formula: "SUM(subject_attachments.file_size)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= Combined Metrics =============
  {
    id: "attachments.total_count",
    name: "Total Attachments",
    description: "Total number of files (case + subject attachments)",
    category: "storage",
    dataType: "count",
    unit: "count",
    sourceTable: "case_attachments",
    calculation: {
      type: "composite",
      expression: "attachments.case_attachment_count + attachments.subject_attachment_count",
      dependencies: ["attachments.case_attachment_count", "attachments.subject_attachment_count"],
    },
    auditInfo: {
      formula: "COUNT(case_attachments) + COUNT(subject_attachments)",
      dependencies: ["attachments.case_attachment_count", "attachments.subject_attachment_count"],
      dataFreshness: "realtime",
    },
  },
  {
    id: "attachments.total_storage_bytes",
    name: "Total Storage",
    description: "Total storage used by all attachments",
    category: "storage",
    dataType: "sum",
    unit: "bytes",
    sourceTable: "case_attachments",
    calculation: {
      type: "composite",
      expression: "attachments.case_storage_bytes + attachments.subject_storage_bytes",
      dependencies: ["attachments.case_storage_bytes", "attachments.subject_storage_bytes"],
    },
    auditInfo: {
      formula: "SUM(case_attachments.file_size) + SUM(subject_attachments.file_size)",
      dependencies: ["attachments.case_storage_bytes", "attachments.subject_storage_bytes"],
      dataFreshness: "realtime",
    },
  },

  // ============= Average Metrics =============
  {
    id: "attachments.avg_per_case",
    name: "Avg Attachments per Case",
    description: "Average number of attachments per case",
    category: "storage",
    dataType: "ratio",
    unit: "count",
    sourceTable: "case_attachments",
    calculation: {
      type: "ratio",
      numerator: { metricId: "attachments.case_attachment_count" },
      denominator: { metricId: "cases.total_count" },
      percentage: false,
    },
    auditInfo: {
      formula: "attachments.case_attachment_count / cases.total_count",
      dependencies: ["attachments.case_attachment_count", "cases.total_count"],
      dataFreshness: "realtime",
    },
  },
  {
    id: "attachments.avg_file_size",
    name: "Avg File Size",
    description: "Average file size of attachments",
    category: "storage",
    dataType: "average",
    unit: "bytes",
    sourceTable: "case_attachments",
    calculation: {
      type: "average",
      table: "case_attachments",
      field: "file_size",
    },
    auditInfo: {
      formula: "AVG(case_attachments.file_size)",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },

  // ============= File Type Metrics =============
  {
    id: "attachments.pdf_count",
    name: "PDF Files",
    description: "Number of PDF attachments",
    category: "storage",
    dataType: "count",
    unit: "count",
    sourceTable: "case_attachments",
    calculation: {
      type: "conditional_count",
      table: "case_attachments",
      conditions: [
        { field: "file_type", operator: "eq", value: "application/pdf" },
      ],
    },
    auditInfo: {
      formula: "COUNT(case_attachments WHERE file_type = 'application/pdf')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "attachments.image_count",
    name: "Image Files",
    description: "Number of image attachments",
    category: "storage",
    dataType: "count",
    unit: "count",
    sourceTable: "case_attachments",
    calculation: {
      type: "conditional_count",
      table: "case_attachments",
      conditions: [
        { field: "file_type", operator: "like", value: "image/%" },
      ],
    },
    auditInfo: {
      formula: "COUNT(case_attachments WHERE file_type LIKE 'image/%')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
  {
    id: "attachments.video_count",
    name: "Video Files",
    description: "Number of video attachments",
    category: "storage",
    dataType: "count",
    unit: "count",
    sourceTable: "case_attachments",
    calculation: {
      type: "conditional_count",
      table: "case_attachments",
      conditions: [
        { field: "file_type", operator: "like", value: "video/%" },
      ],
    },
    auditInfo: {
      formula: "COUNT(case_attachments WHERE file_type LIKE 'video/%')",
      dependencies: [],
      dataFreshness: "realtime",
    },
  },
];

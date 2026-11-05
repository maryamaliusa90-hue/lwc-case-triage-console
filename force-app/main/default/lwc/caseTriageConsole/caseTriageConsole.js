import { LightningElement, wire } from "lwc";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getOpenCases from "@salesforce/apex/CaseTriageController.getOpenCases";
import assignToMe from "@salesforce/apex/CaseTriageController.assignToMe";

const COLUMNS = [
  { label: "Case", fieldName: "CaseNumber", initialWidth: 110 },
  { label: "Subject", fieldName: "Subject" },
  { label: "Priority", fieldName: "Priority", initialWidth: 100 },
  { label: "Status", fieldName: "Status", initialWidth: 110 },
  { label: "Account", fieldName: "accountName" },
  { label: "Age (days)", fieldName: "ageDays", type: "number", initialWidth: 110 }
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function toRows(cases, now = Date.now()) {
  return (cases || []).map((c) => ({
    ...c,
    accountName: c.Account ? c.Account.Name : "",
    ageDays: Math.floor((now - new Date(c.CreatedDate).getTime()) / DAY_MS)
  }));
}

export default class CaseTriageConsole extends LightningElement {
  columns = COLUMNS;
  priority = "";
  rows = [];
  error;
  selectedIds = [];
  isLoaded = false;
  wiredResult;

  priorityOptions = [
    { label: "All priorities", value: "" },
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" }
  ];

  @wire(getOpenCases, { priority: "$priority", limitSize: 50 })
  wiredCases(result) {
    this.wiredResult = result;
    const { data, error } = result;
    if (data) {
      this.rows = toRows(data);
      this.error = undefined;
      this.isLoaded = true;
    } else if (error) {
      this.rows = [];
      this.error = reduceError(error);
      this.isLoaded = true;
    }
  }

  get hasCases() {
    return this.rows.length > 0;
  }

  get isEmpty() {
    return this.isLoaded && !this.error && this.rows.length === 0;
  }

  get isAssignDisabled() {
    return this.selectedIds.length === 0;
  }

  handlePriorityChange(event) {
    this.priority = event.detail.value;
    this.selectedIds = [];
  }

  handleRowSelection(event) {
    this.selectedIds = event.detail.selectedRows.map((r) => r.Id);
  }

  async handleAssign() {
    try {
      const count = await assignToMe({ caseIds: this.selectedIds });
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Cases assigned",
          message: `${count} case(s) assigned to you.`,
          variant: "success"
        })
      );
      this.selectedIds = [];
      await refreshApex(this.wiredResult);
    } catch (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Assignment failed",
          message: reduceError(error),
          variant: "error"
        })
      );
    }
  }
}

export function reduceError(error) {
  if (!error) return "Unknown error";
  if (Array.isArray(error.body)) return error.body.map((e) => e.message).join(", ");
  if (error.body && typeof error.body.message === "string") return error.body.message;
  if (typeof error.message === "string") return error.message;
  return "Unknown error";
}

import { createElement } from "lwc";
import CaseTriageConsole, { toRows, reduceError } from "c/caseTriageConsole";
import getOpenCases from "@salesforce/apex/CaseTriageController.getOpenCases";
import assignToMe from "@salesforce/apex/CaseTriageController.assignToMe";
const ShowToastEventName = "lightning__showtoast";

const mockCases = require("./data/openCases.json");

jest.mock(
  "@salesforce/apex/CaseTriageController.getOpenCases",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return { default: createApexTestWireAdapter(jest.fn()) };
  },
  { virtual: true }
);
jest.mock("@salesforce/apex/CaseTriageController.assignToMe", () => ({ default: jest.fn() }), {
  virtual: true
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function mount() {
  const el = createElement("c-case-triage-console", { is: CaseTriageConsole });
  document.body.appendChild(el);
  return el;
}

describe("c-case-triage-console", () => {
  afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    jest.clearAllMocks();
  });

  it("renders a row per open case", async () => {
    const el = mount();
    getOpenCases.emit(mockCases);
    await flush();
    const table = el.shadowRoot.querySelector("lightning-datatable");
    expect(table).not.toBeNull();
    expect(table.data).toHaveLength(2);
    expect(table.data[0].accountName).toBe("Demo Health Partners");
    expect(table.data[1].accountName).toBe("");
  });

  it("shows the empty state when no cases match", async () => {
    const el = mount();
    getOpenCases.emit([]);
    await flush();
    expect(el.shadowRoot.querySelector(".empty")).not.toBeNull();
    expect(el.shadowRoot.querySelector("lightning-datatable")).toBeNull();
  });

  it("shows a readable error when the wire fails", async () => {
    const el = mount();
    getOpenCases.error({ message: "Insufficient access" });
    await flush();
    const err = el.shadowRoot.querySelector(".error");
    expect(err.textContent).toBe("Insufficient access");
  });

  it("re-queries with the chosen priority", async () => {
    const el = mount();
    const combo = el.shadowRoot.querySelector(".priority-filter");
    combo.dispatchEvent(new CustomEvent("change", { detail: { value: "High" } }));
    await flush();
    expect(getOpenCases.getLastConfig()).toEqual({ priority: "High", limitSize: 50 });
  });

  it("assign button is disabled until rows are selected, then assigns and toasts", async () => {
    assignToMe.mockResolvedValue(1);
    const el = mount();
    getOpenCases.emit(mockCases);
    await flush();

    const button = el.shadowRoot.querySelector(".assign-button");
    expect(button.disabled).toBe(true);

    const table = el.shadowRoot.querySelector("lightning-datatable");
    table.dispatchEvent(new CustomEvent("rowselection", { detail: { selectedRows: [mockCases[0]] } }));
    await flush();
    expect(button.disabled).toBe(false);

    const toastHandler = jest.fn();
    el.addEventListener(ShowToastEventName, toastHandler);
    button.click();
    await flush();

    expect(assignToMe).toHaveBeenCalledWith({ caseIds: ["500000000000001AAA"] });
    expect(toastHandler).toHaveBeenCalled();
    expect(toastHandler.mock.calls[0][0].detail.variant).toBe("success");
  });

  it("shows an error toast when assignment fails", async () => {
    assignToMe.mockRejectedValue({ body: { message: "Record locked" } });
    const el = mount();
    getOpenCases.emit(mockCases);
    await flush();
    el.shadowRoot
      .querySelector("lightning-datatable")
      .dispatchEvent(new CustomEvent("rowselection", { detail: { selectedRows: [mockCases[1]] } }));
    await flush();

    const toastHandler = jest.fn();
    el.addEventListener(ShowToastEventName, toastHandler);
    el.shadowRoot.querySelector(".assign-button").click();
    await flush();

    expect(toastHandler.mock.calls[0][0].detail.variant).toBe("error");
    expect(toastHandler.mock.calls[0][0].detail.message).toBe("Record locked");
  });
});

describe("helpers", () => {
  it("toRows computes age in whole days", () => {
    const now = new Date("2026-10-11T10:00:00.000Z").getTime();
    expect(toRows(mockCases, now)[0].ageDays).toBe(10);
  });

  it("reduceError handles the common Salesforce error shapes", () => {
    expect(reduceError({ body: [{ message: "a" }, { message: "b" }] })).toBe("a, b");
    expect(reduceError({ body: { message: "c" } })).toBe("c");
    expect(reduceError(new Error("d"))).toBe("d");
    expect(reduceError(null)).toBe("Unknown error");
  });
});

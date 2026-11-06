import { describe, expect, it } from "vitest";
import { desktopNotification } from "@/lib/reminders";

describe("desktopNotification", () => {
  it("requests an audible Windows toast", () => {
    expect(desktopNotification("Task", "Due at 09:30")).toEqual({
      title: "Task",
      body: "Due at 09:30",
      sound: "Default",
    });
  });
});

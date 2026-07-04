import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InsightCard } from "../insight-card";
import type { Insight } from "@/shared/insight-engine/types";

const INSIGHT: Insight = {
  id: "todays-mission",
  category: "TODAYS_MISSION",
  priority: "HIGH",
  title: "Today you should spend approximately 42 minutes reviewing Dynamic Programming.",
  reasons: ["Confidence decreased after the latest assessment", "Last reviewed 6 days ago"],
  rulesTriggered: ["todays-mission/top-recommendation"],
};

describe("InsightCard", () => {
  it("renders the title, priority badge, and reasons accessibly", () => {
    render(<InsightCard insight={INSIGHT} />);

    expect(screen.getByRole("article", { name: "Today's Mission" })).toBeInTheDocument();
    expect(screen.getByText(INSIGHT.title)).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    for (const reason of INSIGHT.reasons) {
      expect(screen.getByText(reason)).toBeInTheDocument();
    }
  });

  it("omits the reasons list when there are none", () => {
    render(<InsightCard insight={{ ...INSIGHT, reasons: [] }} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

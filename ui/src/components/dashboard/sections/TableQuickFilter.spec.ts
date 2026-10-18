import {describe, expect, it} from "vitest"
import {i18nMount} from "../../../../tests/unit/i18nMount"
import TableQuickFilter from "./TableQuickFilter.vue"
import {QUICK_FILTER_TABS, stateFilterForTab} from "./quickFilters"
import type {Chart} from "../types.ts"

const EXECUTIONS = "io.kestra.plugin.core.dashboard.data.Executions"

const executionsChart = (where?: unknown): Chart => ({
    id: "executions",
    type: "io.kestra.plugin.core.dashboard.chart.Table",
    data: {
        type: EXECUTIONS,
        columns: {state: {field: "STATE"}},
        ...(where ? {where} : {}),
    },
}) as unknown as Chart

const chartWithoutQuickFilters: Chart = {
    id: "logs",
    type: "io.kestra.plugin.core.dashboard.chart.Table",
    data: {
        type: "io.kestra.plugin.core.dashboard.data.Logs",
        columns: {message: {field: "MESSAGE"}},
    },
} as unknown as Chart

describe("TableQuickFilter.vue", () => {
    const stubs = {
        Motion: {
            name: "Motion",
            template: "<span class=\"tab-indicator\"><slot /></span>",
        },
    }

    function mountFilter(chart: Chart) {
        return i18nMount(TableQuickFilter, {
            props: {chart},
            global: {stubs},
        })
    }

    it("nothing renders for a chart with no quick filters", () => {
        const wrapper = mountFilter(chartWithoutQuickFilters)
        expect(wrapper.findAll("button.quick-filter-tab")).toHaveLength(0)
        expect(wrapper.find(".quick-filters").element.children).toHaveLength(0)
    })

    it("one tab renders per entry of QUICK_FILTER_TABS when it does", () => {
        const wrapper = mountFilter(executionsChart())
        const buttons = wrapper.findAll("button.quick-filter-tab")
        expect(buttons).toHaveLength(QUICK_FILTER_TABS.length)

        QUICK_FILTER_TABS.forEach((tab, index) => {
            expect(buttons[index].attributes("style")).toContain(tab.token)
        })
    })

    it("the first tab is active by default", () => {
        const wrapper = mountFilter(executionsChart())
        const buttons = wrapper.findAll("button.quick-filter-tab")

        expect(buttons[0].classes()).toContain("active")
        for (let i = 1; i < buttons.length; i++) {
            expect(buttons[i].classes()).not.toContain("active")
        }
    })

    it("clicking another tab emits change with that tab's state filter and key", async () => {
        const chart = executionsChart()
        const wrapper = mountFilter(chart)
        const buttons = wrapper.findAll("button.quick-filter-tab")

        // Click the second tab (running)
        await buttons[1].trigger("click")

        const emitted = wrapper.emitted("change")
        expect(emitted).toBeDefined()
        expect(emitted).toHaveLength(1)
        expect(emitted![0]).toEqual([
            stateFilterForTab(chart, "running"),
            "running",
        ])
    })

    it("clicking the active tab emits nothing", async () => {
        const chart = executionsChart()
        const wrapper = mountFilter(chart)
        const buttons = wrapper.findAll("button.quick-filter-tab")

        // First tab is already active by default: click it
        await buttons[0].trigger("click")
        expect(wrapper.emitted("change")).toBeUndefined()

        // Switch to third tab (paused)
        await buttons[2].trigger("click")
        expect(wrapper.emitted("change")).toHaveLength(1)

        // Click paused again while it is active: should emit nothing new
        await buttons[2].trigger("click")
        expect(wrapper.emitted("change")).toHaveLength(1)
    })

    it("the active tab carries the active class and the indicator", async () => {
        const wrapper = mountFilter(executionsChart())
        const buttons = wrapper.findAll("button.quick-filter-tab")

        // Initially: tab 0 has active class and tab-indicator
        expect(buttons[0].classes()).toContain("active")
        expect(buttons[0].find(".tab-indicator").exists()).toBe(true)

        // Inactive tabs do not have active class or tab-indicator
        for (let i = 1; i < buttons.length; i++) {
            expect(buttons[i].classes()).not.toContain("active")
            expect(buttons[i].find(".tab-indicator").exists()).toBe(false)
        }

        // Switch to tab 3 (success)
        await buttons[3].trigger("click")

        expect(buttons[3].classes()).toContain("active")
        expect(buttons[3].find(".tab-indicator").exists()).toBe(true)

        // Previous active tab no longer has active class or indicator
        expect(buttons[0].classes()).not.toContain("active")
        expect(buttons[0].find(".tab-indicator").exists()).toBe(false)
    })
})

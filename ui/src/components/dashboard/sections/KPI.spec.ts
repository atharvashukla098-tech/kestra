import {beforeEach, describe, expect, it, vi} from "vitest"
import {mount} from "@vue/test-utils"
import {nextTick, reactive, ref} from "vue"
import KPI from "./KPI.vue"
import {KsProgress, KsSkeleton} from "@kestra-io/design-system"
import type {Chart, ChartResults} from "../types"

const mockPercentageShown = ref(false)
const mockData = ref<ChartResults | undefined>(undefined)
const mockLoading = ref(false)
const mockGenerate = vi.fn().mockResolvedValue(undefined)

vi.mock("../composables/useDashboards", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../composables/useDashboards")>()
    return {
        ...actual,
        useChartGenerator: vi.fn(() => ({
            percentageShown: mockPercentageShown,
            data: mockData,
            loading: mockLoading,
            generate: mockGenerate,
        })),
    }
})

const mockRouteParams = reactive<{filters?: unknown}>({filters: undefined})

vi.mock("vue-router", () => ({
    useRoute: () => ({
        params: mockRouteParams,
        query: {},
    }),
}))

vi.mock("../../../composables/useTheme", () => ({
    useTheme: () => ref("light"),
}))

const baseChart: Chart = {
    id: "kpi-chart",
    type: "io.kestra.plugin.core.dashboard.chart.KPI",
    chartOptions: {
        displayName: "Active Executions",
        description: "Total currently running executions",
    },
}

function mountKPI(props: {chart: Chart} = {chart: baseChart}) {
    return mount(KPI, {
        props,
        global: {
            stubs: {
                KsNoData: true,
            },
        },
    })
}

describe("KPI.vue", () => {
    beforeEach(() => {
        mockPercentageShown.value = false
        mockData.value = undefined
        mockLoading.value = false
        mockGenerate.mockClear()
        mockRouteParams.filters = undefined
    })

    it("renders a skeleton while loading with no data yet", () => {
        mockLoading.value = true
        mockData.value = undefined

        const wrapper = mountKPI()

        expect(wrapper.findComponent(KsSkeleton).exists()).toBe(true)
        expect(wrapper.find(".kpi").exists()).toBe(false)
    })

    it("renders the value, title, and description once data arrives", () => {
        mockLoading.value = false
        mockData.value = {results: [{value: 42}]}

        const wrapper = mountKPI()

        expect(wrapper.findComponent(KsSkeleton).exists()).toBe(false)
        expect(wrapper.find(".kpi").exists()).toBe(true)
        expect(wrapper.find(".title").text()).toBe("Active Executions")
        expect(wrapper.find(".value").text()).toBe("42")
        expect(wrapper.find(".description").text()).toBe("Total currently running executions")
    })

    it("shows the percent sign only when the chart is a percentage", async () => {
        mockLoading.value = false
        mockData.value = {results: [{value: 75}]}

        mockPercentageShown.value = false
        const wrapper = mountKPI()
        expect(wrapper.find(".percent").exists()).toBe(false)
        expect(wrapper.find(".value").text()).toBe("75")

        mockPercentageShown.value = true
        await nextTick()

        expect(wrapper.find(".percent").exists()).toBe(true)
        expect(wrapper.find(".percent").text()).toBe("%")
        expect(wrapper.find(".value").text()).toBe("75%")
    })

    it("renders the progress bar only when a percentage and above zero", () => {
        mockLoading.value = false

        // Not a percentage, value 50 -> no progress bar
        mockPercentageShown.value = false
        mockData.value = {results: [{value: 50}]}
        const wrapperNonPercent = mountKPI()
        expect(wrapperNonPercent.findComponent(KsProgress).exists()).toBe(false)

        // Percentage, but value 0 -> no progress bar
        mockPercentageShown.value = true
        mockData.value = {results: [{value: 0}]}
        const wrapperZero = mountKPI()
        expect(wrapperZero.findComponent(KsProgress).exists()).toBe(false)

        // Percentage and above zero -> progress bar renders
        mockData.value = {results: [{value: 50}]}
        const wrapperActive = mountKPI()
        const progress = wrapperActive.findComponent(KsProgress)
        expect(progress.exists()).toBe(true)
        expect(progress.props("percentage")).toBe(50)
    })

    it("clamps a value above 100 to 100 and a negative one to 0", () => {
        mockLoading.value = false
        mockPercentageShown.value = true

        // Value above 100
        mockData.value = {results: [{value: 140}]}
        const wrapperAbove = mountKPI()
        expect(wrapperAbove.findComponent(KsProgress).props("percentage")).toBe(100)

        // Negative value (clamped to 0, so progress bar is hidden because progressValue > 0 is false)
        mockData.value = {results: [{value: -20}]}
        const wrapperNegative = mountKPI()
        expect(wrapperNegative.findComponent(KsProgress).exists()).toBe(false)
    })

    it("yields 0 rather than NaN for non-numeric values", () => {
        mockLoading.value = false
        mockPercentageShown.value = true
        mockData.value = {results: [{value: "invalid-string"}]}

        const wrapper = mountKPI()

        // Since progressValue defaults to 0 on non-finite, progress bar is not rendered
        expect(wrapper.findComponent(KsProgress).exists()).toBe(false)
        expect(wrapper.find(".value").text()).toBe("invalid-string%")
    })

    it("triggers a regenerate when the exposed refresh function is called", () => {
        mockLoading.value = false
        mockData.value = {results: [{value: 10}]}

        const wrapper = mountKPI()
        mockGenerate.mockClear()

        wrapper.vm.refresh()
        expect(mockGenerate).toHaveBeenCalledTimes(1)
    })

    it("triggers a refresh when route filters change", async () => {
        mockLoading.value = false
        mockData.value = {results: [{value: 10}]}

        mountKPI()
        mockGenerate.mockClear()

        mockRouteParams.filters = ["namespace:prod"]
        await nextTick()

        expect(mockGenerate).toHaveBeenCalledTimes(1)
    })
})

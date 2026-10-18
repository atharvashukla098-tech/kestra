import {beforeEach, describe, expect, test, vi} from "vitest"
import {nextTick, reactive} from "vue"
import {useDataOptions} from "./useDataOptions"
import type {TableOptions} from "../utils/filterTypes"

describe("useDataOptions", () => {
    beforeEach(() => {
        localStorage.clear()
    })

    describe("showOptions", () => {
        test("reads the stored filterDataOptions value, defaulting to false", () => {
            expect(localStorage.getItem("filterDataOptions")).toBeNull()

            const options = useDataOptions({})
            expect(options.showOptions.value).toBe(false)

            localStorage.setItem("filterDataOptions", "true")
            const optionsTrue = useDataOptions({})
            expect(optionsTrue.showOptions.value).toBe(true)
        })

        test("the stored value is compared case-insensitively", () => {
            localStorage.setItem("filterDataOptions", "TRUE")
            expect(useDataOptions({}).showOptions.value).toBe(true)

            localStorage.setItem("filterDataOptions", "TrUe")
            expect(useDataOptions({}).showOptions.value).toBe(true)

            localStorage.setItem("filterDataOptions", "FaLsE")
            expect(useDataOptions({}).showOptions.value).toBe(false)
        })

        test("toggleOptions flips it and writes it back", () => {
            const {showOptions, toggleOptions} = useDataOptions({})
            expect(showOptions.value).toBe(false)

            toggleOptions()
            expect(showOptions.value).toBe(true)
            expect(localStorage.getItem("filterDataOptions")).toBe("true")

            toggleOptions()
            expect(showOptions.value).toBe(false)
            expect(localStorage.getItem("filterDataOptions")).toBe("false")
        })
    })

    describe("chartVisible", () => {
        test("starts from options.chart.value, defaulting to true when absent", () => {
            expect(useDataOptions({}).chartVisible.value).toBe(true)
            expect(useDataOptions({chart: {}}).chartVisible.value).toBe(true)
            expect(useDataOptions({chart: {value: true}}).chartVisible.value).toBe(true)
            expect(useDataOptions({chart: {value: false}}).chartVisible.value).toBe(false)
        })

        test("an external change to options.chart.value updates chartVisible", async () => {
            const tableOptions: TableOptions = reactive({
                chart: {
                    value: true,
                },
            })

            const {chartVisible} = useDataOptions(tableOptions)
            expect(chartVisible.value).toBe(true)

            tableOptions.chart!.value = false
            await nextTick()

            expect(chartVisible.value).toBe(false)
        })

        test("an external change to undefined is ignored rather than blanking the flag", async () => {
            const tableOptions: TableOptions = reactive({
                chart: {
                    value: false,
                },
            })

            const {chartVisible} = useDataOptions(tableOptions)
            expect(chartVisible.value).toBe(false)

            tableOptions.chart!.value = undefined
            await nextTick()

            expect(chartVisible.value).toBe(false)
        })

        test("updateChart sets the flag and calls the chart callback", () => {
            const callback = vi.fn()
            const {chartVisible, updateChart} = useDataOptions({
                chart: {
                    value: true,
                    callback,
                },
            })

            expect(chartVisible.value).toBe(true)

            updateChart(false)
            expect(chartVisible.value).toBe(false)
            expect(callback).toHaveBeenCalledWith(false)

            updateChart(true)
            expect(chartVisible.value).toBe(true)
            expect(callback).toHaveBeenCalledWith(true)
        })
    })

    describe("refreshData", () => {
        test("calls the refresh callback, and does nothing when none was supplied", () => {
            const callback = vi.fn()
            const withCallback = useDataOptions({
                refresh: {
                    callback,
                },
            })

            withCallback.refreshData()
            expect(callback).toHaveBeenCalledTimes(1)

            const withoutCallback = useDataOptions({})
            expect(() => withoutCallback.refreshData()).not.toThrow()
        })
    })
})

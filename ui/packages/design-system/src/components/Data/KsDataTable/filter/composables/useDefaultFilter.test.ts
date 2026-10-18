import {afterEach, beforeEach, describe, expect, test, vi} from "vitest"
import {createApp, defineComponent, h, nextTick} from "vue"
import type {App} from "vue"
import {applyDefaultFilters, defaultNamespace, useDefaultFilter} from "./useDefaultFilter"

const mockRoute = {
    name: "executions",
    path: "/executions",
    params: {tenant: "my-tenant", tab: "overview"},
    query: {},
}

const mockRouter = {
    replace: vi.fn(),
}

vi.mock("vue-router", () => ({
    useRoute: () => mockRoute,
    useRouter: () => mockRouter,
}))

let apps: App[] = []

const mountComposable = (setup: () => unknown) => {
    let result: unknown
    const app = createApp(
        defineComponent({
            setup() {
                result = setup()
                return () => h("div")
            },
        }),
    )
    app.mount(document.createElement("div"))
    apps.push(app)
    return result
}

beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    mockRoute.query = {}
    mockRouter.replace.mockClear()
    apps = []
})

afterEach(() => {
    apps.forEach((app) => app.unmount())
    localStorage.clear()
    sessionStorage.clear()
})

describe("applyDefaultFilters", () => {
    test("defaults are applied when nothing is set", () => {
        localStorage.setItem("defaultNamespace", "company.analytics")

        const result = applyDefaultFilters({}, {
            includeScope: true,
            includeTimeRange: true,
            defaultDuration: "P7D",
        })

        expect(result.change).toBe(true)
        expect(result.query["filters[namespace][PREFIX]"]).toBe("company.analytics")
        expect(result.query["filters[scope][EQUALS]"]).toBe("USER")
        expect(result.query["filters[timeRange][EQUALS]"]).toBe("P7D")
    })

    test("falls back to PT24H when defaultDuration is not provided", () => {
        const result = applyDefaultFilters({}, {
            namespace: null,
            includeTimeRange: true,
        })

        expect(result.change).toBe(true)
        expect(result.query["filters[timeRange][EQUALS]"]).toBe("PT24H")
    })

    test("an existing filter for the same field is not overwritten by its default", () => {
        localStorage.setItem("defaultNamespace", "default.namespace")

        const initialQuery = {
            "filters[namespace][EQUALS]": "custom.namespace",
            "filters[timeRange][EQUALS]": "PT1H",
            "filters[scope][EQUALS]": "ALL",
        }

        const result = applyDefaultFilters(initialQuery, {
            includeScope: true,
            includeTimeRange: true,
            defaultDuration: "P7D",
        })

        expect(result.change).toBe(false)
        expect(result.query["filters[namespace][EQUALS]"]).toBe("custom.namespace")
        expect(result.query["filters[namespace][PREFIX]"]).toBeUndefined()
        expect(result.query["filters[timeRange][EQUALS]"]).toBe("PT1H")
        expect(result.query["filters[scope][EQUALS]"]).toBe("ALL")
    })

    test("an existing startDate filter prevents timeRange default from being applied", () => {
        const initialQuery = {
            "filters[startDate][GTE]": "2026-01-01T00:00:00.000Z",
        }

        const result = applyDefaultFilters(initialQuery, {
            namespace: null,
            includeTimeRange: true,
        })

        expect(result.change).toBe(false)
        expect(result.query["filters[timeRange][EQUALS]"]).toBeUndefined()
        expect(result.query["filters[startDate][GTE]"]).toBe("2026-01-01T00:00:00.000Z")
    })

    test("defaults for other fields are still applied alongside an existing filter", () => {
        localStorage.setItem("defaultNamespace", "company.data")

        const initialQuery = {
            "filters[state][IN]": "FAILED",
        }

        const result = applyDefaultFilters(initialQuery, {
            includeScope: true,
            includeTimeRange: true,
        })

        expect(result.change).toBe(true)
        expect(result.query["filters[state][IN]"]).toBe("FAILED")
        expect(result.query["filters[namespace][PREFIX]"]).toBe("company.data")
        expect(result.query["filters[scope][EQUALS]"]).toBe("USER")
        expect(result.query["filters[timeRange][EQUALS]"]).toBe("PT24H")
    })

    test("an empty default configuration leaves the filters untouched", () => {
        const initialQuery = {
            "customParam": "value123",
        }

        const result = applyDefaultFilters(initialQuery, {
            namespace: null,
            includeScope: false,
            includeTimeRange: false,
        })

        expect(result.change).toBe(false)
        expect(result.query).toEqual(initialQuery)
    })

    test("applyDefaultFilters returns a new object rather than mutating the one it was given", () => {
        const initialQuery = {
            "existingField": "testValue",
        }

        const result = applyDefaultFilters(initialQuery, {
            includeTimeRange: true,
        })

        expect(result.query).not.toBe(initialQuery)
        expect(initialQuery).toEqual({"existingField": "testValue"})
        expect(result.query).toHaveProperty("filters[timeRange][EQUALS]", "PT24H")
    })

    test("strips scope filter when includeScope is false", () => {
        const initialQuery = {
            "filters[scope][EQUALS]": "USER",
            "other": "val",
        }

        const result = applyDefaultFilters(initialQuery, {
            namespace: null,
            includeScope: false,
        })

        expect(result.change).toBe(true)
        expect(result.query["filters[scope][EQUALS]"]).toBeUndefined()
        expect(result.query.other).toBe("val")
    })

    test("defaultNamespace reads from localStorage", () => {
        expect(defaultNamespace()).toBeNull()
        localStorage.setItem("defaultNamespace", "prod.team")
        expect(defaultNamespace()).toBe("prod.team")
    })
})

describe("useDefaultFilter", () => {
    test("replaces route query on mount when defaults are applied", async () => {
        localStorage.setItem("defaultNamespace", "my.namespace")

        mountComposable(() => useDefaultFilter({
            includeTimeRange: true,
        }))

        await nextTick()
        await nextTick()

        expect(mockRouter.replace).toHaveBeenCalledTimes(1)
        expect(mockRouter.replace).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.objectContaining({
                    "filters[namespace][PREFIX]": "my.namespace",
                    "filters[timeRange][EQUALS]": "PT24H",
                }),
            }),
        )
    })

    test("resetDefaultFilter resets query to freshly applied defaults", () => {
        localStorage.setItem("defaultNamespace", "fresh.namespace")

        const composable = mountComposable(() => useDefaultFilter({
            includeTimeRange: true,
        })) as ReturnType<typeof useDefaultFilter>

        mockRouter.replace.mockClear()
        composable.resetDefaultFilter()

        expect(mockRouter.replace).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.objectContaining({
                    "filters[namespace][PREFIX]": "fresh.namespace",
                    "filters[timeRange][EQUALS]": "PT24H",
                }),
            }),
        )
    })
})

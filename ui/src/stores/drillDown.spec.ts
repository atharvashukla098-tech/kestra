import {beforeEach, describe, expect, it} from "vitest"
import {createPinia, setActivePinia} from "pinia"
import {type DrillDownTarget, useDrillDownStore} from "./drillDown"

describe("drillDown store", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("starts with isOpen as false and target as null", () => {
        const store = useDrillDownStore()
        expect(store.isOpen).toBe(false)
        expect(store.target).toBeNull()
    })

    it("stores the target and sets isOpen to true on open", () => {
        const store = useDrillDownStore()
        const target: DrillDownTarget = {
            name: "flows/list",
            query: {namespace: "company.team"},
            timeFiltered: false,
        }

        store.open(target)

        expect(store.isOpen).toBe(true)
        expect(store.target).toEqual(target)
    })

    it("clears isOpen on close while preserving target so reopening does not flash empty", () => {
        const store = useDrillDownStore()
        const target: DrillDownTarget = {
            name: "executions/list",
            query: {state: "FAILED"},
            timeFiltered: true,
        }

        store.open(target)
        expect(store.isOpen).toBe(true)

        store.close()
        expect(store.isOpen).toBe(false)
        expect(store.target).toEqual(target)
    })

    it("replaces the previous target when open is called twice", () => {
        const store = useDrillDownStore()
        const firstTarget: DrillDownTarget = {
            name: "flows/list",
            query: {q: "first"},
            timeFiltered: false,
        }
        const secondTarget: DrillDownTarget = {
            name: "logs/list",
            query: {q: "second"},
            timeFiltered: true,
        }

        store.open(firstTarget)
        expect(store.target).toEqual(firstTarget)

        store.open(secondTarget)
        expect(store.target).toEqual(secondTarget)
        expect(store.isOpen).toBe(true)
    })

    it("keeps query, timeFiltered and timeWindow fields intact", () => {
        const store = useDrillDownStore()
        const fullTarget: DrillDownTarget = {
            name: "executions/list",
            query: {
                namespace: "prod",
                state: ["FAILED", "WARNING"],
            },
            timeFiltered: true,
            timeWindow: {
                startDate: "2026-10-01T00:00:00Z",
                endDate: "2026-10-18T23:59:59Z",
            },
        }

        store.open(fullTarget)

        expect(store.target?.name).toBe("executions/list")
        expect(store.target?.query).toEqual({
            namespace: "prod",
            state: ["FAILED", "WARNING"],
        })
        expect(store.target?.timeFiltered).toBe(true)
        expect(store.target?.timeWindow).toEqual({
            startDate: "2026-10-01T00:00:00Z",
            endDate: "2026-10-18T23:59:59Z",
        })
    })
})

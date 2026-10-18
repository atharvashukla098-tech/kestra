import {describe, test, expect} from "vitest"
import {
    Comparators,
    COMPARATOR_DESCRIPTIONS,
    COMPARATOR_LABELS,
    flipLogical,
    isLeafGroup,
    isWrapperGroup,
    KV_COMPARATORS,
    NULL_COMPARATORS,
    RANGE_COMPARATORS,
    TEXT_COMPARATORS,
    type FilterGroup,
    type LeafFilterGroup,
    type WrapperGroup,
} from "./filterTypes"

describe("flipLogical", () => {
    test("turns AND into OR and OR into AND", () => {
        expect(flipLogical("AND")).toBe("OR")
        expect(flipLogical("OR")).toBe("AND")
    })

    test("is its own inverse", () => {
        expect(flipLogical(flipLogical("AND"))).toBe("AND")
        expect(flipLogical(flipLogical("OR"))).toBe("OR")
    })
})

describe("comparator tables", () => {
    const allTables = [
        {name: "TEXT_COMPARATORS", list: TEXT_COMPARATORS},
        {name: "RANGE_COMPARATORS", list: RANGE_COMPARATORS},
        {name: "KV_COMPARATORS", list: KV_COMPARATORS},
        {name: "NULL_COMPARATORS", list: NULL_COMPARATORS},
    ]

    test("no table contains a duplicate entry", () => {
        for (const {name, list} of allTables) {
            const unique = new Set(list)
            expect(unique.size, `${name} has duplicate comparators`).toBe(list.length)
        }
    })

    test("the four comparator sets do not accidentally overlap where they are meant to be distinct", () => {
        for (let i = 0; i < allTables.length; i++) {
            for (let j = i + 1; j < allTables.length; j++) {
                const first = allTables[i]
                const second = allTables[j]
                const overlap = first.list.filter((comp) => second.list.includes(comp))
                expect(
                    overlap,
                    `${first.name} and ${second.name} should not overlap, but shared: ${overlap.join(", ")}`,
                ).toEqual([])
            }
        }
    })

    test("every comparator in TEXT_COMPARATORS, RANGE_COMPARATORS, KV_COMPARATORS and NULL_COMPARATORS has an entry in COMPARATOR_LABELS", () => {
        for (const {list} of allTables) {
            for (const comparator of list) {
                expect(COMPARATOR_LABELS[comparator]).toBeDefined()
                expect(typeof COMPARATOR_LABELS[comparator]).toBe("string")
                expect(COMPARATOR_LABELS[comparator].length).toBeGreaterThan(0)
            }
        }
    })

    test("every comparator with a label also has a COMPARATOR_DESCRIPTIONS entry", () => {
        for (const [comparatorKey, label] of Object.entries(COMPARATOR_LABELS)) {
            const comparator = comparatorKey as Comparators
            expect(label.length).toBeGreaterThan(0)
            expect(COMPARATOR_DESCRIPTIONS[comparator]).toBeDefined()
            expect(typeof COMPARATOR_DESCRIPTIONS[comparator]).toBe("string")
            expect(COMPARATOR_DESCRIPTIONS[comparator].length).toBeGreaterThan(0)
        }
    })
})

describe("group type guards", () => {
    test("identifies wrapper groups correctly", () => {
        const wrapper: WrapperGroup = {
            id: "wrap-1",
            kind: "wrapper",
            logical: "AND",
            children: [],
        }
        const leaf: LeafFilterGroup = {
            id: "leaf-1",
            kind: "leaf",
            filters: [],
        }
        const implicitLeaf: FilterGroup = {
            id: "leaf-2",
            filters: [],
        }

        expect(isWrapperGroup(wrapper)).toBe(true)
        expect(isWrapperGroup(leaf)).toBe(false)
        expect(isWrapperGroup(implicitLeaf)).toBe(false)

        expect(isLeafGroup(leaf)).toBe(true)
        expect(isLeafGroup(implicitLeaf)).toBe(true)
        expect(isLeafGroup(wrapper)).toBe(false)
    })
})

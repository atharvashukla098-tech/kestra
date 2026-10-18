import {beforeEach, describe, expect, it} from "vitest"
import {watch} from "vue"
import {createPinia, setActivePinia} from "pinia"
import type {KsBreadcrumbItem} from "@kestra-io/design-system"
import {useTopNavStore} from "./topNav"

describe("topNav store", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("defaults title to an empty string and breadcrumb to an empty list", () => {
        const store = useTopNavStore()
        expect(store.title).toBe("")
        expect(store.breadcrumb).toEqual([])
    })

    it("allows setting title and breadcrumb that are observable by a reader", () => {
        const store = useTopNavStore()
        const items: KsBreadcrumbItem[] = [
            {label: "Home", href: "/"},
            {label: "Executions", href: "/executions"},
        ]

        store.title = "Execution Details"
        store.breadcrumb = items

        expect(store.title).toBe("Execution Details")
        expect(store.breadcrumb).toEqual(items)
    })

    it("defaults bookmarkLabel and description to undefined and allows setting and clearing them", () => {
        const store = useTopNavStore()

        expect(store.bookmarkLabel).toBeUndefined()
        expect(store.description).toBeUndefined()

        store.bookmarkLabel = "Favorite Flow"
        store.description = "Production ETL pipeline"

        expect(store.bookmarkLabel).toBe("Favorite Flow")
        expect(store.description).toBe("Production ETL pipeline")

        store.bookmarkLabel = undefined
        store.description = undefined

        expect(store.bookmarkLabel).toBeUndefined()
        expect(store.description).toBeUndefined()
    })

    it("triggers watchers when breadcrumb array reference is replaced because it is a shallowRef", () => {
        const store = useTopNavStore()
        let observedCount = 0

        const stop = watch(
            () => store.breadcrumb,
            (items) => {
                observedCount = items.length
            },
            {flush: "sync"},
        )

        store.breadcrumb = [{label: "First"}]
        expect(observedCount).toBe(1)

        store.breadcrumb = [{label: "First"}, {label: "Second"}, {label: "Third"}]
        expect(observedCount).toBe(3)

        stop()
    })

    it("ensures two readers observe the exact same state", () => {
        const reader1 = useTopNavStore()
        const reader2 = useTopNavStore()

        reader1.title = "Global Title"
        expect(reader2.title).toBe("Global Title")

        reader2.description = "Global Description"
        expect(reader1.description).toBe("Global Description")

        const breadcrumbs: KsBreadcrumbItem[] = [{label: "Root"}]
        reader1.breadcrumb = breadcrumbs
        expect(reader2.breadcrumb).toBe(breadcrumbs)
    })
})

import {beforeEach, describe, expect, it, vi} from "vitest"
import {createPinia, setActivePinia} from "pinia"
import * as FlowsAPI from "@kestra-io/kestra-sdk/flows"
import {TUTORIAL_NAMESPACE} from "../utils/constants"
import {useCoreStore} from "./core"

vi.mock("@kestra-io/kestra-sdk/flows", () => ({
    listFlowsByNamespace: vi.fn(),
}))

describe("core store", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.mocked(FlowsAPI.listFlowsByNamespace).mockReset()
    })

    it("has the documented defaults for every piece of state", () => {
        const store = useCoreStore()
        expect(store.message).toBeUndefined()
        expect(store.error).toBeUndefined()
    })

    it("updates what a reader observes on each state update", async () => {
        const store = useCoreStore()

        store.message = {message: "Workflow executed", variant: "success"} as any
        expect(store.message).toEqual({message: "Workflow executed", variant: "success"})

        store.error = 404
        expect(store.error).toBe(404)

        store.error = "Internal Server Error"
        expect(store.error).toBe("Internal Server Error")

        // Test readTutorialFlows
        const sampleFlows = [{id: "tutorial-flow", namespace: TUTORIAL_NAMESPACE}]
        vi.mocked(FlowsAPI.listFlowsByNamespace).mockResolvedValue(sampleFlows as any)

        const result = await store.readTutorialFlows()
        expect(result).toEqual(sampleFlows)
        expect(FlowsAPI.listFlowsByNamespace).toHaveBeenCalledWith({namespace: TUTORIAL_NAMESPACE})
    })

    it("shares one instance across two consumers of the store", () => {
        const consumer1 = useCoreStore()
        const consumer2 = useCoreStore()

        consumer1.error = 500
        expect(consumer2.error).toBe(500)

        consumer2.message = {message: "Updated from consumer 2", variant: "error"} as any
        expect(consumer1.message).toEqual({message: "Updated from consumer 2", variant: "error"})
    })

    it("gives a clean instance when resetting between tests", () => {
        const store = useCoreStore()
        store.error = 503
        store.message = {message: "Temporary issue"} as any

        // Reset pinia as would happen between tests
        setActivePinia(createPinia())

        const cleanStore = useCoreStore()
        expect(cleanStore.error).toBeUndefined()
        expect(cleanStore.message).toBeUndefined()
    })
})

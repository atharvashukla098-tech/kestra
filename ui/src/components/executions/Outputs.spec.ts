import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {flushPromises} from "@vue/test-utils"
import {nextTick} from "vue"
import {i18nMount} from "../../../tests/unit/i18nMount"
import Outputs from "./Outputs.vue"
import Vars from "./Vars.vue"
import {KsDropdownItem} from "@kestra-io/design-system"

const mockOutputsState = vi.hoisted(() => ({
    hasOutputs: false,
    loadTaskRunOutputs: vi.fn(),
}))

vi.mock("../../composables/useTaskRunOutputs", async () => {
    const {ref} = await import("vue")
    return {
        useHasTaskRunOutputs: vi.fn(() => ref(mockOutputsState.hasOutputs)),
        loadTaskRunOutputs: (...args: unknown[]) => mockOutputsState.loadTaskRunOutputs(...args),
    }
})

describe("Outputs.vue", () => {
    const defaultProps = {
        executionId: "exec-123",
        taskRun: {
            id: "taskrun-456",
            state: {current: "SUCCESS"},
        },
        execution: {
            id: "exec-123",
            namespace: "io.kestra.tests",
            flowId: "outputs-flow",
        },
    }

    const stubs = {
        KsDropdownItem: {
            name: "KsDropdownItem",
            props: ["disabled", "icon"],
            emits: ["click"],
            template: "<button type=\"button\" class=\"ks-dropdown-item\" :disabled=\"disabled\" @click=\"!disabled && $emit('click', $event)\"><slot /></button>",
        },
        KsDrawer: {
            name: "KsDrawer",
            props: ["modelValue", "title"],
            emits: ["update:modelValue"],
            template: "<div v-if=\"modelValue\" data-test=\"drawer\"><slot /></div>",
        },
        Vars: {
            name: "Vars",
            props: ["execution", "data"],
            template: "<div data-test=\"vars\" :data-outputs=\"JSON.stringify(data)\" />",
        },
    }

    function mountOutputs(props = defaultProps) {
        return i18nMount(Outputs, {
            props,
            global: {stubs},
        })
    }

    beforeEach(() => {
        mockOutputsState.hasOutputs = false
        mockOutputsState.loadTaskRunOutputs.mockReset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("the control is disabled when the task run has no outputs", async () => {
        mockOutputsState.hasOutputs = false
        const wrapper = mountOutputs()

        const dropdownItem = wrapper.findComponent(KsDropdownItem)
        expect(dropdownItem.exists()).toBe(true)
        expect(dropdownItem.props("disabled")).toBe(true)

        await dropdownItem.trigger("click")
        await flushPromises()
        expect(wrapper.find("[data-test='drawer']").exists()).toBe(false)
        expect(mockOutputsState.loadTaskRunOutputs).not.toHaveBeenCalled()
    })

    it("it is enabled when outputs exist", () => {
        mockOutputsState.hasOutputs = true
        const wrapper = mountOutputs()

        const dropdownItem = wrapper.findComponent(KsDropdownItem)
        expect(dropdownItem.exists()).toBe(true)
        expect(dropdownItem.props("disabled")).toBe(false)
    })

    it("opening the panel loads the outputs once", async () => {
        mockOutputsState.hasOutputs = true
        mockOutputsState.loadTaskRunOutputs.mockResolvedValueOnce({result: "success"})

        const wrapper = mountOutputs()
        expect(mockOutputsState.loadTaskRunOutputs).not.toHaveBeenCalled()
        expect(wrapper.find("[data-test='drawer']").exists()).toBe(false)

        await wrapper.findComponent(KsDropdownItem).trigger("click")
        await flushPromises()

        expect(mockOutputsState.loadTaskRunOutputs).toHaveBeenCalledTimes(1)
        expect(mockOutputsState.loadTaskRunOutputs).toHaveBeenCalledWith("exec-123", "taskrun-456")
        expect(wrapper.find("[data-test='drawer']").exists()).toBe(true)
    })

    it("reopening does not fetch again", async () => {
        mockOutputsState.hasOutputs = true
        mockOutputsState.loadTaskRunOutputs.mockResolvedValueOnce({value: 42})

        const wrapper = mountOutputs()

        // Open drawer (first fetch)
        await wrapper.findComponent(KsDropdownItem).trigger("click")
        await flushPromises()
        expect(mockOutputsState.loadTaskRunOutputs).toHaveBeenCalledTimes(1)
        expect(wrapper.find("[data-test='drawer']").exists()).toBe(true)

        // Close drawer
        await wrapper.findComponent(KsDropdownItem).trigger("click")
        await nextTick()
        expect(wrapper.find("[data-test='drawer']").exists()).toBe(false)

        // Reopen drawer - outputs already cached in outputs.value
        await wrapper.findComponent(KsDropdownItem).trigger("click")
        await flushPromises()
        expect(wrapper.find("[data-test='drawer']").exists()).toBe(true)
        expect(mockOutputsState.loadTaskRunOutputs).toHaveBeenCalledTimes(1)
    })

    it("a loading state shows while the fetch is in flight", async () => {
        mockOutputsState.hasOutputs = true

        let resolvePromise!: (data: Record<string, unknown>) => void
        const pendingPromise = new Promise<Record<string, unknown>>((resolve) => {
            resolvePromise = resolve
        })
        mockOutputsState.loadTaskRunOutputs.mockReturnValueOnce(pendingPromise)

        const wrapper = mountOutputs()

        // Click to open
        await wrapper.findComponent(KsDropdownItem).trigger("click")
        await nextTick()

        // In flight: loading mask is rendered without display: none
        expect(wrapper.find("[data-test='drawer']").exists()).toBe(true)
        const maskInFlight = wrapper.find(".kel-loading-mask")
        expect(maskInFlight.exists()).toBe(true)
        expect(maskInFlight.attributes("style") ?? "").not.toContain("display: none")

        // Resolve fetch
        resolvePromise({done: true})
        await flushPromises()

        // Fetch complete: loading mask is hidden with display: none
        const maskComplete = wrapper.find(".kel-loading-mask")
        expect(maskComplete.exists()).toBe(true)
        expect(maskComplete.attributes("style")).toContain("display: none")
    })

    it("the loaded outputs are rendered", async () => {
        mockOutputsState.hasOutputs = true
        const expectedOutputs = {key1: "value1", counter: 100}
        mockOutputsState.loadTaskRunOutputs.mockResolvedValueOnce(expectedOutputs)

        const wrapper = mountOutputs()

        await wrapper.findComponent(KsDropdownItem).trigger("click")
        await flushPromises()

        const varsComponent = wrapper.findComponent(Vars)
        expect(varsComponent.exists()).toBe(true)
        expect(varsComponent.props("data")).toEqual(expectedOutputs)
    })
})

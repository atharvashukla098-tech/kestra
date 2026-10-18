import {describe, it, expect, vi, beforeEach} from "vitest"
import {createPinia, setActivePinia} from "pinia"
import {flushPromises} from "@vue/test-utils"
import {KsOption, KsSelect} from "@kestra-io/design-system"
import type {FlowWithSource} from "@kestra-io/kestra-sdk"
import TaskSubflowId from "./TaskSubflowId.vue"
import {useFlowStore} from "../../../../stores/flow"
import {i18nMount} from "../../../../../tests/unit/i18nMount"

describe("TaskSubflowId", () => {
    let flowStore: ReturnType<typeof useFlowStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        flowStore = useFlowStore()
        flowStore.flow = {
            id: "current-flow-id",
            namespace: "company.analytics",
        } as unknown as FlowWithSource

        flowStore.flowsByNamespace = vi.fn().mockImplementation(async (ns: string) => {
            if (ns === "company.analytics") {
                return [
                    {id: "flow-alpha"},
                    {id: "current-flow-id"},
                    {id: "flow-beta"},
                ]
            }
            if (ns === "company.external") {
                return [
                    {id: "ext-1"},
                    {id: "current-flow-id"},
                    {id: "ext-2"},
                ]
            }
            return []
        })
    })

    it("uses namespace from task.namespace when it is set", async () => {
        const wrapper = i18nMount(TaskSubflowId, {
            props: {
                task: {namespace: "company.external"},
            },
        })

        await flushPromises()

        expect(flowStore.flowsByNamespace).toHaveBeenCalledWith("company.external")
        const select = wrapper.findComponent(KsSelect)
        expect(select.props("disabled")).toBe(false)
    })

    it("falls back to the current flow's namespace when the task has none", async () => {
        const wrapper = i18nMount(TaskSubflowId, {
            props: {
                task: {},
            },
        })

        await flushPromises()

        expect(wrapper.exists()).toBe(true)
        expect(flowStore.flowsByNamespace).toHaveBeenCalledWith("company.analytics")
    })

    it("fetches nothing when neither task nor current flow yields a namespace", async () => {
        flowStore.flow = undefined

        const wrapper = i18nMount(TaskSubflowId, {
            props: {
                task: {},
            },
        })

        await flushPromises()

        expect(flowStore.flowsByNamespace).not.toHaveBeenCalled()
        const select = wrapper.findComponent(KsSelect)
        expect(select.props("disabled")).toBe(true)
        const options = wrapper.findAllComponents(KsOption)
        expect(options).toHaveLength(0)
    })

    it("offers the fetched flow ids as options", async () => {
        const wrapper = i18nMount(TaskSubflowId, {
            props: {
                task: {namespace: "company.external"},
            },
        })

        await flushPromises()

        const options = wrapper.findAllComponents(KsOption)
        const values = options.map((opt) => opt.props("value"))
        expect(values).toEqual(["ext-1", "current-flow-id", "ext-2"])
    })

    it("removes the current flow from the options when browsing its own namespace", async () => {
        const wrapper = i18nMount(TaskSubflowId, {
            props: {
                task: {namespace: "company.analytics"},
            },
        })

        await flushPromises()

        const options = wrapper.findAllComponents(KsOption)
        const values = options.map((opt) => opt.props("value"))
        expect(values).toEqual(["flow-alpha", "flow-beta"])
        expect(values).not.toContain("current-flow-id")
    })

    it("does not remove the current flow when browsing a different namespace", async () => {
        const wrapper = i18nMount(TaskSubflowId, {
            props: {
                task: {namespace: "company.external"},
            },
        })

        await flushPromises()

        const options = wrapper.findAllComponents(KsOption)
        const values = options.map((opt) => opt.props("value"))
        expect(values).toContain("current-flow-id")
    })

    it("uses the schema default when no modelValue is given", () => {
        const wrapper = i18nMount(TaskSubflowId, {
            props: {
                modelValue: undefined,
                schema: {default: "default-subflow"},
                task: {namespace: "company.analytics"},
            },
        })

        const select = wrapper.findComponent(KsSelect)
        expect(select.props("modelValue")).toBe("default-subflow")
    })

    it("prefers modelValue over schema default when modelValue is provided", () => {
        const wrapper = i18nMount(TaskSubflowId, {
            props: {
                modelValue: "custom-subflow",
                schema: {default: "default-subflow"},
                task: {namespace: "company.analytics"},
            },
        })

        const select = wrapper.findComponent(KsSelect)
        expect(select.props("modelValue")).toBe("custom-subflow")
    })

    it("choosing a flow emits update:modelValue with the collapsed value", async () => {
        const wrapper = i18nMount(TaskSubflowId, {
            props: {
                modelValue: undefined,
                task: {namespace: "company.external"},
            },
        })

        await flushPromises()

        const select = wrapper.findComponent(KsSelect)
        await select.vm.$emit("update:model-value", "ext-1")

        expect(wrapper.emitted("update:modelValue")).toHaveLength(1)
        expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["ext-1"])

        await select.vm.$emit("update:model-value", "")
        expect(wrapper.emitted("update:modelValue")?.[1]).toEqual([undefined])
    })
})

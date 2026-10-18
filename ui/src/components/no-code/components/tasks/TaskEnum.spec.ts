import {describe, it, expect, vi, beforeEach} from "vitest"
import {computed} from "vue"
import {createPinia, setActivePinia} from "pinia"
import {flushPromises} from "@vue/test-utils"
import {KsOption, KsSelect} from "@kestra-io/design-system"
import {useNamespacesStore} from "override/stores/namespaces"
import TaskEnum from "./TaskEnum.vue"
import TaskNamespace from "./TaskNamespace.vue"
import {
    CREATING_FLOW_INJECTION_KEY,
    DEFAULT_NAMESPACE_INJECTION_KEY,
} from "../../injectionKeys"
import {i18nMount} from "../../../../../tests/unit/i18nMount"

describe("TaskEnum", () => {
    it("renders one option per entry of the schema's enum", () => {
        const schema = {
            type: "string",
            enum: ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        }

        const wrapper = i18nMount(TaskEnum, {
            props: {
                schema,
                root: "level",
            },
        })

        const options = wrapper.findAllComponents(KsOption)
        expect(options).toHaveLength(5)
        expect(options.map((opt) => opt.props("value"))).toEqual([
            "DEBUG",
            "INFO",
            "WARNING",
            "ERROR",
            "CRITICAL",
        ])
    })

    it("preselects the current value when provided", () => {
        const schema = {
            type: "string",
            enum: ["DEBUG", "INFO", "WARNING"],
            default: "DEBUG",
        }

        const wrapper = i18nMount(TaskEnum, {
            props: {
                modelValue: "WARNING",
                schema,
            },
        })

        const select = wrapper.findComponent(KsSelect)
        expect(select.props("modelValue")).toBe("WARNING")
    })

    it("preselects the schema default when there is no modelValue", () => {
        const schema = {
            type: "string",
            enum: ["DEBUG", "INFO", "WARNING"],
            default: "INFO",
        }

        const wrapper = i18nMount(TaskEnum, {
            props: {
                modelValue: undefined,
                schema,
            },
        })

        const select = wrapper.findComponent(KsSelect)
        expect(select.props("modelValue")).toBe("INFO")
    })

    it("emits update:modelValue with the chosen option", async () => {
        const schema = {
            type: "string",
            enum: ["SMALL", "MEDIUM", "LARGE"],
        }

        const wrapper = i18nMount(TaskEnum, {
            props: {
                modelValue: "SMALL",
                schema,
            },
        })

        const select = wrapper.findComponent(KsSelect)
        await select.vm.$emit("update:model-value", "LARGE")

        expect(wrapper.emitted("update:modelValue")).toHaveLength(1)
        expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["LARGE"])
    })

    it("renders without options when the schema has no enum", () => {
        const wrapper = i18nMount(TaskEnum, {
            props: {
                schema: {type: "string"},
            },
        })

        const options = wrapper.findAllComponents(KsOption)
        expect(options).toHaveLength(0)
    })
})

describe("TaskNamespace", () => {
    let namespacesStore: ReturnType<typeof useNamespacesStore>

    beforeEach(() => {
        setActivePinia(createPinia())
        namespacesStore = useNamespacesStore()
        namespacesStore.autocomplete = ["company.team", "company.analytics"]
        namespacesStore.loadAutocomplete = vi.fn().mockResolvedValue(undefined)
    })

    it("renders the namespaces it is given and emits the selected one", async () => {
        const wrapper = i18nMount(TaskNamespace, {
            props: {
                modelValue: "company.team",
            },
            global: {
                provide: {
                    [CREATING_FLOW_INJECTION_KEY as symbol]: true,
                    [DEFAULT_NAMESPACE_INJECTION_KEY as symbol]: computed(() => "company.team"),
                },
            },
        })

        await flushPromises()

        const options = wrapper.findAllComponents(KsOption)
        expect(options).toHaveLength(2)
        expect(options.map((opt) => opt.props("value"))).toEqual([
            "company.team",
            "company.analytics",
        ])

        const select = wrapper.findComponent(KsSelect)
        await select.vm.$emit("update:model-value", "company.analytics")

        expect(wrapper.emitted("update:modelValue")).toHaveLength(1)
        expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["company.analytics"])
    })

    it("handles an empty namespace list without throwing", async () => {
        namespacesStore.autocomplete = []

        expect(() => {
            const wrapper = i18nMount(TaskNamespace, {
                props: {
                    modelValue: "",
                },
                global: {
                    provide: {
                        [CREATING_FLOW_INJECTION_KEY as symbol]: false,
                        [DEFAULT_NAMESPACE_INJECTION_KEY as symbol]: computed(() => ""),
                    },
                },
            })
            expect(wrapper.exists()).toBe(true)
            const options = wrapper.findAllComponents(KsOption)
            expect(options).toHaveLength(0)
        }).not.toThrow()
    })
})

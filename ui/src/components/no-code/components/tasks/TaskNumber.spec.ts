import {describe, it, expect} from "vitest"
import {KsInputNumber} from "@kestra-io/design-system"
import {i18nMount} from "../../../../../tests/unit/i18nMount"
import TaskNumber from "./TaskNumber.vue"

describe("TaskNumber.vue", () => {
    it("uses the schema's default when no modelValue is given", () => {
        const wrapper = i18nMount(TaskNumber, {
            props: {
                schema: {type: "number", default: 42},
            },
        })

        const input = wrapper.findComponent(KsInputNumber)
        expect(input.exists()).toBe(true)
        expect(input.props("modelValue")).toBe(42)
    })

    it("prioritizes modelValue over the schema default", () => {
        const wrapper = i18nMount(TaskNumber, {
            props: {
                modelValue: 99,
                schema: {type: "number", default: 42},
            },
        })

        const input = wrapper.findComponent(KsInputNumber)
        expect(input.props("modelValue")).toBe(99)
    })

    it("passes minimum, maximum, and step from schema to the input", () => {
        const wrapper = i18nMount(TaskNumber, {
            props: {
                schema: {
                    type: "number",
                    minimum: 10,
                    maximum: 100,
                    step: 5,
                },
            },
        })

        const input = wrapper.findComponent(KsInputNumber)
        expect(input.props("min")).toBe(10)
        expect(input.props("max")).toBe(100)
        expect(input.props("step")).toBe(5)
    })

    it("marks a required field with no value as invalid", () => {
        const wrapper = i18nMount(TaskNumber, {
            props: {
                required: true,
                modelValue: undefined,
            },
        })

        const input = wrapper.findComponent(KsInputNumber)
        expect(input.vm.$attrs.state).toBe(false)
        expect(input.attributes("state")).toBe("false")
    })

    it("marks a non-numeric value as invalid, and a numeric one as valid", () => {
        const invalidWrapper = i18nMount(TaskNumber, {
            props: {
                modelValue: "invalid-number" as unknown as number,
            },
        })
        expect(invalidWrapper.findComponent(KsInputNumber).vm.$attrs.state).toBe(false)

        const validWrapper = i18nMount(TaskNumber, {
            props: {
                modelValue: 123,
            },
        })
        expect(validWrapper.findComponent(KsInputNumber).vm.$attrs.state).toBe(true)
    })

    it("marks an optional field with no value as valid", () => {
        const wrapper = i18nMount(TaskNumber, {
            props: {
                required: false,
                modelValue: undefined,
            },
        })

        const input = wrapper.findComponent(KsInputNumber)
        expect(input.vm.$attrs.state).toBe(true)
    })

    it("emits update:modelValue with the collapsed value when edited", async () => {
        const wrapper = i18nMount(TaskNumber, {
            props: {
                modelValue: 10,
            },
        })

        const input = wrapper.findComponent(KsInputNumber)
        await input.vm.$emit("update:modelValue", 20)
        expect(wrapper.emitted("update:modelValue")).toEqual([[20]])

        await input.vm.$emit("update:modelValue", "" as unknown as number)
        expect(wrapper.emitted("update:modelValue")).toEqual([[20], [undefined]])
    })

    it("handles a value of 0 correctly for rendering, validity, and emissions", async () => {
        const wrapper = i18nMount(TaskNumber, {
            props: {
                modelValue: 0,
            },
        })

        const input = wrapper.findComponent(KsInputNumber)
        // Since values.value evaluates 0 as falsy in `val = computed(() => values.value ? parseInt(values.value.toString(), 10) : undefined)`
        expect(input.props("modelValue")).toBeUndefined()
        // But isValid computes `!isNaN(props.modelValue)` which is true for 0
        expect(input.vm.$attrs.state).toBe(true)

        // When input emits 0, collapseEmptyValues preserves 0
        await input.vm.$emit("update:modelValue", 0)
        expect(wrapper.emitted("update:modelValue")).toEqual([[0]])
    })
})

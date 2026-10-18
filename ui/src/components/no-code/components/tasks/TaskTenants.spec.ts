import {describe, expect, it} from "vitest"
import {computed, ref} from "vue"
import TaskTenants from "./TaskTenants.vue"
import {TENANTS_INJECTION_KEY} from "../../injectionKeys"
import {KsOption, KsSelect, KsTag, KsTooltip} from "@kestra-io/design-system"
import {i18nMount} from "../../../../../tests/unit/i18nMount"

describe("TaskTenants.vue", () => {
    it("three or fewer tenants all render as visible tags, with nothing hidden", () => {
        const tenants = ["alpha", "bravo", "charlie"]
        const wrapper = i18nMount(TaskTenants, {
            props: {
                modelValue: tenants,
            },
        })

        const tags = wrapper.findAllComponents(KsTag)
        expect(tags).toHaveLength(3)
        expect(tags.map((t) => t.text().trim())).toEqual(["alpha", "bravo", "charlie"])
        expect(wrapper.findComponent(KsTooltip).exists()).toBe(false)
    })

    it("more than three renders the first three visible and the rest hidden in a tooltip", () => {
        const tenants = ["t1", "t2", "t3", "t4", "t5"]
        const wrapper = i18nMount(TaskTenants, {
            props: {
                modelValue: tenants,
            },
        })

        const tags = wrapper.findAllComponents(KsTag)
        // 3 visible tags + 1 "+2" overflow tag
        expect(tags).toHaveLength(4)
        expect(tags.slice(0, 3).map((t) => t.text().trim())).toEqual(["t1", "t2", "t3"])
        expect(tags[3].text().trim()).toBe("+2")

        const tooltip = wrapper.findComponent(KsTooltip)
        expect(tooltip.exists()).toBe(true)
        expect(tooltip.text()).toContain("+2")

        const vm = wrapper.vm as unknown as {visibleTags: string[]; hiddenTags: string[]}
        expect(vm.visibleTags).toEqual(["t1", "t2", "t3"])
        expect(vm.hiddenTags).toEqual(["t4", "t5"])
    })

    it("an empty selection renders no tags", () => {
        const wrapper = i18nMount(TaskTenants, {
            props: {
                modelValue: [],
            },
        })

        expect(wrapper.findAllComponents(KsTag)).toHaveLength(0)
        expect(wrapper.findComponent(KsTooltip).exists()).toBe(false)
    })

    it("the model defaults to an empty array when nothing is bound", () => {
        const wrapper = i18nMount(TaskTenants)

        const select = wrapper.findComponent(KsSelect)
        expect((select as unknown as {props: (k: string) => unknown}).props("modelValue")).toEqual([])
        expect(wrapper.findAllComponents(KsTag)).toHaveLength(0)
    })

    it("the injected tenant list is used and maps label and value properly", () => {
        const mockTenants = [
            {id: "tenant-a", name: "Tenant Alpha"},
            {id: "tenant-b"}, // no name: falls back to id
        ]

        const wrapper = i18nMount(TaskTenants, {
            global: {
                provide: {
                    [TENANTS_INJECTION_KEY as symbol]: computed(() => mockTenants),
                },
            },
        })

        const options = wrapper.findAllComponents(KsOption)
        expect(options).toHaveLength(2)
        expect(options[0].props("value")).toBe("tenant-a")
        expect(options[0].props("label")).toBe("Tenant Alpha")
        expect(options[1].props("value")).toBe("tenant-b")
        expect(options[1].props("label")).toBe("tenant-b")
    })

    it("a missing provider falls back to an empty list without throwing", () => {
        const wrapper = i18nMount(TaskTenants)

        const options = wrapper.findAllComponents(KsOption)
        expect(options).toHaveLength(0)
    })

    it("removes a tenant tag when its close button is clicked", async () => {
        const modelValue = ref(["t1", "t2", "t3"])
        const wrapper = i18nMount(TaskTenants, {
            props: {
                modelValue: modelValue.value,
                "onUpdate:modelValue": (val: string[]) => {
                    modelValue.value = val
                },
            },
        })

        const tags = wrapper.findAllComponents(KsTag)
        await tags[1].vm.$emit("close")

        expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([["t1", "t3"]])
    })
})

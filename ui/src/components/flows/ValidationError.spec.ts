import {describe, expect, it} from "vitest"
import {nextTick} from "vue"
import {i18nMount} from "../../../tests/unit/i18nMount"
import ValidationError from "./ValidationError.vue"
import {KsCodeStatus, KsTooltip} from "@kestra-io/design-system"

describe("ValidationError.vue", () => {
    const stubs = {
        KsTooltip: {
            name: "KsTooltip",
            props: ["popperClass", "placement"],
            template: `
                <div class="ks-tooltip-stub" :class="popperClass">
                    <div class="tooltip-content"><slot name="content" /></div>
                    <div class="tooltip-trigger"><slot /></div>
                </div>
            `,
        },
        KsContainer: {template: "<div class=\"ks-container\"><slot /></div>"},
        KsHeader: {template: "<div class=\"ks-header\"><slot /></div>"},
        KsMain: {template: "<div class=\"ks-main\"><slot /></div>"},
    }

    type ValidationErrorProps = InstanceType<typeof ValidationError>["$props"]

    function mountValidationError(props: Partial<ValidationErrorProps> = {}) {
        return i18nMount(ValidationError, {
            props: props as ValidationErrorProps,
            global: {stubs},
        })
    }

    it("renders valid status when there are no errors, warnings, or infos", () => {
        const wrapper = mountValidationError()

        const status = wrapper.findComponent(KsCodeStatus)
        expect(status.exists()).toBe(true)
        expect(status.props("status")).toBe("valid")
        expect(status.props("label")).toBe("valid")
        expect(wrapper.findComponent(KsTooltip).exists()).toBe(false)
    })

    it("renders error status and tooltip when errors are present", () => {
        const errors = ["Field 'name' is required", "Invalid cron expression"]
        const wrapper = mountValidationError({errors})

        const status = wrapper.findComponent(KsCodeStatus)
        expect(status.exists()).toBe(true)
        expect(status.props("status")).toBe("error")

        const tooltip = wrapper.findComponent(KsTooltip)
        expect(tooltip.exists()).toBe(true)
        expect((tooltip as unknown as {props: (k: string) => unknown}).props("popperClass")).toBe("validation-tooltip-popper")

        expect(wrapper.text()).toContain("error detected")
        errors.forEach((err) => {
            expect(wrapper.text()).toContain(err)
        })
    })

    it("renders warning status and tooltip when warnings are present", () => {
        const warnings = ["Deprecated syntax used"]
        const wrapper = mountValidationError({warnings})

        const status = wrapper.findComponent(KsCodeStatus)
        expect(status.exists()).toBe(true)
        expect(status.props("status")).toBe("warning")

        const tooltip = wrapper.findComponent(KsTooltip)
        expect(tooltip.exists()).toBe(true)
        expect((tooltip as unknown as {props: (k: string) => unknown}).props("popperClass")).toBe("validation-tooltip-popper")

        expect(wrapper.text()).toContain("warning detected")
        expect(wrapper.text()).toContain("Deprecated syntax used")
    })

    it("renders info status and tooltip when only infos are present", () => {
        const infos = ["Flow execution optimization available"]
        const wrapper = mountValidationError({infos})

        const status = wrapper.findComponent(KsCodeStatus)
        expect(status.exists()).toBe(true)
        expect(status.props("status")).toBe("info")

        const tooltip = wrapper.findComponent(KsTooltip)
        expect(tooltip.exists()).toBe(true)
        expect((tooltip as unknown as {props: (k: string) => unknown}).props("popperClass")).toBe("validation-tooltip-popper")

        expect(wrapper.text()).toContain("informative notice")
        expect(wrapper.text()).toContain("Flow execution optimization available")
    })

    it("onResize hides button labels when container width exceeds maxWidth", async () => {
        const wrapper = mountValidationError({errors: ["Some error"]})

        const rootSpan = wrapper.find("span").element as HTMLSpanElement
        const button = document.createElement("div")
        button.className = "kel-button"
        const label = document.createElement("span")
        label.className = "label"
        button.appendChild(label)
        rootSpan.appendChild(button)

        Object.defineProperty(rootSpan, "offsetLeft", {value: 100, configurable: true})
        Object.defineProperty(rootSpan, "offsetWidth", {value: 200, configurable: true})

        // Call onResize with maxWidth = 250 (100 + 200 = 300 > 250 -> label should be hidden)
        wrapper.vm.onResize(250)
        await nextTick()

        expect(label.classList.contains("is-hidden")).toBe(true)

        // Call onResize with maxWidth = 500 (300 < 500 -> label should be visible)
        wrapper.vm.onResize(500)
        await nextTick()

        expect(label.classList.contains("is-hidden")).toBe(false)
    })
})

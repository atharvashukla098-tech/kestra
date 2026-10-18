import {describe, expect, it} from "vitest"
import ValidationBadge from "./ValidationBadge.vue"
import {i18nMount} from "../../../../tests/unit/i18nMount"

const defaultMessages = {
    flow_editor_stats: {
        errors: {
            label: "{count} Error(s)",
        },
    },
    "error detected": "Error(s) detected.",
}

const KsTooltipStub = {
    props: ["persistent"],
    template: `
        <div class="ks-tooltip-stub">
            <div class="ks-tooltip-content"><slot name="content" /></div>
            <slot />
        </div>
    `,
}

function mountValidationBadge(issues: string[] = []) {
    return i18nMount(ValidationBadge, {
        props: {issues},
        messages: defaultMessages,
        global: {
            stubs: {
                KsTooltip: KsTooltipStub,
            },
        },
    })
}

describe("ValidationBadge", () => {
    it("renders nothing when issues is empty", () => {
        const wrapper = mountValidationBadge([])

        expect(wrapper.find("[data-test='topology-task-validation-badge']").exists()).toBe(false)
        expect(wrapper.find(".task-validation-badge").exists()).toBe(false)
        expect(wrapper.html()).toBe("<!--v-if-->")
    })

    it("renders the badge when there is at least one issue", () => {
        const wrapper = mountValidationBadge(["A single problem detected"])

        expect(wrapper.find("[data-test='topology-task-validation-badge']").exists()).toBe(true)
        expect(wrapper.find(".task-validation-badge").exists()).toBe(true)
    })

    it("does not show the count for a single issue", () => {
        const wrapper = mountValidationBadge(["A single problem detected"])

        expect(wrapper.find(".task-validation-badge-count").exists()).toBe(false)
    })

    it("shows the count and matches the number of issues for two or more", () => {
        const wrapper2 = mountValidationBadge(["First issue", "Second issue"])
        expect(wrapper2.find(".task-validation-badge-count").exists()).toBe(true)
        expect(wrapper2.find(".task-validation-badge-count").text()).toBe("2")

        const wrapper3 = mountValidationBadge(["First", "Second", "Third"])
        expect(wrapper3.find(".task-validation-badge-count").exists()).toBe(true)
        expect(wrapper3.find(".task-validation-badge-count").text()).toBe("3")
    })

    it("renders every issue as its own entry in the tooltip", () => {
        const issues = [
            "Missing property 'type'",
            "Invalid task id format",
            "Timeout must be positive",
        ]
        const wrapper = mountValidationBadge(issues)

        const entries = wrapper.findAll(".task-validation-tooltip-list li")
        expect(entries).toHaveLength(issues.length)
        expect(entries.map((el) => el.text())).toEqual(issues)
    })

    it("pluralises the aria-label with the issue count", () => {
        const wrapper1 = mountValidationBadge(["Single error"])
        expect(
            wrapper1
                .find("[data-test='topology-task-validation-badge']")
                .attributes("aria-label"),
        ).toBe("1 Error(s)")

        const wrapper3 = mountValidationBadge(["Issue A", "Issue B", "Issue C"])
        expect(
            wrapper3
                .find("[data-test='topology-task-validation-badge']")
                .attributes("aria-label"),
        ).toBe("3 Error(s)")
    })

    it("carries its data-test hook and is focusable", () => {
        const wrapper = mountValidationBadge(["Focusable error"])
        const badge = wrapper.find("[data-test='topology-task-validation-badge']")

        expect(badge.exists()).toBe(true)
        expect(badge.attributes("tabindex")).toBe("0")
        expect(badge.attributes("role")).toBe("img")
    })
})

import {describe, expect, it} from "vitest"
import FlowSummaryChip from "./FlowSummaryChip.vue"
import {EVENTS} from "../utils/constants"
import {i18nMount} from "../../../../tests/unit/i18nMount"

const KsTooltipStub = {
    name: "KsTooltip",
    props: ["content", "placement"],
    template: "<span class=\"ks-tooltip-stub\" :data-tooltip-content=\"content\"><slot /></span>",
}

function mountFlowSummaryChip(props: Record<string, unknown> = {}) {
    return i18nMount(FlowSummaryChip, {
        props,
        global: {
            stubs: {
                KsTooltip: KsTooltipStub,
            },
        },
    })
}

describe("FlowSummaryChip", () => {
    it("renders with no props because labels default to an empty list", () => {
        const wrapper = mountFlowSummaryChip()

        expect(wrapper.exists()).toBe(true)
        expect(wrapper.find("[data-test='topology-flow-chip']").exists()).toBe(true)
        expect(wrapper.find("[data-test='topology-flow-expand']").exists()).toBe(false)
    })

    describe("fullPath computed property", () => {
        it("renders namespace / flowId when both are given", () => {
            const wrapper = mountFlowSummaryChip({
                namespace: "company.analytics",
                flowId: "etl-pipeline",
            })

            const tooltip = wrapper.findComponent<typeof KsTooltipStub>({name: "KsTooltip"})
            expect(tooltip.props("content")).toBe("company.analytics / etl-pipeline")
            expect(wrapper.find(".flow-chip-namespace").text()).toBe("company.analytics")
            expect(wrapper.find(".flow-chip-id").text()).toBe("etl-pipeline")
        })

        it("renders just the namespace when flowId is missing, with no stray separator", () => {
            const wrapper = mountFlowSummaryChip({
                namespace: "company.analytics",
            })

            const tooltip = wrapper.findComponent<typeof KsTooltipStub>({name: "KsTooltip"})
            expect(tooltip.props("content")).toBe("company.analytics")
            expect(tooltip.props("content")).not.toContain("/")
        })

        it("renders just the flowId when namespace is missing, with no stray separator", () => {
            const wrapper = mountFlowSummaryChip({
                flowId: "etl-pipeline",
            })

            const tooltip = wrapper.findComponent<typeof KsTooltipStub>({name: "KsTooltip"})
            expect(tooltip.props("content")).toBe("etl-pipeline")
            expect(tooltip.props("content")).not.toContain("/")
        })

        it("renders nothing rather than a bare separator when both are missing", () => {
            const wrapper = mountFlowSummaryChip({
                namespace: undefined,
                flowId: undefined,
            })

            const tooltip = wrapper.findComponent<typeof KsTooltipStub>({name: "KsTooltip"})
            expect(tooltip.props("content")).toBe("")
        })
    })

    describe("hasDetails and expand control", () => {
        it("hasDetails is true and expand control appears when there is a description", () => {
            const wrapper = mountFlowSummaryChip({
                description: "Nightly synchronization job",
            })

            expect(wrapper.find("[data-test='topology-flow-expand']").exists()).toBe(true)
        })

        it("hasDetails is true and expand control appears when there are labels", () => {
            const wrapper = mountFlowSummaryChip({
                labels: [["environment", "production"]],
            })

            expect(wrapper.find("[data-test='topology-flow-expand']").exists()).toBe(true)
        })

        it("hasDetails is false and expand control does not appear when there is neither", () => {
            const wrapper = mountFlowSummaryChip({
                description: undefined,
                labels: [],
            })

            expect(wrapper.find("[data-test='topology-flow-expand']").exists()).toBe(false)
        })

        it("toggling the expand control reveals and hides the description and labels", async () => {
            const wrapper = mountFlowSummaryChip({
                description: "Nightly data sync",
                labels: [
                    ["team", "data-platform"],
                    ["tier", "mission-critical"],
                ],
            })

            const expandButton = wrapper.find("[data-test='topology-flow-expand']")
            expect(expandButton.exists()).toBe(true)
            expect(expandButton.attributes("aria-expanded")).toBe("false")
            expect(wrapper.find(".flow-chip-details").exists()).toBe(false)

            // Toggle expand
            await expandButton.trigger("click")
            expect(expandButton.attributes("aria-expanded")).toBe("true")
            expect(wrapper.find(".flow-chip-details").exists()).toBe(true)
            expect(wrapper.find(".flow-chip-description").text()).toBe("Nightly data sync")

            const renderedTags = wrapper.findAll(".flow-chip-labels span")
            expect(renderedTags.length).toBeGreaterThanOrEqual(2)
            expect(wrapper.text()).toContain("team: data-platform")
            expect(wrapper.text()).toContain("tier: mission-critical")

            // Toggle collapse
            await expandButton.trigger("click")
            expect(expandButton.attributes("aria-expanded")).toBe("false")
            expect(wrapper.find(".flow-chip-details").exists()).toBe(false)
        })
    })

    describe("edit actions", () => {
        it("emits edit-flow when clicking the identity chip button", async () => {
            const wrapper = mountFlowSummaryChip({flowId: "my-flow"})

            await wrapper.find("[data-test='topology-flow-chip']").trigger("click")

            expect(wrapper.emitted(EVENTS.EDIT_FLOW)).toHaveLength(1)
        })

        it("emits edit-flow when clicking the configure button", async () => {
            const wrapper = mountFlowSummaryChip({flowId: "my-flow"})

            await wrapper.find("[data-test='topology-flow-configure']").trigger("click")

            expect(wrapper.emitted(EVENTS.EDIT_FLOW)).toHaveLength(1)
        })
    })
})

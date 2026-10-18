import {describe, expect, it} from "vitest"
import {Handle, Position} from "@vue-flow/core"
import CollapsedClusterNode from "./CollapsedClusterNode.vue"
import {EVENTS, CLUSTER_TAG_STATUS} from "../utils/constants"
import {i18nMount} from "../../../../tests/unit/i18nMount"

function mountCollapsedClusterNode(props: Record<string, unknown> = {}) {
    return i18nMount(CollapsedClusterNode, {
        props: {
            id: "root.parallel.myCluster",
            data: {color: "triggers", expandable: true},
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            ...props,
        },
        global: {
            stubs: {
                KsTooltip: {template: "<span><slot /></span>"},
                Handle: true,
                LaneHeader: true,
            },
        },
    })
}

describe("CollapsedClusterNode", () => {
    it("shows the id shortened to the segment after the last dot", () => {
        const wrapper = mountCollapsedClusterNode({id: "root.parallel.myCluster"})
        expect(wrapper.find(".cluster-badge").text()).toBe("myCluster")

        const singleSegmentWrapper = mountCollapsedClusterNode({id: "singleCluster"})
        expect(singleSegmentWrapper.find(".cluster-badge").text()).toBe("singleCluster")
    })

    it("resolves the badge style from CLUSTER_TAG_STATUS for a known colour", () => {
        for (const [color, status] of Object.entries(CLUSTER_TAG_STATUS)) {
            const wrapper = mountCollapsedClusterNode({data: {color, expandable: false}})
            const badge = wrapper.find(".cluster-badge")

            expect(badge.attributes("style")).toContain(
                `color: var(--ks-status-${status});`,
            )
            expect(badge.attributes("style")).toContain(
                `background-color: color-mix(in srgb, var(--ks-status-${status}) 10%, var(--ks-bg-badge));`,
            )
        }
    })

    it("falls back to the info status for an unknown colour", () => {
        const wrapper = mountCollapsedClusterNode({data: {color: "unrecognizedColor", expandable: false}})
        const badge = wrapper.find(".cluster-badge")

        expect(badge.attributes("style")).toContain("color: var(--ks-status-info);")
        expect(badge.attributes("style")).toContain(
            "background-color: color-mix(in srgb, var(--ks-status-info) 10%, var(--ks-bg-badge));",
        )
    })

    it("renders the expand button when data.expandable is true", () => {
        const wrapper = mountCollapsedClusterNode({data: {color: "flowable-task", expandable: true}})
        expect(wrapper.find(".circle-button").exists()).toBe(true)
    })

    it("does not render the expand button when expandable is false or absent", () => {
        const falseWrapper = mountCollapsedClusterNode({data: {color: "flowable-task", expandable: false}})
        expect(falseWrapper.find(".circle-button").exists()).toBe(false)

        const absentWrapper = mountCollapsedClusterNode({data: {color: "flowable-task"}})
        expect(absentWrapper.find(".circle-button").exists()).toBe(false)
    })

    it("emits the expand event with the node id when the expand button is clicked", async () => {
        const wrapper = mountCollapsedClusterNode({id: "root.parallel.myCluster", data: {color: "flowable-task", expandable: true}})

        await wrapper.find(".circle-button").trigger("click")

        expect(wrapper.emitted(EVENTS.EXPAND)).toEqual([[{id: "root.parallel.myCluster"}]])
    })

    it("renders source and target handles with the provided positions", () => {
        const wrapper = mountCollapsedClusterNode({
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
        })

        const handles = wrapper.findAllComponents(Handle)
        expect(handles).toHaveLength(2)

        const sourceHandle = handles.find((h) => h.props("type") === "source")
        expect(sourceHandle).toBeDefined()
        expect(sourceHandle?.props("position")).toBe(Position.Bottom)

        const targetHandle = handles.find((h) => h.props("type") === "target")
        expect(targetHandle).toBeDefined()
        expect(targetHandle?.props("position")).toBe(Position.Top)
    })
})

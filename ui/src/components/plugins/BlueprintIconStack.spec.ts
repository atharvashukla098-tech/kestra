import {afterAll, beforeEach, describe, expect, it, vi} from "vitest"
import {mount} from "@vue/test-utils"
import {nextTick} from "vue"
import BlueprintIconStack from "./BlueprintIconStack.vue"

describe("BlueprintIconStack.vue", () => {
    let resizeCallback: ResizeObserverCallback | undefined
    const observeMock = vi.fn()
    const disconnectMock = vi.fn()

    beforeEach(() => {
        observeMock.mockClear()
        disconnectMock.mockClear()
        resizeCallback = undefined

        class MockResizeObserver {
            constructor(callback: ResizeObserverCallback) {
                resizeCallback = callback
            }
            observe = observeMock
            disconnect = disconnectMock
            unobserve = vi.fn()
        }

        vi.stubGlobal("ResizeObserver", MockResizeObserver)
    })

    afterAll(() => {
        vi.unstubAllGlobals()
    })

    function triggerResize(width: number) {
        resizeCallback?.(
            [
                {
                    contentRect: {width} as unknown as DOMRectReadOnly,
                    target: document.createElement("div"),
                } as unknown as ResizeObserverEntry,
            ],
            new (window.ResizeObserver)(() => {}),
        )
    }

    it("classes are deduped by their parent so two tasks in the same plugin yield one icon", () => {
        const clses = [
            "io.kestra.plugin.core.log.Log",
            "io.kestra.plugin.core.log.Print",
            "io.kestra.plugin.scripts.python.Commands",
            "io.kestra.plugin.scripts.python.Script",
        ]

        const wrapper = mount(BlueprintIconStack, {
            props: {clses, icons: {}},
            global: {stubs: {TaskIcon: true}},
        })

        const icons = wrapper.findAllComponents({name: "TaskIcon"})
        expect(icons).toHaveLength(2)
        expect(icons[0].props("cls")).toBe("io.kestra.plugin.core.log")
        expect(icons[1].props("cls")).toBe("io.kestra.plugin.scripts.python")
    })

    it("uses a class with no dot as its own parent", () => {
        const clses = ["StandaloneTask", "StandaloneTask", "io.kestra.Other"]

        const wrapper = mount(BlueprintIconStack, {
            props: {clses, icons: {}},
            global: {stubs: {TaskIcon: true}},
        })

        const icons = wrapper.findAllComponents({name: "TaskIcon"})
        expect(icons).toHaveLength(2)
        expect(icons[0].props("cls")).toBe("StandaloneTask")
        expect(icons[1].props("cls")).toBe("io.kestra")
    })

    it("with unlimited width every unique icon renders and no badge appears", () => {
        const clses = [
            "io.kestra.plugin.aws.s3.Download",
            "io.kestra.plugin.gcp.gcs.Upload",
            "io.kestra.plugin.azure.blob.Copy",
        ]

        const wrapper = mount(BlueprintIconStack, {
            props: {clses, icons: {}},
            global: {stubs: {TaskIcon: true}},
        })

        const icons = wrapper.findAllComponents({name: "TaskIcon"})
        expect(icons).toHaveLength(3)
        expect(wrapper.find(".blueprint-icon-stack__more").exists()).toBe(false)
    })

    it("when the icons do not fit, one slot is reserved for the badge and the badge shows the number of hidden icons", async () => {
        const clses = [
            "io.kestra.plugin.a.TaskA",
            "io.kestra.plugin.b.TaskB",
            "io.kestra.plugin.c.TaskC",
            "io.kestra.plugin.d.TaskD",
            "io.kestra.plugin.e.TaskE",
        ]

        const wrapper = mount(BlueprintIconStack, {
            props: {clses, icons: {}},
            global: {stubs: {TaskIcon: true}},
        })

        // Width 100px: fitting = Math.floor((100 + 8) / 32) = 3 slots total.
        // Since 5 unique > 3 fitting slots, visible = 3 - 1 = 2 icons, reserving 1 slot for the badge.
        // Overflow = 5 - 2 = 3 hidden icons.
        triggerResize(100)
        await nextTick()

        const icons = wrapper.findAllComponents({name: "TaskIcon"})
        expect(icons).toHaveLength(2)

        const badge = wrapper.find(".blueprint-icon-stack__more")
        expect(badge.exists()).toBe(true)
        expect(badge.text()).toBe("+3")
    })

    it("renders no icons when width is zero", async () => {
        const clses = [
            "io.kestra.plugin.a.TaskA",
            "io.kestra.plugin.b.TaskB",
        ]

        const wrapper = mount(BlueprintIconStack, {
            props: {clses, icons: {}},
            global: {stubs: {TaskIcon: true}},
        })

        triggerResize(0)
        await nextTick()

        const icons = wrapper.findAllComponents({name: "TaskIcon"})
        expect(icons).toHaveLength(0)

        const badge = wrapper.find(".blueprint-icon-stack__more")
        expect(badge.exists()).toBe(true)
        expect(badge.text()).toBe("+2")
    })

    it("disconnects the ResizeObserver on unmount", () => {
        const wrapper = mount(BlueprintIconStack, {
            props: {clses: ["io.kestra.Task"], icons: {}},
            global: {stubs: {TaskIcon: true}},
        })

        expect(observeMock).toHaveBeenCalledTimes(1)

        wrapper.unmount()
        expect(disconnectMock).toHaveBeenCalledTimes(1)
    })
})

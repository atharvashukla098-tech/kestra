import {describe, expect, test} from "vitest"
import {defineComponent, h, nextTick, type Ref} from "vue"
import {mount} from "@vue/test-utils"
import {useZIndex} from "element-plus"
import {useTopLayer} from "./useTopLayer"

describe("useTopLayer", () => {
    test("the returned ref is 0 before mount and a real value after", () => {
        let capturedRef!: Ref<number>
        let valueBeforeMount = -1

        const TestComponent = defineComponent({
            setup() {
                capturedRef = useTopLayer()
                valueBeforeMount = capturedRef.value
                return () => h("div")
            },
        })

        const wrapper = mount(TestComponent)

        expect(valueBeforeMount).toBe(0)
        expect(capturedRef.value).toBeGreaterThan(0)
        wrapper.unmount()
    })

    test("two components mounting in order get increasing values", () => {
        let firstLayer!: Ref<number>
        let secondLayer!: Ref<number>

        const Comp1 = defineComponent({
            setup() {
                firstLayer = useTopLayer()
                return () => h("div")
            },
        })
        const Comp2 = defineComponent({
            setup() {
                secondLayer = useTopLayer()
                return () => h("div")
            },
        })

        const w1 = mount(Comp1)
        const w2 = mount(Comp2)

        expect(firstLayer.value).toBeGreaterThan(0)
        expect(secondLayer.value).toBeGreaterThan(firstLayer.value)

        w1.unmount()
        w2.unmount()
    })

    test("a value claimed after an element-plus overlay has opened is above it", () => {
        const {nextZIndex} = useZIndex()
        // Simulate an Element Plus overlay (e.g. dialog, popover, drawer) claiming a z-index
        const overlayZIndex = nextZIndex()

        let topLayer!: Ref<number>
        const Component = defineComponent({
            setup() {
                topLayer = useTopLayer()
                return () => h("div")
            },
        })

        const wrapper = mount(Component)

        expect(topLayer.value).toBeGreaterThan(overlayZIndex)
        wrapper.unmount()
    })

    test("the value does not change again after mount", async () => {
        let topLayer!: Ref<number>
        const Component = defineComponent({
            props: {count: {type: Number, default: 0}},
            setup() {
                topLayer = useTopLayer()
                return () => h("div")
            },
        })

        const wrapper = mount(Component)
        const initialValue = topLayer.value

        const {nextZIndex} = useZIndex()
        nextZIndex()

        await wrapper.setProps({count: 1})
        await nextTick()

        expect(topLayer.value).toBe(initialValue)
        wrapper.unmount()
    })

    test("does not throw when mounted outside any overlay context", () => {
        const Component = defineComponent({
            setup() {
                return {zIndex: useTopLayer()}
            },
            render: () => null,
        })

        expect(() => {
            const wrapper = mount(Component)
            wrapper.unmount()
        }).not.toThrow()
    })
})

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {mount} from "@vue/test-utils"
import {nextTick, reactive} from "vue"
import DocIdDisplay from "./DocIdDisplay.vue"
import * as Utils from "../utils/utils"
import ContentCopy from "vue-material-design-icons/ContentCopy.vue"
import CheckCircle from "vue-material-design-icons/CheckCircle.vue"

const mockRoute = reactive<{query: Record<string, unknown>}>({
    query: {},
})

vi.mock("vue-router", () => ({
    useRoute: () => mockRoute,
}))

const mockDocStore = reactive<{docId: string | undefined}>({
    docId: undefined,
})

vi.mock("../stores/doc", () => ({
    useDocStore: () => mockDocStore,
}))

describe("DocIdDisplay.vue", () => {
    let copySpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        vi.useFakeTimers()
        mockRoute.query = {}
        mockDocStore.docId = "sample-doc-id"
        copySpy = vi.spyOn(Utils, "copy").mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.useRealTimers()
        copySpy.mockRestore()
    })

    it("renders nothing without the showDocId query parameter", () => {
        mockRoute.query = {}
        const wrapper = mount(DocIdDisplay)

        expect(wrapper.find("button").exists()).toBe(false)
        expect(wrapper.text()).toBe("")
    })

    it("renders when the showDocId parameter is present, even with no value", async () => {
        mockRoute.query = {showDocId: ""}
        const wrapper = mount(DocIdDisplay)

        expect(wrapper.find("button.app-id-display-box").exists()).toBe(true)

        mockRoute.query = {showDocId: null}
        await nextTick()
        expect(wrapper.find("button.app-id-display-box").exists()).toBe(true)

        mockRoute.query = {showDocId: "true"}
        await nextTick()
        expect(wrapper.find("button.app-id-display-box").exists()).toBe(true)
    })

    it("displays the exact text docId: <id> from the doc store", () => {
        mockRoute.query = {showDocId: ""}
        mockDocStore.docId = "core.concepts.flows"

        const wrapper = mount(DocIdDisplay)

        expect(wrapper.find("button").text()).toBe("docId: core.concepts.flows")
    })

    it("copies that exact text when clicked", async () => {
        mockRoute.query = {showDocId: ""}
        mockDocStore.docId = "plugins.storage.s3"

        const wrapper = mount(DocIdDisplay)
        await wrapper.find("button").trigger("click")

        expect(copySpy).toHaveBeenCalledTimes(1)
        expect(copySpy).toHaveBeenCalledWith("docId: plugins.storage.s3")
    })

    it("replaces the copy icon with a tick after clicking", async () => {
        mockRoute.query = {showDocId: ""}
        const wrapper = mount(DocIdDisplay)

        expect(wrapper.findComponent(ContentCopy).exists()).toBe(true)
        expect(wrapper.findComponent(CheckCircle).exists()).toBe(false)

        await wrapper.find("button").trigger("click")

        expect(wrapper.findComponent(CheckCircle).exists()).toBe(true)
        expect(wrapper.findComponent(ContentCopy).exists()).toBe(false)
    })

    it("reverts to the copy icon after two seconds", async () => {
        mockRoute.query = {showDocId: ""}
        const wrapper = mount(DocIdDisplay)

        await wrapper.find("button").trigger("click")
        expect(wrapper.findComponent(CheckCircle).exists()).toBe(true)
        expect(wrapper.findComponent(ContentCopy).exists()).toBe(false)

        vi.advanceTimersByTime(1999)
        await nextTick()
        expect(wrapper.findComponent(CheckCircle).exists()).toBe(true)

        vi.advanceTimersByTime(1)
        await nextTick()
        expect(wrapper.findComponent(CheckCircle).exists()).toBe(false)
        expect(wrapper.findComponent(ContentCopy).exists()).toBe(true)
    })
})

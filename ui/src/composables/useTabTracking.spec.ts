import {beforeEach, describe, expect, it, vi} from "vitest"
import type {TrackedTab} from "../utils/tabTracking"

const {mockMakeEvent} = vi.hoisted(() => ({
    mockMakeEvent: vi.fn(),
}))

const mockPluginsStore = {
    editorPlugin: undefined as {cls: string} | undefined,
}

const mockBlueprintsStore = {
    blueprint: undefined as {id: string} | undefined,
}

vi.mock("../stores/plugins", () => ({
    usePluginsStore: () => mockPluginsStore,
}))

vi.mock("../stores/blueprints", () => ({
    useBlueprintsStore: () => mockBlueprintsStore,
}))

vi.mock("../utils/tabTracking", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../utils/tabTracking")>()
    return {
        ...actual,
        makeEvent: mockMakeEvent,
    }
})

import {useTabTracking} from "./useTabTracking"

function fakeTab(uid: string): TrackedTab {
    return {
        uid,
        title: uid,
    }
}

describe("useTabTracking", () => {
    beforeEach(() => {
        mockMakeEvent.mockClear()
        mockPluginsStore.editorPlugin = undefined
        mockBlueprintsStore.blueprint = undefined
    })

    it("carries documentation_page from the plugin store for a doc tab, and nothing when no plugin is open", () => {
        const {trackTabOpen} = useTabTracking()

        // When a plugin is open
        mockPluginsStore.editorPlugin = {cls: "io.kestra.plugin.core.log.Log"}
        trackTabOpen(fakeTab("doc"))
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "documentation", {
            documentation_page: "io.kestra.plugin.core.log.Log",
        })

        // When no plugin is open
        mockPluginsStore.editorPlugin = undefined
        trackTabOpen(fakeTab("doc"))
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "documentation", {})
    })

    it("carries blueprint_name for a blueprints tab, and nothing when no blueprint is loaded", () => {
        const {trackTabOpen} = useTabTracking()

        // When a blueprint is loaded
        mockBlueprintsStore.blueprint = {id: "docker-build-flow"}
        trackTabOpen(fakeTab("blueprints"))
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "blueprint", {
            blueprint_name: "docker-build-flow",
        })

        // When no blueprint is loaded
        mockBlueprintsStore.blueprint = undefined
        trackTabOpen(fakeTab("blueprints"))
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "blueprint", {})
    })

    it("carries task_type parsed out of uid for a nocode- tab", () => {
        const {trackTabOpen} = useTabTracking()
        // UID has 12 prefix characters before the JSON string
        const payload = JSON.stringify({taskType: "io.kestra.plugin.scripts.shell.Commands"})
        const uid = `nocode-12345${payload}`

        trackTabOpen(fakeTab(uid))
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "task_no_code", {
            task_type: "io.kestra.plugin.scripts.shell.Commands",
        })
    })

    it("yields empty metadata rather than throwing for a nocode- tab with malformed JSON", () => {
        const {trackTabOpen} = useTabTracking()
        const uid = "nocode-12345{invalid-json:true"

        expect(() => trackTabOpen(fakeTab(uid))).not.toThrow()
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "flow_code", {})
    })

    it("yields empty metadata for an unrelated tab", () => {
        const {trackTabOpen} = useTabTracking()

        trackTabOpen(fakeTab("code"))
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "flow_code", {})

        trackTabOpen(fakeTab("topology"))
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "topology", {})

        trackTabOpen(fakeTab("files"))
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "files_browser", {})
    })

    it("emits open and close with the tab type and metadata via trackTabOpen and trackTabClose", () => {
        const {trackTabOpen, trackTabClose} = useTabTracking()
        mockBlueprintsStore.blueprint = {id: "sample-blueprint"}

        const tab = fakeTab("blueprints")
        trackTabOpen(tab)
        expect(mockMakeEvent).toHaveBeenLastCalledWith("open", "blueprint", {
            blueprint_name: "sample-blueprint",
        })

        trackTabClose(tab)
        expect(mockMakeEvent).toHaveBeenLastCalledWith("close", "blueprint", {
            blueprint_name: "sample-blueprint",
        })
    })
})

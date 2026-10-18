import {describe, expect, it, vi} from "vitest"
import {mount} from "@vue/test-utils"
import {createI18n} from "vue-i18n"
import {ref} from "vue"
import McpConnect from "./McpConnect.vue"

const mockRoute = {
    params: {tenant: "default", id: "test-mcp"},
    query: {},
}

const mockMcpStore = {
    server: ref({
        id: "test-mcp",
        authType: "BASIC",
        serverType: "PRIVATE",
    }),
}

const mockMiscStore = {
    configs: {
        url: "http://localhost:8080",
    },
}

vi.mock("vue-router", () => ({
    useRoute: () => mockRoute,
}))

vi.mock("../../../../stores/mcp", () => ({
    useMcpStore: () => mockMcpStore,
}))

vi.mock("override/stores/misc", () => ({
    useMiscStore: () => mockMiscStore,
}))

vi.mock("../../../../composables/useEditorBindings", () => ({
    useEditorBindings: () => ({}),
}))

vi.mock("../../../../utils/utils", () => ({
    copy: vi.fn().mockResolvedValue(undefined),
}))

const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: "en",
    messages: {
        en: {
            mcp: {
                connect_tab: {
                    server_url: "Server URL",
                    claude_desktop: "Claude Desktop",
                    claude_code: "Claude Code",
                    cursor: "Cursor",
                    codex: "Codex",
                },
                client_setup: "Client Setup",
            },
        },
    },
})

describe("McpConnect.vue", () => {
    const mountComponent = () => {
        return mount(McpConnect, {
            global: {
                plugins: [i18n],
                stubs: {
                    KsTooltip: {template: "<div><slot /></div>"},
                    KsInput: {template: "<div><slot name=\"suffix\" /></div>"},
                    KsTabs: {template: "<div><slot /></div>"},
                    KsTabPane: {template: "<div><slot /></div>"},
                    KsIconButton: {template: "<button><slot /></button>"},
                    KsEditor: {template: "<div />"},
                    LinkVariant: true,
                    Connection: true,
                    ContentCopy: {template: "<span class=\"content-copy\" />"},
                    CheckIcon: {template: "<span class=\"check-svg\" />"},
                },
            },
        })
    }

    it("renders server URL section and client setup tabs", () => {
        const wrapper = mountComponent()
        expect(wrapper.find(".mcp-connect").exists()).toBe(true)
        expect(wrapper.find(".copy-btn").exists()).toBe(true)
    })

    it("toggles check-icon when snippet is copied", async () => {
        const wrapper = mountComponent()
        const copyBtn = wrapper.find(".copy-btn")
        expect(copyBtn.exists()).toBe(true)

        // Initially shows ContentCopy icon, not check-icon
        expect(wrapper.find(".check-icon").exists()).toBe(false)

        await copyBtn.trigger("click")

        // After click, copied is true, CheckIcon is rendered with check-icon class
        expect(wrapper.find(".check-icon").exists()).toBe(true)
    })
})

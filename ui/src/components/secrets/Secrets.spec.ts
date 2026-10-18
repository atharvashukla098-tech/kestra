import {describe, it, expect, vi} from "vitest"
import en from "../../translations/en.json"

vi.mock("../../composables/useRestoreUrl", () => ({default: vi.fn()}))
vi.mock("../../composables/useRouteContext", () => ({default: vi.fn()}))
vi.mock("../../composables/useSystemNamespace", () => ({useSystemNamespace: () => ({systemNamespace: "system"})}))

let mockSecretsEnabled: boolean | undefined = undefined
vi.mock("override/stores/misc", () => ({
    useMiscStore: () => ({
        configs: {
            get secretsEnabled() {
                return mockSecretsEnabled
            },
        },
    }),
}))

import Secrets from "./Secrets.vue"
import {i18nMount} from "../../../tests/unit/i18nMount"

const stubs = {
    Navbar: {template: "<nav><slot /><slot name=\"additional-right\" /></nav>"},
    SecretsTable: {template: "<div class=\"secrets-table-stub\"><slot name=\"empty\" /></div>"},
    Empty: {template: "<div class=\"empty-stub\"><slot /><slot name=\"description\" /><slot name=\"button\" /></div>"},
}

const mountSecrets = () =>
    i18nMount(Secrets, {
        locales: en,
        global: {stubs},
    })

describe("Secrets.vue", () => {
    it("renders design system classes and no Bootstrap classes in OSS mode", () => {
        mockSecretsEnabled = undefined
        const wrapper = mountSecrets()

        const section = wrapper.find("section")
        expect(section.classes()).toContain("secrets-container")
        expect(section.classes()).not.toContain("d-flex")
        expect(section.classes()).not.toContain("flex-column")

        const ossSecrets = wrapper.find(".oss-secrets")
        expect(ossSecrets.exists()).toBe(true)
        expect(ossSecrets.classes()).not.toContain("d-flex")
        expect(ossSecrets.classes()).not.toContain("text-start")
        expect(ossSecrets.classes()).not.toContain("m-0")
        expect(ossSecrets.classes()).not.toContain("p-0")
        expect(ossSecrets.classes()).not.toContain("mw-100")

        const block = wrapper.find(".oss-secrets-block")
        expect(block.exists()).toBe(true)
        expect(block.classes()).not.toContain("gap-4")

        const divider = wrapper.find(".secrets-divider")
        expect(divider.exists()).toBe(true)
        expect(divider.classes()).not.toContain("my-4")
    })

    it("renders full-container when secrets are enabled", () => {
        mockSecretsEnabled = true
        const wrapper = mountSecrets()

        const section = wrapper.find("section")
        expect(section.classes()).toContain("full-container")
        expect(wrapper.find(".oss-secrets").exists()).toBe(false)
    })
})

import {afterEach, describe, expect, it} from "vitest"
import {mount} from "@vue/test-utils"
import {createPinia} from "pinia"
import {createI18n} from "vue-i18n"
import {createMemoryHistory, createRouter} from "vue-router"
import KestraDesignSystem from "@kestra-io/design-system"
import LogLine from "./LogLine.vue"
import LogLevelNavigator from "./LogLevelNavigator.vue"

const i18n = createI18n({legacy: false, globalInjection: true, locale: "en", messages: {en: {}}})
const router = createRouter({
    history: createMemoryHistory(),
    routes: [{path: "/", component: {template: "<div/>"}}],
})

describe("LogLine focus highlighting and arrow alignment", () => {
    afterEach(() => {
        window.localStorage.clear()
        window.sessionStorage.clear()
    })

    it("renders .selected and does not apply an inline background override on error logs", () => {
        const wrapper = mount(LogLine, {
            props: {
                cursor: true,
                log: {
                    level: "ERROR",
                    message: "A fatal failure occurred",
                    timestamp: "2026-10-18T10:00:00Z",
                },
            },
            global: {
                plugins: [createPinia(), router, i18n, KestraDesignSystem],
            },
        })

        const line = wrapper.find(".line")
        expect(line.classes()).toContain("selected")
        expect(line.classes()).toContain("log-row-error")

        // Inline style must not override the background
        const styleAttr = line.attributes("style") ?? ""
        expect(styleAttr).not.toContain("background:")
    })

    it("renders cursor arrow inside the log-level element for vertical centering", () => {
        const wrapper = mount(LogLine, {
            props: {
                cursor: true,
                log: {
                    level: "WARN",
                    message: "A warning message",
                    timestamp: "2026-10-18T10:00:00Z",
                },
            },
            global: {
                plugins: [createPinia(), router, i18n, KestraDesignSystem],
            },
        })

        const logLevel = wrapper.find(".log-level")
        const iconContainer = logLevel.find(".icon_container")
        expect(iconContainer.exists()).toBe(true)
    })
})

describe("LogLevelNavigator arrow alignment", () => {
    afterEach(() => {
        window.localStorage.clear()
        window.sessionStorage.clear()
    })

    it("vertically centers navigation icons", () => {
        const wrapper = mount(LogLevelNavigator, {
            props: {
                level: "ERROR",
                totalCount: 5,
                cursorIdx: 0,
            },
            global: {
                plugins: [i18n, KestraDesignSystem],
            },
        })

        const buttonsContainer = wrapper.find(".align-items-center.gap-1")
        expect(buttonsContainer.exists()).toBe(true)
    })
})

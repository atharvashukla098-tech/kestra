<template>
    <KsSelect
        :modelValue="currentValue"
        @update:model-value="onInput"
        filterable
        :clearable="!required"
        :allowCreate="allowCreate"
        :defaultFirstOption="allowCreate"
        :placeholder="$t('no_code.choose_placeholder', {field: root?.split('.').pop() || 'value'})"
    >
        <KsOption
            v-for="item in (schema?.enum as string[])"
            :key="item"
            :label="item"
            :value="item"
        />
    </KsSelect>
</template>

<script setup lang="ts">
    import {computed} from "vue"
    import {collapseEmptyValues} from "../utils/collapseEmptyValues"

    type ModelValue = object | string | number | boolean | unknown[]

    const props = withDefaults(defineProps<{
        modelValue?: ModelValue
        schema?: Record<string, unknown>
        required?: boolean
        allowCreate?: boolean
        task?: Record<string, unknown>
        root?: string
        definitions?: Record<string, unknown>
    }>(), {
        modelValue: undefined,
        schema: undefined,
        required: false,
        allowCreate: false,
        task: undefined,
        root: undefined,
        definitions: undefined,
    })

    const emit = defineEmits<{
        "update:modelValue": [value: ModelValue | undefined]
    }>()

    const currentValue = computed(() => props.modelValue ?? (props.schema?.default as ModelValue | undefined))

    function onInput(value: ModelValue | undefined) {
        emit("update:modelValue", collapseEmptyValues(value))
    }
</script>

<style scoped lang="scss">
:deep(.kel-select__suffix) {
    display: flex !important;
}
</style>

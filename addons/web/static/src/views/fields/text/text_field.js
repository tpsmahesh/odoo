/** @odoo-module **/

import { _lt } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { useSpellCheck } from "@web/core/utils/hooks";
import { useDynamicPlaceholder } from "../dynamicplaceholder_hook";
import { useInputField } from "../input_field_hook";
import { parseInteger } from "../parsers";
import { standardFieldProps } from "../standard_field_props";
import { TranslationButton } from "../translation_button";

import { Component, onMounted, onWillUnmount, useEffect, useRef } from "@odoo/owl";

export class TextField extends Component {
    static template = "web.TextField";
    static components = {
        TranslationButton,
    };
    static props = {
        ...standardFieldProps,
        isTranslatable: { type: Boolean, optional: true },
        placeholder: { type: String, optional: true },
        dynamicPlaceholder: { type: Boolean, optional: true },
        rowCount: { type: Number, optional: true },
    };
    static defaultProps = {
        dynamicPlaceholder: false,
        rowCount: 2,
    };

    setup() {
        if (this.props.dynamicPlaceholder) {
            this.dynamicPlaceholder = useDynamicPlaceholder();
        }
        this.divRef = useRef("div");
        this.textareaRef = useRef("textarea");
        useInputField({ getValue: () => this.props.value || "", refName: "textarea" });
        useSpellCheck({ refName: "textarea" });

        useEffect(() => {
            if (!this.props.readonly) {
                this.resize();
            }
        });
        onMounted(this.onMounted);
        onWillUnmount(this.onWillUnmount);
    }
    async onKeydownListener(ev) {
        if (ev.key === this.dynamicPlaceholder.TRIGGER_KEY && ev.target === this.textareaRef.el) {
            const baseModel = this.props.record.data.mailing_model_real;
            if (baseModel) {
                await this.dynamicPlaceholder.open(this.textareaRef.el, baseModel, {
                    validateCallback: this.onDynamicPlaceholderValidate.bind(this),
                    closeCallback: this.onDynamicPlaceholderClose.bind(this),
                });
            }
        }
    }
    onMounted() {
        if (this.props.dynamicPlaceholder) {
            this.keydownListenerCallback = this.onKeydownListener.bind(this);
            document.addEventListener("keydown", this.keydownListenerCallback);
        }
    }
    onWillUnmount() {
        if (this.props.dynamicPlaceholder) {
            document.removeEventListener("keydown", this.keydownListenerCallback);
        }
    }
    onDynamicPlaceholderValidate(chain, defaultValue) {
        if (chain) {
            const triggerKeyReplaceRegex = new RegExp(`${this.dynamicPlaceholder.TRIGGER_KEY}$`);
            let dynamicPlaceholder = "{{object." + chain.join(".");
            dynamicPlaceholder +=
                defaultValue && defaultValue !== "" ? ` or '''${defaultValue}'''}}` : "}}";
            this.props.update(
                this.textareaRef.el.value.replace(triggerKeyReplaceRegex, "") + dynamicPlaceholder
            );
        }
    }
    onDynamicPlaceholderClose() {
        this.textareaRef.el.focus();
    }

    get minimumHeight() {
        return 50;
    }
    get rowCount() {
        return this.props.rowCount;
    }

    resize() {
        const textarea = this.textareaRef.el;
        let heightOffset = 0;
        const style = window.getComputedStyle(textarea);
        if (style.boxSizing === "border-box") {
            const paddingHeight = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            const borderHeight =
                parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
            heightOffset = borderHeight + paddingHeight;
        }
        const previousStyle = {
            borderTopWidth: style.borderTopWidth,
            borderBottomWidth: style.borderBottomWidth,
            padding: style.padding,
        };
        Object.assign(textarea.style, {
            height: "auto",
            borderTopWidth: 0,
            borderBottomWidth: 0,
            padding: 0,
        });
        textarea.style.height = "auto";
        const height = Math.max(this.minimumHeight, textarea.scrollHeight + heightOffset);
        Object.assign(textarea.style, previousStyle, { height: `${height}px` });
        this.divRef.el.style.height = `${height}px`;
    }

    onInput() {
        this.resize();
    }
}

export const textField = {
    component: TextField,
    displayName: _lt("Multiline Text"),
    supportedTypes: ["html", "text"],
    extractProps: ({ attrs, field }) => ({
        placeholder: attrs.placeholder,
        dynamicPlaceholder: attrs.options.dynamic_placeholder,
        rowCount: attrs.rows && parseInteger(attrs.rows),

        isTranslatable: field.translate,
    }),
};

registry.category("fields").add("text", textField);

export class ListTextField extends TextField {
    static defaultProps = {
        ...super.defaultProps,
        rowCount: 1,
    };

    get minimumHeight() {
        return 0;
    }
    get rowCount() {
        return this.props.rowCount;
    }
}

export const listTextField = {
    ...textField,
    component: ListTextField,
};

registry.category("fields").add("list.text", listTextField);

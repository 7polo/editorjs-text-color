import './index.css';

import {TextIcon} from './icons'

// One of the following themes
import '@simonwep/pickr/dist/themes/classic.min.css'; // 'classic' theme
import Pickr from '@simonwep/pickr';
/**
 * Import types
 */
import {TextColorConfig} from './types';
import {API, InlineTool} from '@editorjs/editorjs';

const CONTAINER_CLZ = 'ce-inline-tool--text-color-picker-container'
const TEXT_COLOR_CLZ = 'ce-inline-tool--text-color'
const CACHE_KEY = 'editorjs-text-color-cache'

/**
 * editorjs-text-color Tool for Editor.js
 */
export default class TextColor implements InlineTool {

    public static isInline = true;

    static get sanitize() {
        return {
            font: true,
            span: true,
            mark: true
        };
    }

    shortcut?: string | undefined;

    api?: API | undefined;

    config?: TextColorConfig | undefined;

    iconClasses: {
        base: string,
        active: string
    };

    clickedOnLeft?: boolean;

    button?: HTMLElement;

    pickerButton?: HTMLElement;

    picker?: any;

    constructor({config, api}: { config: TextColorConfig, api: API }) {
        this.api = api;
        this.config = this.mergeTextColorConfig(config);
        this.clickedOnLeft = false;
        /**
         * CSS classes
         */
        this.iconClasses = {
            base: this.api.styles.inlineToolButton,
            active: this.api.styles.inlineToolButtonActive
        };

        this.picker = undefined;
    }

    mergeTextColorConfig(config: TextColorConfig): TextColorConfig {

        const colorCollections = [
            "#F44336",
            "#E91E63",
            "#9C27B0",
            "#673AB7",
            "#3F51B5",
            "#2196F3",
            "#03A9F4",
            "#00BCD4",
            "#009688",
            "#4CAF50",
            "#8BC34A",
            "#CDDC39",
            "#FFEB3B",
            "#FFC107"
        ]

        return Object.assign({defaultColor: "#f00", pluginType: 'text', colorCollections}, config);
    }

    surround(range: Range): void {
        if (!range || !this.api) {
            return
        }

        const legacySpanWrapper = this.api.selection.findParentTag("SPAN");
        if (legacySpanWrapper) this.unwrap(legacySpanWrapper);

        const parentTag = this.getTag();
        const termWrapper = this.api.selection.findParentTag(parentTag);

        if (termWrapper) {
            this.unwrap(termWrapper);
        } else {
            this.wrap(range);
        }

        this.clickedOnLeft = false;
    }

    getTag() {
        return this.config?.pluginType === 'marker' ? 'MARK' : 'FONT';
    }

    /**
     * Wrap selected fragment
     *
     * @param {Range} range - selected fragment
     */
    wrap(range: any) {
        const selectedText = range.extractContents();
        const newWrapper = document.createElement(this.getTag());

        newWrapper.appendChild(selectedText);
        range.insertNode(newWrapper);

        if (this.config?.pluginType === 'marker') {
            this.wrapMarker(newWrapper);
        } else {
            this.wrapTextColor(newWrapper);
        }

        this.api?.selection.expandToTag(newWrapper);
    }

    /**
     * Wrap selected marker fragment
     *
     * @param newWrapper - wrapper for selected fragment
     */
    wrapMarker(newWrapper: any) {
        newWrapper.style.backgroundColor = this.getColor();
        const colorWrapper = this.api?.selection.findParentTag('FONT');
        if (colorWrapper) newWrapper.style.color = colorWrapper.style.color;
    }

    /**
     * Wrap selected text color fragment
     *
     * @param {Range} newWrapper - wrapper for selected fragment
     */
    wrapTextColor(newWrapper: any) {
        newWrapper.style.color = this.getColor();
    }

    unwrap(termWrapper: any) {
        if (!this.api) {
            return;
        }
        /**
         * Expand selection to all term-tag
         */
        this.api.selection.expandToTag(termWrapper)

        const sel = window.getSelection()
        const range = sel?.getRangeAt(0)

        const unwrappedContent = range?.extractContents()

        /**
         * Remove empty term-tag
         */
        if (this.clickedOnLeft) {
            termWrapper.parentNode.removeChild(termWrapper);
        } else {
            if (this.config?.pluginType === 'marker') {
                termWrapper.style.backgroundColor = this.getColor();
            } else {
                termWrapper.style.color = this.getColor();
            }
        }

        // @ts-ignore
        range?.insertNode(unwrappedContent)

        sel?.removeAllRanges()
        // @ts-ignore
        sel?.addRange(range)
    }

    checkState(selection: Selection): boolean {
        const termTag = this.api?.selection.findParentTag(this.getTag());
        this.button?.classList.toggle(this.iconClasses.active, !!termTag);
        console.log(`[checkState] ${!!termTag}`)
        return !!termTag;
    }

    clear?(): void {
        this.button = undefined;
    }

    renderPicker?(pos: { x: number, y: number }): void {
        // @ts-ignore
        if (!this.picker) {
            const pickerContainer = document.createElement('div')
            pickerContainer.setAttribute("class", CONTAINER_CLZ)
            pickerContainer.style.top = `${pos.y - 20}px`;
            pickerContainer.style.left = `${pos.x - 200}px`;

            const target = document.createElement('div')
            pickerContainer.appendChild(target)

            document.body.appendChild(pickerContainer)

            this.picker = Pickr.create({
                el: target,
                default: this.getColor(),
                theme: 'classic',
                swatches: this.config?.colorCollections,
                inline: true,
                components: {
                    // Main components
                    preview: true,
                    opacity: true,
                    hue: true,

                    // Input / output Options
                    interaction: {
                        hex: false,
                        rgba: false,
                        hsla: false,
                        hsva: false,
                        cmyk: false,
                        input: true,
                        clear: false,
                        save: true,
                        cancel: true
                    }
                }
            });
            const destroy = () => {
                setTimeout(() => {
                    this.picker.destroyAndRemove()
                    this.picker = undefined;
                }, 0)
            }
            this.picker.on('cancel', () => {
                destroy()
            })

            // @ts-ignore
            this.picker.on('save', (color: HSVaColorObject) => {
                this.updateColor(color?.toHEXA().toString())
                destroy()
            })

            // @ts-ignore
            this.picker.on('swatchselect', (color: HSVaColorObject) => {
                this.updateColor(color?.toHEXA().toString());
                destroy()
            });

            this.picker.on('hide', () => {
                destroy()
            })
        }
        this.picker.show();
    }

    render(): HTMLElement {
        const button = document.createElement('button');
        button.setAttribute("class", `ce-inline-tool ${TEXT_COLOR_CLZ}`)
        button.innerHTML = TextIcon;
        this.button = button;
        this.button.addEventListener('click', () => this.clickedOnLeft = true);

        this.pickerButton = document.createElement('span')
        this.pickerButton.setAttribute("class", `ce-inline-tool--text-color-picker`)
        // @ts-ignore
        this.pickerButton.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            // @ts-ignore
            this.renderPicker({x: e.clientX, y: e.clientY})
        });

        // @ts-ignore
        this.pickerButton.style.backgroundColor = this.getColor();
        const wrapper = document.createElement('div');
        wrapper.appendChild(this.button);
        wrapper.appendChild(this.pickerButton);
        return wrapper;
    }

    updateColor(color: string): void {
        sessionStorage.setItem(CACHE_KEY, color);
        // @ts-ignore
        this.pickerButton.style.backgroundColor = this.color;
        const sel = window.getSelection()
        const range = sel?.getRangeAt(0)
        // @ts-ignore
        this.surround(range)
    }

    getColor(): string {
        const color = sessionStorage.getItem(CACHE_KEY);
        if (color) {
            return color;
        }
        // @ts-ignore
        return this.config?.defaultColor;
    }
};
/**
 * @typedef {import('mdast').Root} Root
 *
 * @typedef Options
 *   Configuration.
 * @property {boolean} [inlineNotes=false]
 *   Whether to support `^[inline notes]`.
 */

import {footnote} from 'micromark-extension-footnote'
import {footnoteFromMarkdown, footnoteToMarkdown} from 'mdast-util-footnote'

/**
 * Plugin to add support for footnotes.
 *
 * @type {import('unified').Plugin<[Options?]|void[], Root>}
 */
export default function remarkFootnotes(options = {}) {
  const data = this.data()

  add('micromarkExtensions', footnote(options))
  add('fromMarkdownExtensions', footnoteFromMarkdown)
  add('toMarkdownExtensions', footnoteToMarkdown)

  /**
   * @param {string} field
   * @param {unknown} value
   */
  function add(field, value) {
    const list = /** @type {unknown[]} */ (
      // Other extensions
      /* c8 ignore next 2 */
      data[field] ? data[field] : (data[field] = [])
    )

    list.push(value)
  }
}

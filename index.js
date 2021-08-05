import {footnote} from 'micromark-extension-footnote'
import {footnoteFromMarkdown, footnoteToMarkdown} from 'mdast-util-footnote'

export default function remarkFootnotes(options) {
  const data = this.data()

  add('micromarkExtensions', footnote(options))
  add('fromMarkdownExtensions', footnoteFromMarkdown)
  add('toMarkdownExtensions', footnoteToMarkdown)

  function add(field, value) {
    // Other extensions.
    /* c8 ignore next */
    if (data[field]) data[field].push(value)
    else data[field] = [value]
  }
}

import {footnote} from 'micromark-extension-footnote'
import {footnoteFromMarkdown, footnoteToMarkdown} from 'mdast-util-footnote'

let warningIssued

export default function remarkFootnotes(options) {
  const data = this.data()

  // Old remark.
  /* c8 ignore next 14 */
  if (
    !warningIssued &&
    ((this.Parser &&
      this.Parser.prototype &&
      this.Parser.prototype.blockTokenizers) ||
      (this.Compiler &&
        this.Compiler.prototype &&
        this.Compiler.prototype.visitors))
  ) {
    warningIssued = true
    console.warn(
      '[remark-footnotes] Warning: please upgrade to remark 13 to use this plugin'
    )
  }

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

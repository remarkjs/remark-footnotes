import syntax from 'micromark-extension-footnote'
import fromMarkdown from 'mdast-util-footnote/from-markdown.js'
import toMarkdown from 'mdast-util-footnote/to-markdown.js'

var warningIssued

export default function remarkFootnotes(options) {
  var data = this.data()

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

  add('micromarkExtensions', syntax(options))
  add('fromMarkdownExtensions', fromMarkdown)
  add('toMarkdownExtensions', toMarkdown)

  function add(field, value) {
    // Other extensions.
    /* c8 ignore next */
    if (data[field]) data[field].push(value)
    else data[field] = [value]
  }
}

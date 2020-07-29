import unified = require('unified')
import footnotes = require('remark-footnotes')

unified().use(footnotes)
unified().use(footnotes, {})
unified().use(footnotes, {inlineNotes: true})

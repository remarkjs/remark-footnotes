// TypeScript Version: 3.4

import {Plugin} from 'unified'

interface RemarkFootnotesOptions {
  inlineNotes?: boolean
}

declare const remarkFootnotes: Plugin<[RemarkFootnotesOptions?]>

export = remarkFootnotes

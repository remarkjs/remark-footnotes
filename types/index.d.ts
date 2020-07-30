// TypeScript Version: 3.4

import {Plugin} from 'unified'

interface RemarkFootnotesOptions {
  /**
   * Whether to support `^[inline notes]`
   *
   * @defaultValue false
   */
  inlineNotes?: boolean
}

declare const remarkFootnotes: Plugin<[RemarkFootnotesOptions?]>

export = remarkFootnotes

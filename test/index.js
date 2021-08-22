import fs from 'node:fs'
import path from 'node:path'
import test from 'tape'
import {u} from 'unist-builder'
import {removePosition} from 'unist-util-remove-position'
import {readSync, writeSync} from 'to-vfile'
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import remarkFootnotes from '../index.js'

const base = path.join('test', 'fixtures')

test('parse', (t) => {
  const basic = unified().use(remarkParse).use(remarkFootnotes)
  const all = unified()
    .use(remarkParse)
    .use(remarkFootnotes, {inlineNotes: true})

  t.deepEqual(
    removePosition(basic.parse('^[inline]'), true),
    u('root', [u('paragraph', [u('text', '^[inline]')])]),
    'should not parse inline footnotes by default'
  )

  t.deepEqual(
    removePosition(all.parse('^[inline]'), true),
    u('root', [u('paragraph', [u('footnote', [u('text', 'inline')])])]),
    'should parse inline footnotes in `inlineNotes` mode'
  )

  t.deepEqual(
    removePosition(basic().parse('[^]: https://example.com'), true),
    u('root', [u('paragraph', [u('text', '[^]: https://example.com')])]),
    'should no longer allow normal definitions that start w/ caret'
  )

  t.deepEqual(
    removePosition(
      basic.parse('Such as [^like so], [^or so][], or [^like this][this].'),
      true
    ),
    u('root', [
      u('paragraph', [
        u('text', 'Such as [^like so], [^or so][], or [^like this][this].')
      ])
    ]),
    'should no longer allow normal references that start w/ caret'
  )

  t.deepEqual(
    removePosition(basic.parse('[definition]: https://example.com'), true),
    u('root', [
      u('definition', {
        identifier: 'definition',
        label: 'definition',
        title: null,
        url: 'https://example.com'
      })
    ]),
    'should still allow proper normal definitions'
  )

  t.deepEqual(
    removePosition(
      basic.parse('Such as [x], [x][], or [like this][x].\n\n[x]: y'),
      true
    ),
    u('root', [
      u('paragraph', [
        u('text', 'Such as '),
        u(
          'linkReference',
          {identifier: 'x', label: 'x', referenceType: 'shortcut'},
          [u('text', 'x')]
        ),
        u('text', ', '),
        u(
          'linkReference',
          {identifier: 'x', label: 'x', referenceType: 'collapsed'},
          [u('text', 'x')]
        ),
        u('text', ', or '),
        u(
          'linkReference',
          {identifier: 'x', label: 'x', referenceType: 'full'},
          [u('text', 'like this')]
        ),
        u('text', '.')
      ]),
      u('definition', {identifier: 'x', label: 'x', url: 'y', title: null})
    ]),
    'should still allow proper normal references'
  )

  t.deepEqual(
    removePosition(basic.parse('['), true),
    u('root', [u('paragraph', [u('text', '[')])]),
    'should not crash on `[`'
  )
  t.deepEqual(
    removePosition(basic.parse('[]'), true),
    u('root', [u('paragraph', [u('text', '[]')])]),
    'should not crash on `[]`'
  )
  t.deepEqual(
    removePosition(basic.parse('[^'), true),
    u('root', [u('paragraph', [u('text', '[^')])]),
    'should not crash on `[^`'
  )
  t.deepEqual(
    removePosition(basic.parse('[^]'), true),
    u('root', [u('paragraph', [u('text', '[^]')])]),
    'should not crash on `[^]`'
  )
  t.deepEqual(
    removePosition(basic.parse('[^ '), true),
    u('root', [u('paragraph', [u('text', '[^')])]),
    'should not crash on `[^ `'
  )
  t.deepEqual(
    removePosition(basic.parse('[^a]\n\n[^a]:'), true),
    u('root', [
      u('paragraph', [u('footnoteReference', {label: 'a', identifier: 'a'})]),
      u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])
    ]),
    'should not crash on `[^a]` (conforming)'
  )

  t.deepEqual(
    removePosition(all.parse('^'), true),
    u('root', [u('paragraph', [u('text', '^')])]),
    'should not crash on `^`'
  )
  t.deepEqual(
    removePosition(all.parse('^['), true),
    u('root', [u('paragraph', [u('text', '^[')])]),
    'should not crash on `^[`'
  )
  t.deepEqual(
    removePosition(all.parse('^[]'), true),
    u('root', [u('paragraph', [u('footnote', [])])]),
    'should not crash on `^[]` (conforming)'
  )
  t.deepEqual(
    removePosition(all.parse('^[\\'), true),
    u('root', [u('paragraph', [u('text', '^[\\')])]),
    'should not crash on `^[\\`'
  )
  t.deepEqual(
    removePosition(all.parse('^[asd\\'), true),
    u('root', [u('paragraph', [u('text', '^[asd\\')])]),
    'should not crash on `^[asd\\`'
  )
  t.deepEqual(
    removePosition(all.parse('^[asd\\]'), true),
    u('root', [u('paragraph', [u('text', '^[asd]')])]),
    'should not crash on `^[asd\\]`'
  )
  t.deepEqual(
    removePosition(all.parse('^[\\\\]'), true),
    u('root', [u('paragraph', [u('footnote', [u('text', '\\')])])]),
    'should not crash on `^[\\\\]` (conforming)'
  )
  t.deepEqual(
    removePosition(all.parse('^[\\]]'), true),
    u('root', [u('paragraph', [u('footnote', [u('text', ']')])])]),
    'should not crash on `^[\\]]` (conforming)'
  )

  t.deepEqual(
    removePosition(basic.parse('[^a]:'), true),
    u('root', [u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])]),
    'should not crash on `[^a]:` (conforming)'
  )
  t.deepEqual(
    removePosition(basic.parse('[^a]:   '), true),
    u('root', [u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])]),
    'should not crash on `[^a]:   ` (3 spaces, conforming)'
  )
  t.deepEqual(
    removePosition(basic.parse('[^a]:        '), true),
    u('root', [u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])]),
    'should not crash on `[^a]:        ` (8 spaces, conforming)'
  )
  t.deepEqual(
    removePosition(basic.parse('[^a]:b'), true),
    u('root', [
      u('footnoteDefinition', {identifier: 'a', label: 'a'}, [
        u('paragraph', [u('text', 'b')])
      ])
    ]),
    'should not crash on `[^a]:b` (conforming)'
  )

  t.deepEqual(
    removePosition(basic.parse('> block quote\n[^1]: 1'), true),
    u('root', [
      u('blockquote', [u('paragraph', [u('text', 'block quote')])]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt a block quote'
  )

  t.deepEqual(
    removePosition(basic.parse('---\n[^1]: 1'), true),
    u('root', [
      u('thematicBreak'),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt a thematic break'
  )

  t.deepEqual(
    removePosition(basic.parse('# Heading\n[^1]: 1'), true),
    u('root', [
      u('heading', {depth: 1}, [u('text', 'Heading')]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt an ATX heading'
  )

  t.deepEqual(
    removePosition(basic.parse('```fenced\n```\n[^1]: 1'), true),
    u('root', [
      u('code', {lang: 'fenced', meta: null}, ''),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt fenced code'
  )

  t.deepEqual(
    removePosition(basic.parse('    indented\n[^1]: 1'), true),
    u('root', [
      u('code', {lang: null, meta: null}, 'indented'),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt indented code'
  )

  t.deepEqual(
    removePosition(basic.parse('<html>\n[^1]: 1'), true),
    u('root', [u('html', '<html>\n[^1]: 1')]),
    'should not interrupt HTML'
  )

  t.deepEqual(
    removePosition(basic.parse('- list\n[^1]: 1'), true),
    u('root', [
      u('list', {ordered: false, start: null, spread: false}, [
        u('listItem', {spread: false, checked: null}, [
          u('paragraph', [u('text', 'list')])
        ])
      ]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt a list'
  )

  t.deepEqual(
    removePosition(basic.parse('paragraph\n[^1]: 1'), true),
    u('root', [
      u('paragraph', [u('text', 'paragraph')]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt a paragraph'
  )

  t.deepEqual(
    removePosition(basic.parse('[^1]\n\n[^1]: 1\nParagraph'), true),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should not be interrupted by a paragraph'
  )

  t.deepEqual(
    removePosition(basic.parse('[^1]\n\n[^1]: 1\n\tParagraph'), true),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should indent with tabs'
  )
  t.deepEqual(
    removePosition(basic.parse('[^1]\n\n[^1]: 1\n   \tParagraph'), true),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should indent with three spaces and 1 tab'
  )

  t.deepEqual(
    removePosition(basic.parse('[^1]\n\n[^1]: 1\n    \tParagraph'), true),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should indent with four spaces, and a next tab is part of the content'
  )

  t.end()
})

test('serialize', (t) => {
  const p = unified().use(remarkStringify).use(remarkFootnotes)

  t.equal(
    p.stringify(
      u('root', [
        u('footnote', [
          u('text', 'Text with '),
          u('emphasis', [u('text', 'markup')]),
          u('text', '.')
        ])
      ])
    ),
    '^[Text with *markup*.]\n',
    'should serialize a footnote'
  )

  t.equal(
    p.stringify(
      u('root', [u('footnoteReference', {identifier: 'a', label: 'A'})])
    ),
    '[^A]\n',
    'should serialize a footnote reference'
  )

  t.equal(
    p.stringify(u('root', [u('footnoteReference', {identifier: 'a'})])),
    '[^a]\n',
    'should serialize a footnote reference w/o label'
  )

  t.equal(
    p.stringify(
      u('root', [
        u('footnoteDefinition', {identifier: 'a', label: 'A'}, [
          u('paragraph', [
            u('text', 'Text with '),
            u('emphasis', [u('text', 'markup')]),
            u('text', '.')
          ])
        ])
      ])
    ),
    '[^A]: Text with *markup*.\n',
    'should serialize a footnote definition'
  )

  t.equal(
    p.stringify(
      u('root', [
        u('footnoteDefinition', {identifier: 'a'}, [
          u('paragraph', [
            u('text', 'Text with '),
            u('emphasis', [u('text', 'markup')]),
            u('text', '.')
          ])
        ])
      ])
    ),
    '[^a]: Text with *markup*.\n',
    'should serialize a footnote definition w/o label'
  )

  t.equal(
    p.stringify(
      // @ts-expect-error: TS can’t infer `depth`.
      u('root', [
        u('footnoteDefinition', {identifier: 'a'}, [
          u('heading', {depth: 1}, [u('text', 'Heading')]),
          u('blockquote', [u('paragraph', [u('text', 'Block quote.')])]),
          u('code', 'console.log(1)\n\nconsole.log(2)')
        ])
      ])
    ),
    '[^a]: # Heading\n\n    > Block quote.\n\n        console.log(1)\n\n        console.log(2)\n',
    'should serialize a footnote definition w/o label'
  )

  t.end()
})

test('html', (t) => {
  const p = unified()
    .use(remarkParse)
    .use(remarkFootnotes, {inlineNotes: true})
    .use(remarkRehype)
    .use(rehypeStringify)

  t.equal(
    p
      .processSync(readSync({dirname: base, basename: 'footnotes-pandoc.md'}))
      .toString(),
    [
      '<p>Here is a footnote reference,<a href="#fn1" class="footnote-ref" id="fnref1" role="doc-noteref"><sup>1</sup></a> and another.<a href="#fn2" class="footnote-ref" id="fnref2" role="doc-noteref"><sup>2</sup></a></p>',
      '<p>This paragraph won’t be part of the note, because it',
      'isn’t indented.</p>',
      '<section class="footnotes" role="doc-endnotes">',
      '<hr>',
      '<ol>',
      '<li id="fn1" role="doc-endnote">',
      '<p>Here is the footnote.<a href="#fnref1" class="footnote-back" role="doc-backlink">↩</a></p>',
      '</li>',
      '<li id="fn2" role="doc-endnote">',
      '<p>Here’s one with multiple blocks.</p>',
      '<p>Subsequent paragraphs are indented to show that they',
      'belong to the previous footnote.</p>',
      '<pre><code>{ some.code }',
      '</code></pre>',
      '<p>The whole paragraph can be indented, or just the first',
      'line.  In this way, multi-paragraph footnotes work like',
      'multi-paragraph list items.<a href="#fnref2" class="footnote-back" role="doc-backlink">↩</a></p>',
      '</li>',
      '</ol>',
      '</section>'
    ].join('\n'),
    'should serialize footnote references and definitions to HTML'
  )

  t.equal(
    p
      .processSync(
        readSync({dirname: base, basename: 'inline-notes-pandoc.md'})
      )
      .toString(),
    [
      '<p>Here is an inline note.<a href="#fn1" class="footnote-ref" id="fnref1" role="doc-noteref"><sup>1</sup></a></p>',
      '<section class="footnotes" role="doc-endnotes">',
      '<hr>',
      '<ol>',
      '<li id="fn1" role="doc-endnote">Inlines notes are easier to write, since',
      'you don’t have to pick an identifier and move down to type the',
      'note.<a href="#fnref1" class="footnote-back" role="doc-backlink">↩</a></li>',
      '</ol>',
      '</section>'
    ].join('\n'),
    'should serialize inline notes to HTML'
  )

  t.end()
})

test('fixtures', (t) => {
  const files = fs.readdirSync(base).filter((d) => /\.md$/.test(d))
  let index = -1

  while (++index < files.length) {
    const name = files[index]
    const input = readSync({dirname: base, basename: name})
    const processor = unified()
      .use(remarkParse)
      .use(remarkStringify)
      .use(remarkFootnotes, {inlineNotes: true})
    /** @type {string|undefined} */
    let expected

    const tree = processor.parse(input)

    try {
      expected = JSON.parse(
        String(readSync({dirname: base, basename: name, extname: '.json'}))
      )
    } catch {}

    if (expected) {
      t.deepLooseEqual(tree, expected, input.stem + ' (tree)')
    } else {
      writeSync({
        dirname: base,
        basename: name,
        extname: '.json',
        value: JSON.stringify(tree, null, 2) + '\n'
      })
    }
  }

  t.end()
})

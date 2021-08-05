import fs from 'fs'
import path from 'path'
import test from 'tape'
import u from 'unist-builder'
import clean from 'unist-util-remove-position'
import vfile from 'to-vfile'
import unified from 'unified'
import parse from 'remark-parse'
import stringify from 'remark-stringify'
import remark2rehype from 'remark-rehype'
import html from 'rehype-stringify'
import footnotes from '../index.js'

var base = path.join('test', 'fixtures')

test('parse', function (t) {
  var basic = unified().use(parse).use(footnotes)
  var all = unified().use(parse).use(footnotes, {inlineNotes: true})

  t.deepEqual(
    clean(basic.parse('^[inline]'), true),
    u('root', [u('paragraph', [u('text', '^[inline]')])]),
    'should not parse inline footnotes by default'
  )

  t.deepEqual(
    clean(all.parse('^[inline]'), true),
    u('root', [u('paragraph', [u('footnote', [u('text', 'inline')])])]),
    'should parse inline footnotes in `inlineNotes` mode'
  )

  t.deepEqual(
    clean(basic().parse('[^]: https://example.com'), true),
    u('root', [u('paragraph', [u('text', '[^]: https://example.com')])]),
    'should no longer allow normal definitions that start w/ caret'
  )

  t.deepEqual(
    clean(
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
    clean(basic.parse('[definition]: https://example.com'), true),
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
    clean(
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
    clean(basic.parse('['), true),
    u('root', [u('paragraph', [u('text', '[')])]),
    'should not crash on `[`'
  )
  t.deepEqual(
    clean(basic.parse('[]'), true),
    u('root', [u('paragraph', [u('text', '[]')])]),
    'should not crash on `[]`'
  )
  t.deepEqual(
    clean(basic.parse('[^'), true),
    u('root', [u('paragraph', [u('text', '[^')])]),
    'should not crash on `[^`'
  )
  t.deepEqual(
    clean(basic.parse('[^]'), true),
    u('root', [u('paragraph', [u('text', '[^]')])]),
    'should not crash on `[^]`'
  )
  t.deepEqual(
    clean(basic.parse('[^ '), true),
    u('root', [u('paragraph', [u('text', '[^')])]),
    'should not crash on `[^ `'
  )
  t.deepEqual(
    clean(basic.parse('[^a]\n\n[^a]:'), true),
    u('root', [
      u('paragraph', [u('footnoteReference', {label: 'a', identifier: 'a'})]),
      u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])
    ]),
    'should not crash on `[^a]` (conforming)'
  )

  t.deepEqual(
    clean(all.parse('^'), true),
    u('root', [u('paragraph', [u('text', '^')])]),
    'should not crash on `^`'
  )
  t.deepEqual(
    clean(all.parse('^['), true),
    u('root', [u('paragraph', [u('text', '^[')])]),
    'should not crash on `^[`'
  )
  t.deepEqual(
    clean(all.parse('^[]'), true),
    u('root', [u('paragraph', [u('footnote', [])])]),
    'should not crash on `^[]` (conforming)'
  )
  t.deepEqual(
    clean(all.parse('^[\\'), true),
    u('root', [u('paragraph', [u('text', '^[\\')])]),
    'should not crash on `^[\\`'
  )
  t.deepEqual(
    clean(all.parse('^[asd\\'), true),
    u('root', [u('paragraph', [u('text', '^[asd\\')])]),
    'should not crash on `^[asd\\`'
  )
  t.deepEqual(
    clean(all.parse('^[asd\\]'), true),
    u('root', [u('paragraph', [u('text', '^[asd]')])]),
    'should not crash on `^[asd\\]`'
  )
  t.deepEqual(
    clean(all.parse('^[\\\\]'), true),
    u('root', [u('paragraph', [u('footnote', [u('text', '\\')])])]),
    'should not crash on `^[\\\\]` (conforming)'
  )
  t.deepEqual(
    clean(all.parse('^[\\]]'), true),
    u('root', [u('paragraph', [u('footnote', [u('text', ']')])])]),
    'should not crash on `^[\\]]` (conforming)'
  )

  t.deepEqual(
    clean(basic.parse('[^a]:'), true),
    u('root', [u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])]),
    'should not crash on `[^a]:` (conforming)'
  )
  t.deepEqual(
    clean(basic.parse('[^a]:   '), true),
    u('root', [u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])]),
    'should not crash on `[^a]:   ` (3 spaces, conforming)'
  )
  t.deepEqual(
    clean(basic.parse('[^a]:        '), true),
    u('root', [u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])]),
    'should not crash on `[^a]:        ` (8 spaces, conforming)'
  )
  t.deepEqual(
    clean(basic.parse('[^a]:b'), true),
    u('root', [
      u('footnoteDefinition', {identifier: 'a', label: 'a'}, [
        u('paragraph', [u('text', 'b')])
      ])
    ]),
    'should not crash on `[^a]:b` (conforming)'
  )

  t.deepEqual(
    clean(basic.parse('> block quote\n[^1]: 1'), true),
    u('root', [
      u('blockquote', [u('paragraph', [u('text', 'block quote')])]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt a block quote'
  )

  t.deepEqual(
    clean(basic.parse('---\n[^1]: 1'), true),
    u('root', [
      u('thematicBreak'),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt a thematic break'
  )

  t.deepEqual(
    clean(basic.parse('# Heading\n[^1]: 1'), true),
    u('root', [
      u('heading', {depth: 1}, [u('text', 'Heading')]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt an ATX heading'
  )

  t.deepEqual(
    clean(basic.parse('```fenced\n```\n[^1]: 1'), true),
    u('root', [
      u('code', {lang: 'fenced', meta: null}, ''),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt fenced code'
  )

  t.deepEqual(
    clean(basic.parse('    indented\n[^1]: 1'), true),
    u('root', [
      u('code', {lang: null, meta: null}, 'indented'),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt indented code'
  )

  t.deepEqual(
    clean(basic.parse('<html>\n[^1]: 1'), true),
    u('root', [u('html', '<html>\n[^1]: 1')]),
    'should not interrupt HTML'
  )

  t.deepEqual(
    clean(basic.parse('- list\n[^1]: 1'), true),
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
    clean(basic.parse('paragraph\n[^1]: 1'), true),
    u('root', [
      u('paragraph', [u('text', 'paragraph')]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt a paragraph'
  )

  t.deepEqual(
    clean(basic.parse('[^1]\n\n[^1]: 1\nParagraph'), true),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should not be interrupted by a paragraph'
  )

  t.deepEqual(
    clean(basic.parse('[^1]\n\n[^1]: 1\n\tParagraph'), true),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should indent with tabs'
  )
  t.deepEqual(
    clean(basic.parse('[^1]\n\n[^1]: 1\n   \tParagraph'), true),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should indent with three spaces and 1 tab'
  )

  t.deepEqual(
    clean(basic.parse('[^1]\n\n[^1]: 1\n    \tParagraph'), true),
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

test('serialize', function (t) {
  var p = unified().use(stringify).use(footnotes)

  t.equal(
    p.stringify(
      u('footnote', [
        u('text', 'Text with '),
        u('emphasis', [u('text', 'markup')]),
        u('text', '.')
      ])
    ),
    '^[Text with *markup*.]\n',
    'should serialize a footnote'
  )

  t.equal(
    p.stringify(u('footnoteReference', {identifier: 'a', label: 'A'})),
    '[^A]\n',
    'should serialize a footnote reference'
  )

  t.equal(
    p.stringify(u('footnoteReference', {identifier: 'a'})),
    '[^a]\n',
    'should serialize a footnote reference w/o label'
  )

  t.equal(
    p.stringify(
      u('footnoteDefinition', {identifier: 'a', label: 'A'}, [
        u('paragraph', [
          u('text', 'Text with '),
          u('emphasis', [u('text', 'markup')]),
          u('text', '.')
        ])
      ])
    ),
    '[^A]: Text with *markup*.\n',
    'should serialize a footnote definition'
  )

  t.equal(
    p.stringify(
      u('footnoteDefinition', {identifier: 'a'}, [
        u('paragraph', [
          u('text', 'Text with '),
          u('emphasis', [u('text', 'markup')]),
          u('text', '.')
        ])
      ])
    ),
    '[^a]: Text with *markup*.\n',
    'should serialize a footnote definition w/o label'
  )

  t.equal(
    p.stringify(
      u('footnoteDefinition', {identifier: 'a'}, [
        u('heading', {depth: 1}, [u('text', 'Heading')]),
        u('blockquote', [u('paragraph', [u('text', 'Block quote.')])]),
        u('code', 'console.log(1)\n\nconsole.log(2)')
      ])
    ),
    '[^a]: # Heading\n\n    > Block quote.\n\n        console.log(1)\n\n        console.log(2)\n',
    'should serialize a footnote definition w/o label'
  )

  t.end()
})

test('html', function (t) {
  var p = unified()
    .use(parse)
    .use(footnotes, {inlineNotes: true})
    .use(remark2rehype)
    .use(html)

  t.equal(
    p
      .processSync(
        vfile.readSync({dirname: base, basename: 'footnotes-pandoc.md'})
      )
      .toString(),
    [
      '<p>Here is a footnote reference,<sup id="fnref-1"><a href="#fn-1" class="footnote-ref">1</a></sup> and another.<sup id="fnref-longnote"><a href="#fn-longnote" class="footnote-ref">longnote</a></sup></p>',
      '<p>This paragraph won’t be part of the note, because it',
      'isn’t indented.</p>',
      '<div class="footnotes">',
      '<hr>',
      '<ol>',
      '<li id="fn-1">',
      '<p>Here is the footnote.<a href="#fnref-1" class="footnote-backref">↩</a></p>',
      '</li>',
      '<li id="fn-longnote">',
      '<p>Here’s one with multiple blocks.</p>',
      '<p>Subsequent paragraphs are indented to show that they',
      'belong to the previous footnote.</p>',
      '<pre><code>{ some.code }',
      '</code></pre>',
      '<p>The whole paragraph can be indented, or just the first',
      'line.  In this way, multi-paragraph footnotes work like',
      'multi-paragraph list items.<a href="#fnref-longnote" class="footnote-backref">↩</a></p>',
      '</li>',
      '</ol>',
      '</div>'
    ].join('\n'),
    'should serialize footnote references and definitions to HTML'
  )

  t.equal(
    p
      .processSync(
        vfile.readSync({dirname: base, basename: 'inline-notes-pandoc.md'})
      )
      .toString(),
    [
      '<p>Here is an inline note.<sup id="fnref-1"><a href="#fn-1" class="footnote-ref">1</a></sup></p>',
      '<div class="footnotes">',
      '<hr>',
      '<ol>',
      '<li id="fn-1">Inlines notes are easier to write, since',
      'you don’t have to pick an identifier and move down to type the',
      'note.<a href="#fnref-1" class="footnote-backref">↩</a></li>',
      '</ol>',
      '</div>'
    ].join('\n'),
    'should serialize footnote references and definitions to HTML'
  )

  t.end()
})

test('fixtures', function (t) {
  fs.readdirSync(base)
    .filter((d) => /\.md$/.test(d))
    .forEach((name) => {
      var input = vfile.readSync({dirname: base, basename: name})
      var processor = unified()
        .use(parse)
        .use(stringify)
        .use(footnotes, {inlineNotes: true})
      var tree
      var expected

      tree = processor.parse(input)

      try {
        expected = JSON.parse(
          vfile.readSync({dirname: base, basename: name, extname: '.json'})
        )
      } catch (_) {}

      if (expected) {
        t.deepLooseEqual(tree, expected, input.stem + ' (tree)')
      } else {
        vfile.writeSync({
          dirname: base,
          basename: name,
          extname: '.json',
          contents: JSON.stringify(tree, null, 2) + '\n'
        })
      }
    })

  t.end()
})

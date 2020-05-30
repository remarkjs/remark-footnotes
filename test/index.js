'use strict'

var fs = require('fs')
var path = require('path')
var test = require('tape')
var u = require('unist-builder')
var vfile = require('to-vfile')
var unified = require('unified')
var parse = require('remark-parse')
var stringify = require('remark-stringify')
var remark2rehype = require('remark-rehype')
var html = require('rehype-stringify')
var footnotes = require('..')

var base = path.join('test', 'fixtures')

test('parse', function (t) {
  var basic = unified().use(parse, {position: false}).use(footnotes)
  var all = basic().use(footnotes, {inlineNotes: true})

  t.deepEqual(
    basic.parse('^[inline]'),
    u('root', [
      u('paragraph', [
        u('text', '^'),
        u(
          'linkReference',
          {identifier: 'inline', label: 'inline', referenceType: 'shortcut'},
          [u('text', 'inline')]
        )
      ])
    ]),
    'should not parse inline footnotes by default'
  )

  t.deepEqual(
    all.parse('^[inline]'),
    u('root', [u('paragraph', [u('footnote', [u('text', 'inline')])])]),
    'should parse inline footnotes in `inlineNotes` mode'
  )

  t.deepEqual(
    basic()
      .use(parse, {gfm: false})
      .parse('[^def inition]: https://example.com'),
    u('root', [
      u('paragraph', [u('text', '[^def inition]: https://example.com')])
    ]),
    'should no longer allow normal definitions that start w/ caret'
  )

  t.deepEqual(
    basic.parse('Such as [^like so], [^or so][], or [^like this][this].'),
    u('root', [
      u('paragraph', [
        u('text', 'Such as [^like so], [^or so][], or [^like this]'),
        u(
          'linkReference',
          {identifier: 'this', label: 'this', referenceType: 'shortcut'},
          [u('text', 'this')]
        ),
        u('text', '.')
      ])
    ]),
    'should no longer allow normal references that start w/ caret'
  )

  t.deepEqual(
    basic.parse('[definition]: https://example.com'),
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
    basic.parse('Such as [like so], [or so][], or [like this][this].'),
    u('root', [
      u('paragraph', [
        u('text', 'Such as '),
        u(
          'linkReference',
          {identifier: 'like so', label: 'like so', referenceType: 'shortcut'},
          [u('text', 'like so')]
        ),
        u('text', ', '),
        u(
          'linkReference',
          {identifier: 'or so', label: 'or so', referenceType: 'collapsed'},
          [u('text', 'or so')]
        ),
        u('text', ', or '),
        u(
          'linkReference',
          {identifier: 'this', label: 'this', referenceType: 'full'},
          [u('text', 'like this')]
        ),
        u('text', '.')
      ])
    ]),
    'should still allow proper normal references'
  )

  t.deepEqual(
    basic.parse('['),
    u('root', [u('paragraph', [u('text', '[')])]),
    'should not crash on `[`'
  )
  t.deepEqual(
    basic.parse('[]'),
    u('root', [u('paragraph', [u('text', '[]')])]),
    'should not crash on `[]`'
  )
  t.deepEqual(
    basic.parse('[^'),
    u('root', [u('paragraph', [u('text', '[^')])]),
    'should not crash on `[^`'
  )
  t.deepEqual(
    basic.parse('[^]'),
    u('root', [u('paragraph', [u('text', '[^]')])]),
    'should not crash on `[^]`'
  )
  t.deepEqual(
    basic.parse('[^ '),
    u('root', [u('paragraph', [u('text', '[^ ')])]),
    'should not crash on `[^ `'
  )
  t.deepEqual(
    basic.parse('[^a]'),
    u('root', [
      u('paragraph', [u('footnoteReference', {label: 'a', identifier: 'a'})])
    ]),
    'should not crash on `[^a]` (conforming)'
  )

  t.deepEqual(
    all.parse('^'),
    u('root', [u('paragraph', [u('text', '^')])]),
    'should not crash on `^`'
  )
  t.deepEqual(
    all.parse('^['),
    u('root', [u('paragraph', [u('text', '^[')])]),
    'should not crash on `^[`'
  )
  t.deepEqual(
    all.parse('^[]'),
    u('root', [u('paragraph', [u('footnote', [])])]),
    'should not crash on `^[]` (conforming)'
  )
  t.deepEqual(
    all.parse('^[\\'),
    u('root', [u('paragraph', [u('text', '^[\\')])]),
    'should not crash on `^[\\`'
  )
  t.deepEqual(
    all.parse('^[asd\\'),
    u('root', [u('paragraph', [u('text', '^[asd\\')])]),
    'should not crash on `^[asd\\`'
  )
  t.deepEqual(
    all.parse('^[asd\\]'),
    u('root', [u('paragraph', [u('text', '^[asd'), u('text', ']')])]),
    'should not crash on `^[asd\\]`'
  )
  t.deepEqual(
    all.parse('^[\\\\]'),
    u('root', [u('paragraph', [u('footnote', [u('text', '\\')])])]),
    'should not crash on `^[\\\\]` (conforming)'
  )
  t.deepEqual(
    all.parse('^[\\]]'),
    u('root', [u('paragraph', [u('footnote', [u('text', ']')])])]),
    'should not crash on `^[\\]]` (conforming)'
  )

  t.deepEqual(
    basic.parse('[^a]:'),
    u('root', [u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])]),
    'should not crash on `[^a]:` (conforming)'
  )
  t.deepEqual(
    basic.parse('[^a]:   '),
    u('root', [u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])]),
    'should not crash on `[^a]:   ` (3 spaces, conforming)'
  )
  t.deepEqual(
    basic.parse('[^a]:        '),
    u('root', [u('footnoteDefinition', {identifier: 'a', label: 'a'}, [])]),
    'should not crash on `[^a]:        ` (8 spaces, conforming)'
  )
  t.deepEqual(
    basic.parse('[^a]:b'),
    u('root', [
      u('footnoteDefinition', {identifier: 'a', label: 'a'}, [
        u('paragraph', [u('text', 'b')])
      ])
    ]),
    'should not crash on `[^a]:b` (conforming)'
  )

  t.deepEqual(
    basic.parse('> block quote\n[^1]: 1'),
    u('root', [
      u('blockquote', [
        u('paragraph', [
          u('text', 'block quote\n'),
          u('footnoteReference', {identifier: '1', label: '1'}),
          u('text', ': 1')
        ])
      ])
    ]),
    'should not interrupt a block quote'
  )

  t.deepEqual(
    basic.parse('---\n[^1]: 1'),
    u('root', [
      u('thematicBreak'),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt a thematic break'
  )

  t.deepEqual(
    basic.parse('# Heading\n[^1]: 1'),
    u('root', [
      u('heading', {depth: 1}, [u('text', 'Heading')]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt an ATX heading'
  )

  t.deepEqual(
    basic.parse('```fenced\n```\n[^1]: 1'),
    u('root', [
      u('code', {lang: 'fenced', meta: null}, ''),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt fenced code'
  )

  t.deepEqual(
    basic.parse('    indented\n[^1]: 1'),
    u('root', [
      u('code', {lang: null, meta: null}, 'indented'),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1')])
      ])
    ]),
    'should interrupt indented code'
  )

  t.deepEqual(
    basic.parse('<html>\n[^1]: 1'),
    u('root', [u('html', '<html>\n[^1]: 1')]),
    'should not interrupt HTML'
  )

  t.deepEqual(
    basic.parse('- list\n[^1]: 1'),
    u('root', [
      u('list', {ordered: false, start: null, spread: false}, [
        u('listItem', {spread: false, checked: null}, [
          u('paragraph', [
            u('text', 'list\n'),
            u('footnoteReference', {identifier: '1', label: '1'}),
            u('text', ': 1')
          ])
        ])
      ])
    ]),
    'should not interrupt a list'
  )

  t.deepEqual(
    basic.parse('paragraph\n[^1]: 1'),
    u('root', [
      u('paragraph', [
        u('text', 'paragraph\n'),
        u('footnoteReference', {identifier: '1', label: '1'}),
        u('text', ': 1')
      ])
    ]),
    'should not interrupt a paragraph'
  )

  t.deepEqual(
    basic.parse('[^1]\n\n[^1]: 1\nParagraph'),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should not be interrupted by a paragraph'
  )

  t.deepEqual(
    basic.parse('[^1]\n\n[^1]: 1\n\tParagraph'),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should indent with tabs'
  )
  t.deepEqual(
    basic.parse('[^1]\n\n[^1]: 1\n   \tParagraph'),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\nParagraph')])
      ])
    ]),
    'should indent with three spaces and 1 tab'
  )

  t.deepEqual(
    basic.parse('[^1]\n\n[^1]: 1\n    \tParagraph'),
    u('root', [
      u('paragraph', [u('footnoteReference', {identifier: '1', label: '1'})]),
      u('footnoteDefinition', {identifier: '1', label: '1'}, [
        u('paragraph', [u('text', '1\n\tParagraph')])
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
    '^[Text with _markup_.]',
    'should serialize a footnote'
  )

  t.equal(
    p.stringify(u('footnoteReference', {identifier: 'a', label: 'A'})),
    '[^A]',
    'should serialize a footnote reference'
  )

  t.equal(
    p.stringify(u('footnoteReference', {identifier: 'a'})),
    '[^a]',
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
    '[^A]: Text with _markup_.',
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
    '[^a]: Text with _markup_.',
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
    '[^a]: # Heading\n\n    > Block quote.\n\n        console.log(1)\n\n        console.log(2)',
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

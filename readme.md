# hparse-js

`hparse` is a [Microformats 2](http://microformats.org) DOM parser written in JavaScript.

It natively supports the new prefix-based parsing rules of µf2, and provides a mechanism to
important old, known µf1 vocabularies and parse them according to the rules of µf2.

## Supported Parser Features

Struckthrough items are not implemented yet.

* Microformats v2 parsing rules
* Microformats v2 singleton objects
* HTML5 `pubdate` as `dtpublished` mapping
* HTML5 `time` element
* Parsing of image `alt` text
* Date-Time Pattern
* Separated Date-Time Pattern
* <strike>HTML5 `data` element</strike>
* <strike>Include Pattern</strike>
* <strike>Value-Title Pattern</strike>
* <strike>Markdown output for raw text fields.</strike>

## Requirements

`hparse` requires a Browser-DOM compatible object `DOMNode`, `DOMElement`, etc, but
given that should function in both Browser and standalone environments.

`hparse` is also implemented with some regard for older versions of Internet Explorer,
and does not depend on any modern JavaScript.

`hparse` does not require any additional JavaScript framework.

## Usage

* `hparse.parse(node)`
* `hparse.addLegacyVocabulary`
* `results.getObjectsByFormat(format)`
* `results.getAll`
* `results.getStandaloneObjects`
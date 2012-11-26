/** h-parse
A microformats-2 DOM parser
Also supports mapping of µf1 vocabularies to µf2 parsing rules

MIT License
(c) Ben Ward, 2012
*/

var global = window || (module && module.exports);

(function (exports) {

  exports = exports || {};

  var version = 'v0.0.1';
  var regexen = {
    OBJECT: /\b(h\-[\w\-]+)\b/g,
    PROPERTY: /\b(p|u|dt|e)-([\w\-]+)\b/g,
    VALUE: /\bvalue\b/g,
    VALUETITLE: /\bvalue\-title\b/g,
    URL: /\b(?:(?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\((?:[^\s()<>]+|(\(?:[^\s()<>]+\)))*\))+(?:\((?:[^\s()<>]+|(?:\(?:[^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i,
    // URL regex by John Gruber:
    //   http://daringfireball.net/2010/07/improved_regex_for_matching_urls
    // via JavaScript port by Alan Moore on Stack Overflow:
    //   http://stackoverflow.com/a/4929179
  };
  regexen.ISODATE = /\d{4}\-?((\d{2}\-?(\d{2})?|\d{3})?)?/g,
  //                YEAR     MONTH    DATE OR DOY
  regexen.ISOTIME = /\d{2}\:?(\d{2}\:?(\d{2}\:?(\d{2})?)?)?/g,
  //                HOUR     MIN      SEC      MS
  regexen.ISOTZ = /([\+\-]\d{2}\:?\d{2}|Z)/g,
  //              TIMEZONE
  regexen.ISOFULL = new RegExp([
    regexen.ISODATE.source, '(T',
    regexen.ISOTIME.source, '(',
    regexen.ISOTZ.source, ')?)?'].join(''));
  // A regex that matches the pattern of an ISO 8610 date. Note that it
  // does not attempt to validate it as a real date.
  // Should accept anything from "2011" to "2011-10-10T01:34:00:00-0800"
  // Should also accept dates on tantek.com: e.g. 2010-245.

  var nodeTypes = { // Older versions of IE don't include the nodeType enum
    ELEMENT_NODE: 1,
    TEXT_NODE: 3
  };
  var indexes = {
    standalone: [],
    all: [],
    byID: {}
  };
  var settings = { // settings for the parser. TODO: Add mechanism to actually override these
    parseSingletonRootNodes: true, // parse <a class=h-card ...><img src=#photo alt="Ben Ward"></a> as full hcard.
    parsePubDateAttr: true, // parse time/@pubdate as .dt-published
    parseRelAttr: true, // parse @rel attributes as properties
    parseItemRefAttr: true, // use microdata's itemref as per the include-pattern
    parseV1Microformats: false, // parse v1 microformats as microformats-2 (TODO: requires extension with vocabulary mappings)
    parseWeakDates: false, // attempt to parse any date format. Probably a bad thing to include, but documenting idea for now
    forceValidUrls: true, // validate and filter URL properties against a valid regex
    forceValidDates: true // validate and filter DT properties against a valid regex
  };
  // Legacy microformat mapping vocabs:
  var vocabularies = {};
  var vocabularyRoots = {};

  // iterate on every node
  // find h-*
  // objects[] = allObjects[] += ParseFormat(node)
    // iterate every node.children
    // find p-, dt-, e-, i-, h- etc
    // if p- + h-
    // {}.p-whatever = allObjects[] += ParseFormat(childNode)
    // Put format into parent microformat, and into root index of all microformats.

  var propertyParsers = {
    p: function (el) {
      var extractedValue;
      if ('DATA' == el.nodeName && el.value) {
        return el.value;
      }
      if ((extractedValue = parseValueTitlePattern(el))) {
        return extractedValue;
      }
      if ('ABBR' == el.nodeName && el.title) {
        return el.title;
      }
      if ((extractedValue = parseValueTitlePattern(el))) {
        return extractedValue;
      }
      return flattenText(el);
    },
    u: function (el) {
      var url;
      if ('A' == el.nodeName && el.href) {
        url = el.href;
      }
      else if ('IMG' == el.nodeName) {
        url = el.src;
      }
      else if ('OBJECT' == el.nodeName && el.data) {
        url = el.data;
      }
      else {
        url = propertyParsers.p(el);
      }

      if(settings.validateUrlFormats && !regexen.URL.test(url)) {
        return undefined;
      }
      else {
        return url;
      }
    },
    dt: function (el) {
      var dt;
      if('TIME' == el.nodeName) {
        dt = el.getAttribute('datetime') || getTextContent(el);
      }
      else {
        dt = parseDateTimeValuePattern(el) || propertyParsers.p(el);
      }
      // TODO: clean up ISO format? Is there anything that can be done for this?

      if (settings.forceValidDates && !regexen.ISOFULL.test(dt)) {
        return undefined;
      }
      else {
        return dt;
      }
    },
    e: function (el) {
      return el.innerHTML;
    },
    rel: function (el) {
      return el.href;
    }
  };

  function getTextContent (el) {
    return el.textContent || el.innerText;
  }

  // Find all p-value children and return them
  function parseValuePattern (el, depth) {
    var values = [];
    var n = el.firstChild;
    depth = depth || 0;

    while (n) {
      if (n.nodeType !== nodeTypes.ELEMENT_NODE) continue;

      // If class="value"
      if (regexen.VALUE.test(n.className)) {
        values.push(propertyParsers.p(n));
      }
      // If this itself isn't another property, then continue down the
      // tree for values
      if (!regexen.PROPERTY.test(n.className)) {
        values.concat(parseValuePattern(n, depth+1));
      }
      n = n.nextSibling;
    }
    return values;
  }

  // Parse first-child-value-title
  function parseValueTitlePattern (el) {
    var vt = el.children.length && el.children[0];
    return vt && regexen.VALUETITLE.test(vt.className) && vt.title;
  }

  // Collects value class pattern descendents, and concatinates them to make an
  // ISO date string.
  function parseDateTimeValuePattern (el) {
    var values = parseValuePattern(el);
    var date;
    var time;
    var tz;
    var timestamp;
    var v;

    for (v in values) {
      if (regexen.ISODATE.test(v)) {
        date = date || v;
      }
      else if (regexen.ISOTIME.test(v)) {
        time = time || v;
      }
      else if (regexen.ISOTZ.test(v)) {
        tz = tz || v;
      }
    }

    if (date) {
      timestamp = date;
      if (time) {
        timestamp += "T" + time;
        if (tz) {
          timestamp += tz;
        }
      }
    }
    return timestamp;
  }

  // Walk an element tree for properties
  // But, there's special behaviour to skip pieces of the tree if they are
  // themselves microformats.
  // el: Root element to start from
  // obj: the object to write properties to
  // standalone: is this a standalone microformat, or augmenting a property?
  function parseObjectTree (el, obj, standalone, depth) {

    standalone = standalone !== false;
    depth = depth || 0;

    var n = el;
    var className;
    var matchedProperties;
    var relValues;
    var values;
    var subobject;
    var types;
    var type;
    var property;
    var relCounter;

    while (n) {

      if (n.nodeType !== nodeTypes.ELEMENT_NODE) {
        n = n.nextSibling;
        continue;
      }

      className = n.className || "";
      relValues = n.rel || "";
      values = {}; // already parsed values (by type) (saves doing p- twice for two properties)
      subobject = undefined;

      if (settings.parseV1Microformats ) {
        className = mapLegacyProperties(className, obj && obj.types);
      }

      matchedProperties = regexen.PROPERTY.test(className);

      // If a new microformat, parse it as an opaque blob:
      if ((types = className.match(regexen.OBJECT))) {
        subobject = parseObjectTree(n.firstChild, createObject(types), !matchedProperties, depth + 1);

        // IF: No explicit properties declared, imply format 'name' from content.
        if ({} == subobject.properties && settings.parseSingletonRootNodes) {
          // Infer the name:
          assignValue(subobject, 'name', propertyParsers.p(n));
          if (n.nodeType == 'A') {
            assignValue(subobject, 'url', propertyParsers.u(n));
          }
          // Single image/obj child parses as 'photo'
          if (n.children.length === 1 &&
              ~['IMG', 'OBJECT'].indexOf(children[0].nodeName)) {
            assignValue(subobject, 'photo', propertyParsers.u(n));
          }
        }
      }

      // Continue: Property assignments
      regexen.PROPERTY.lastIndex = 0; // reset regex mach position
      while (className && (match = regexen.PROPERTY.exec(className))) {
        type = match[1];
        property = match[2];

        // If we haven't already extracted a value for this type:
        if (!values[type]) {
          // All properties themselves need to be arrays.
          values[type] = propertyParsers[type] && propertyParsers[type].call(this, n);
        }

        if (values[type]) {
          if ('p' == type) {
            // For any p- objects, extract text value (from p handler) AND append the mfo
            assignValue(obj, property, values[type], subobject);
          }
          else {
            assignValue(obj, property, values[type]);
          }
        }
      }

      // Continue: Parse rel values as properties
      if (settings.parseRelAttr) {
        relValues = relValues.split(" ");
        for (relCounter = 0; (rel = relValues[relCounter]); relCounter++) {

          // TODO: IMPLEMENTATION: Will class properties override rel properties? Combine?
          if (obj.properties[rel]) {
            continue;
          }
          else {
            values['rel'] = values['rel'] || propertyParsers['rel'].call(this, n);
            assignValue(obj, rel, values['rel']);
          }
        }
      }

      // Parse pubdate as dt-published, if not already parsed
      if (settings.parsePubDateAttr && 'TIME' == n.nodeName &&
          n.getAttribute('pubdate') && !obj.properties['published']) {
        assignValue(obj, 'published', propertyParsers['dt'].call(this, n));
      }

      // unless we parsed an opaque microformat as a property, continue parsing down the tree:
      // TODO: This is wrong. We're parsing properties of µf's we already parsed above.
      //       Probably need reorder/better logic.
      // TODO FIX: Just look to see if there's a subobject to avoid double-parsing.
      if (!subobject && n.firstChild) {
        parseObjectTree(n.firstChild, obj, standalone, depth + 1);
      }

      // don't crawl siblings of the initial root element
      n = depth && n.nextSibling;
    }

    // index all objects
    indexes.all.push(obj);

    // index standalone objects
    if (standalone) {
      indexes.standalone.push(obj);
    }

    // index object by ID (used by itemref and include-pattern)
    if (el.id) {
      indexes.byID[el.id] = obj;
    }

    return obj;
  }

  function createObject (types) {
    return {
      type: types,
      properties: {}
    };
  }

  // Add a new value to an object property. Handle multiple values for the same
  // property name (e.g. multiple URLs), and handle assigning literal values
  function assignValue (o, property, literal, struct) {
    if (struct) {
      struct.value = literal;
    }

    o.properties[property] = o.properties[property] || [];
    o.properties[property].push(struct || literal);
  }

  // Get flattened text value of a node, include ALT-text fallbacks.
  function flattenText (el) {
    var n = el && el.firstChild;
    var str = "";
    while (n) {
      if (n.nodeType == nodeTypes.TEXT_NODE) {
        str += n.nodeValue;
      }
      else if (n.nodeType == nodeTypes.ELEMENT_NODE) {
        if ('IMG' == n.nodeName) {
          str += " " + n.alt + " ";
        }
        else {
          str += flattenText(n);
        }
      }
      n = n.nextSibling;
    }
    return str.replace(/ +/, ' ');
  }

  // Take legacy classNames and append v2 equivalents for a given format.
  function mapLegacyProperties (className, type) {
    var key;
    var classes = className.split(' ');
    var mapping = (type && vocabularies[type]) || vocabularyRoots;

    for (key in mapping) {
      if (~classes.indexOf(key)) {
        classes.push(mapping[key]);
      }
    }
  }

  // Create a mapping of legacy root format classnames to v2 names:
  // Allows for mapping both 'hcard' and 'vcard' to 'h-card'


  // TODO: Change this. Needs to build regexen. One from all known formats.
  // One-each for every known property. Then just map it with a generic func.
  function regenerateVocabMap () {
    var i;
    var key;
    var rootName;
    vocabularyRoots = {};

    for (key in vocabularies) {
      if (!vocabularies[key].root || !vocabularies[key].root.length) break;
      for (i = 0; (rootName = vocabularies[key].root[i]); i++) {
        vocabularyRoots[rootName] = key;
      }
    }
    return vocabularyRoots;
  }

  function Parser (rootElement) {

  }

  Parser.prototype.parse = function () {
    var results;
    return new Results();
  };

  Parser.defineLegacyVocabulary = function (mapTo, format) {
    vocabularies[mapTo] = format;
    regenerateVocabMap();
  };

  function Results (all, standalone, byId) {

    this.getAllObjects = function () {
      return all;
    };

    this.getStandaloneObjects = function () {
      return standalone;
    };

    this.getObjectsByMicroformat = function (format, includeSubProperties) {
      return (includeSubProperties ? all : standalone).filter(function (i) {
        return i && i.type && ~i.type.indexOf(format);
      });
    };
  }

  exports = {
    MicroformatsParser: Parser,
    parse: function (root) {
      return new Parser(root).parse().getStandaloneObjects();
    }
  };

})(global.hparse = {});
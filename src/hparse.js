/** h-parse
A microformats-2 DOM parser
Also supports mapping of µf1 vocabularies to µf2 parsing rules

MIT License
(c) Ben Ward, 2012
*/

var exports = exports || window.hparse;

(function (exports) {

  exports = exports || {};

  var version = 'v0.0.1';
  var regexen = {
    OBJECT: /\b(h\-[\w\-]+)\b/g,
    PROPERTY: /\b(p|u|dt|e)-([\w\-]+)\b/g,
    VALUE: /\bvalue\b/,
    LEGACY: /\b(vcard|vevent|vcalendar|hreview|hentry|hfeed|hrecipe)\b/g,
    URL: /\b(?:(?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\((?:[^\s()<>]+|(\(?:[^\s()<>]+\)))*\))+(?:\((?:[^\s()<>]+|(?:\(?:[^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i,
    // URL regex by John Gruber: http://daringfireball.net/2010/07/improved_regex_for_matching_urls
    // via JavaScript port by Alan Moore on Stack Overflow: http://stackoverflow.com/questions/4928345/help-making-a-universal-regex-javascript-compatible/4929179#4929179
    ISODATE: /\d{4}\-?((\d{2}\-?(\d{2})?|\d{3})?)?/,
    //        YEAR     MONTH    DATE  OR DOY
    ISOTIME: /\d{2}\:?(\d{2}\:?(\d{2}\:?(\d{2})?)?)?/,
    //        HOUR     MIN      SEC      MS
    ISOTZ: /([\+\-]\d{2}\:?\d{2}|Z)/,
    //        TIMEZONE
    ISOFULL: regexSupplant('#{ISODATE}(T#{ISOTIME}(#{ISOTZ})?)?')
    // A regex that matches the pattern of an ISO 8610 date. Note that it
    // does not attempt to validate it as a real date.
    // Should accept anything from "2011" to "2011-10-10T01:34:00:00-0800"
    // Should also accept dates on tantek.com: e.g. 2010-245.
  };
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
      if ('ABBR' == el.nodeName && el.title) {
        return el.title;
      }
      return flattenText(el);
    },
    u: function (el) {
      var url;
      if ('A' == el.nodeName && el.href) {
        url = a.href;
      }
      else if ('IMG' == el.nodeName) {
        url = img.src;
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

      if(settings.forceValidDates && !regexen.ISOFULL.test(dt)) {
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

  // Util to combine regular expression fragments.
  // Yanked from twitter-text.js:
  // <https://github.com/twitter/twitter-text-js/blob/master/twitter-text.js#L25>
  // Licensed under the Apache License, Version 2.0
  // TODO: Only actually using this once so far, with no need for flags, so possible
  function regexSupplant (regex, flags) {
     flags = flags || "";

     if (typeof regex !== "string") {
       if (regex.global && flags.indexOf("g") < 0) {
         flags += "g";
       }
       if (regex.ignoreCase && flags.indexOf("i") < 0) {
         flags += "i";
       }
       if (regex.multiline && flags.indexOf("m") < 0) {
         flags += "m";
       }

       regex = regex.source;
     }

     return new RegExp(regex.replace(/#\{(\w+)\}/g, function(match, name) {
       var newRegex = regexen[name] || "";
       if (typeof newRegex !== "string") {
         newRegex = newRegex.source;
       }
       return newRegex;
     }), flags);
   }

  function getTextContent (el) {
    return el.textContent || el.innerText;
  }

  // Find all p-value children and return them
  function parseValuePattern (el, depth) {
    var values = [];
    var n = el;

    while(n) {
      if(/\bp-value\b/.test(n.className)) {
        values.push(propertyParsers.p(n));
      }
      // If this itself isn't another object property, then continue down the
      // tree for values
      if(!regexen.PROPERTY.test(n.className)) {
        values.concat(parseDateTimeValuePattern(n.firstChild, depth+1));
      }
      n = (depth) ? n.nextSibling : undefined;
    }
    return values;
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

    standalone = standalone || true;
    depth = depth || 0;

    var n = el;
    var className;
    var matchedProperties;
    var relValues;
    var values;
    var subobject;
    var mfo;
    var types;
    var type;
    var property;
    var i;

    while (n) {
      if (n.nodeType == nodeTypes.ELEMENT_NODE) {
        matchedProperties = regexen.PROPERTY.test(n.className);
        className = n.classname || "";
        relValues = n.rel || "";
        values = {}; // already parsed values (by type) (saves doing p- twice for two properties)
        subobject = undefined;
        mfo = false; // set true if we parse another microformat as a property

        if (settings.parseV1Microformats) {
          className = mapLegacyProperties(className, obj && obj.types);
        }

        // If a new microformat, parse it as an opaque blob:
        if (regexen.OBJECT.test(n.className)) {
          types = n.className.match(regexen.OBJECT);
          subobject = parseObjectTree(n, createObject(types), !matchedProperties);

          // IF: No explicit properties declared, imply format 'name' from content.
          if ({} == subobject.properties && settings.parseSingletonRootNodes) {
            // Infer the name:
            assignValue(subobject, 'name', propertyParsers.p(n));
            if (n.nodeType == 'A') {
              assignValue(subobject, 'url', propertyParsers.u(n));
            }
            // Single image/obj child parses as 'photo'
            if (n.children.length === 1 && ~['IMG', 'OBJECT'].indexOf(children[0].nodeName)) {
              assignValue(subobject, 'photo', propertyParsers.u(n));
            }
          }
        }

        // Continue: Property assignments
        while (n.className && (match = regexen.PROPERTY.exec(n.className))) {

          type = match[0];
          property = match[1];

          // If we haven't already extracted a value for this type:
          if (!values[type]) {
            // All properties themselves need to be arrays.
            values[type] = propertyParsers[type] && propertyParsers[type].call(n);
          }

          if (values[type]) {
            if ('p' == type) {
              // For any p- objects, extract text value (from p handler) AND append the mfo
              mfo = mfo || !!subobject;
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
          for (i = 0; (rel = relValues[i]); i++) {

            // TODO: IMPLEMENTATION: Will class properties override rel properties? Combine?
            if (obj.properties[rel]) {
              continue;
            }
            else {
              values['rel'] = values['rel'] || propertyParsers['rel'].call(n);
              assignValue(obj, rel, values['rel']);
            }
          }
        }

        // Parse pubdate as dt-published, if not already parsed
        if (settings.parsePubDateAttr && 'TIME' == n.nodeName &&
            n.getAttribute('pubdate') && !obj.properties['published']) {
          assignValue(obj, 'published', propertyParsers['dt'].call(n));
        }

        // unless we parsed an opaque microformat as a property, continue parsing down the tree:
        if (!mfo && n.firstChild) {
          parseObjectTree(n.firstChild, obj, standalone, depth + 1);
        }
      }
      // don't crawl siblings of the initial root element
      n = (depth) ? n.nextSibling : undefined;
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
      properties: {},
      value: undefined
    };
  }

  // Add a new value to an object property. Handle multiple values for the same
  // property name (e.g. multiple URLs), and handle assigning literal values
  function assignValue (object, property, literal, struct) {
    var val = { value: literal };

    if (struct) {
      val.type = struct.type;
      val.properties = struct.properties;
    }

    object.properties[property] = object.properties[property] || [];
    object.properties[property].push(val);
  }

  function parseDateTime () {

  }

  function valueClassPattern () {

  }

  // Get flattened text value of a node, include IMG fallback.
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
  function regenerateVocabMap () {
    var i;
    var rootName;
    vocabularyRoots = {};

    for (var key in vocabularies) {
      if (!vocabularies[key].root || !vocabularies[key].root.length) break;
      for (i = 0; (rootName = vocabularies[key].root[i]); i++) {
        vocabularyRoots[rootName] = key;
      }
    }
    return vocabularyRoots;
  }

  exports.addLegacyVocabulary = function (mapTo, format) {
    vocabularies[mapTo] = format;
    regenerateVocabMap();
  };


  exports.parse = function (root) {

  };

  exports.getObjectsByFormat = function (format, includeSubProperties) {

  };

})(exports || window.hparse);
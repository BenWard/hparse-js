/** h-parse */
/* A microformats2 DOM parser, with the ability to use microformats-shiv as a
   module to support existing microformats.
   
   MIT License
   
   (c) Ben Ward, 2011
*/

!function(exports) {
  
  var version = 'v0.0.1'
    , regexen = {
        OBJECT: /\b(h\-[\w\-]+)\b/g
      , PROPERTY: /\b(p|u|dt|e)-([\w\-]+)\b/g
      , LEGACY: /\b(vcard|vevent|vcalendar|hreview|hentry|hfeed|hrecipe)\b/g
      }
    , nodeTypes = {
        ELEMENT_NODE: 1
    }
    , indexes = {
        standalone: []
      , all: []
      , byID: {} 
    }
  
  // iterate on every node
  // find h-*
  // objects[] = allObjects[] += ParseFormat(node)
    // iterate every node.children
    // find p-, dt-, e-, i-, h- etc
    // if p- + h-
    // {}.p-whatever = allObjects[] += ParseFormat(childNode)
    // Put format into parent microformat, and into root index of all microformats.

  var propertyParsers = {
      p: function(el) {
        // Value Title
        // if ABBR -> title
        // if IMG -> alt
        // textContent || innerText
      }
    , u: function(el) {
        // if <a> -> href
        // if <img> -> src
        // if <object> -> data
        // -> p()
        // Validate as URI?
      }
    , dt: function(el) {
        // <date>
        // value class + concatenation
        // -> p()
        // clean up ISO format
      }
    , e: function(el) {
        return el.innerHTML
      }
    , rel: function(el) {
        return el.href
      }
  }

  function parseDocument() {
    parseObjectTree(document.documentElement);
  }

  // Walk an element tree for properties
  // el: Root element to start from
  // obj: the object to write properties to
  // standalone: is this a standalone microformat, or augmenting a property?
  function parseObjectTree(el, obj, standalone, depth) {
    standalone = standalone || true
    depth = depth || 0

    // Look for itemref/include pattern
    if(itemref) {
      var target = document.getElementById(itemref)
        , ref = parseObjectTree(target)
    }

    var n = el
    while(n) {

      if (n.nodeType == nodeTypes.ELEMENT_NODE) {

        var matchedProperties = regexen.PROPERTY.test(n.className)
          , relValues = n.rel || ""
          , values = {} // already parsed values (by type) (saves doing p- twice for two properties)
          , subobject = undefined
          , mfo = false // set true if we parse another microformat as a property

        // If a new microformat, parse it as an opaque blob:
        if (regexen.OBJECT.test(n.className)) {
          var types = n.className.match(regexen.OBJECT)
          subobject = parseObjectTree(n, createObject(types), !matchedProperties)

          // IF: No explicit properties declared, imply format 'name' from content.
          if({} == subobject.properties) {
            assignValue(subobject, 'name', propertyParsers.p(n))
            // TBI ... and 'url' from A href
            // TBI ... and 'photo' from IMG src (as element itself or only child)
          }
        }

        // Continue: Property assignments
        while (match = regexen.PROPERTY.exec(n.className)) {

          var type = match[0]
            , property = match[0]

          // If we haven't already extracted a value for this type:
          if (!values[type]) {
            // All properties themselves need to be arrays.
            values[type] = propertyParsers[type].call(n)
          }

          if(values[type]) {
            if('p' == type) {
              // For any p- objects, extract text value (from p handler) AND append the mfo
              mfo = mfo || !!subobject
              assignValue(obj, property, values[type], subobject)
            }
            else {
              assignValue(obj, property, values[type])
            }
          }
        }
        
        // Continue: Parse rel values as properties
        relValues = relValues.split(" ")
        for(var i=0; rel = relValues[i]; i++) {
          
          // TODO: IMPLEMENTATION: If class properties will override rel properties:
          if(obj.properties[rel]) {
            continue;
          }
          else {
            values['rel'] = values['rel'] || propertyParsers['rel'].call(n)
            assignValue(obj, rel, values['rel'])
          }
        }

        // unless we parsed an opaque microformat as a property, continue parsing down the tree:
        if (!mfo && n.firstChild) {
          parseObjectTree(n.firstChild, obj, standalone, depth+1)
        }
      }
      // don't crawl siblings of the initial root element
      n = (depth) ? n.nextSibling : false
    }
    
    // index all objects
    indexes.all.push(obj)
    
    // index standalone objects
    if(standalone) {
      indexes.standalone.push(obj)
    }
    
    // index object by ID (used by itemref and include-pattern)
    if(el.id) {
      indexes.byID[el.id] = obj
    }

    return obj
  }


  function createObject(types) {
    return {
        type: types
      , properties: {}
      , value: undefined
    }
  }

  // Add a new value to an object property. Handle multiple values for the same
  // property name (e.g. multiple URLs), and handle assigning literal values
  function assignValue(object, property, literal, struct) {
    var val = {value:literal}
    if (struct) {
      val.type = struct.type
      val.properties = struct.properties
    }
    object.properties[property] = object.properties[property] || []
    object.properties[property].push(val)
  }
  
  function parseDateTime() {
    
  }
  
  function valueClassPattern() {
    
  }
  
  exports.parse = function(root) {
    
  } 
  
  exports.getObjectsByFormat = function(format, includeSubProperties) {
    
  }

}(hparse)
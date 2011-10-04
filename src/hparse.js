/** h-parse */
/* A microformats2 parser, with the ability to use microformats-shiv as a module
   to support existing microformats.
   
   MIT License
   
   (c) Ben Ward, 2011
*/

!function(exports) {
  
  var version = 'v0.0.1'
    , regexen = {
        OBJECT: /(^| )h-(a-zA-Z]-)+( |$)/
      , PROPERTY: /(^| )(p|u||dt|e)-([a-z][A-Z]-)+( |$)/
      , LEGACY: /(^| )(vcard|vevent|vcalendar|hreview|hentry|hfeed|hrecipe)( |$)/
      }
    , nodeTypes = {
        ELEMENT_NODE: 1
    }
    , standaloneObjects
    , allObjects
  
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
        // value class + concatination
        // -> p()
        // clean up ISO format
    }
    , e: function(el) {
        return el.innerHTML
      }
  }

  function walkDom(element, func, maxdepth, depth) {
    depth = depth || 0
    var n = element.firstChild
    
    while(n) {
      func(n)

      if(!maxdepth || depth < maxdepth) {
        walkDom(n, func, maxdepth, depth+1)
      }
      n = n.nextSibling()
    }
    
  }


  function parseDocument() {
    parseObjectTree(document.documentElement, {});
  }

  // Walk the an element tree for properties
  // el: Root element to start from
  // obj: the object to write properties to
  // standalone: is this a standalone microformat, or augmenting a property?
  function parseObjectTree(el, obj, standalone) {
    isProperty = isProperty || false
    var n = el.firstChild

    // TODO: Break out DOM walker (reuse by property parsing/value pattern?)
    while (n) {
      if (n.nodeType == nodeTypes.ELEMENT_NODE) {

        var matchedClasses = n.className.match(regexen.PROPERTY)
          , values = {} // parsed values (by type)
          , subobject = undefined

        // IF Microformat:
        if (regexen.OBJECT.test(n.className) {
          // TODO: Get all object types
          subobject = parseObjectTree(n, { type: [], properties: {} }, !!matchedClasses.length)

          // IF: No explicit properties declared, imply format 'name' from content.
          if({} == subobject.properties) {
            subobject.properties.name = [propertyParsers.p(n)]
          }
        }

        // Continue: Property assignments
        for (var i=0; match = matchedClasses[i]; i++) {

          var type = match[1]
            , property = match[2]

          // So create new object, set those types, run recursive parse, store object
          // Then, for any p- objects that follow, extract text value (from p handler) AND append the mfo (and set the mfo bit.)
          // If no mfo bit set, then append format object to standalone[]

          // If we haven't already extracted a value for this type:
          if (!values[type]) {
            // All properties themselves need to be arrays.
            values[type] = propertyParsers[type].call(n)
          }

          if(values[type]) {
            assignValue(obj, property, values[type], subobject)
          }
        }
        // unless opaque microformat-object, continue parsing
        if (!subobject) {
          parseTree(n)
        }
      }
      n = n.nextSibling()
    }
    // index this object
    allObjects.push(obj)
    
    // index standalone objects
    if(standalone) {
      standaloneObjects.push(obj)
    }

    return obj
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